import { Queue, JobsOptions } from 'bullmq';
import { getRedisOptions } from './redis';
import { prisma } from '../db/prisma';

export const EMAIL_QUEUE_NAME = 'email-send-queue';

export interface EmailJobPayload {
  emailJobId: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  hourlyLimit?: number;
  delayBetweenEmails?: number;
}

let emailQueueInstance: Queue<EmailJobPayload> | null = null;

export function getEmailQueue(): Queue<EmailJobPayload> {
  if (!emailQueueInstance) {
    emailQueueInstance = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400 * 7, // Keep completed jobs for 7 days
          count: 5000,
        },
        removeOnFail: {
          age: 86400 * 14,
        },
      },
    });
  }
  return emailQueueInstance;
}

/**
 * Schedules an email job using BullMQ delayed jobs.
 * Enforces idempotency via unique jobId matching emailJobId.
 */
export async function scheduleEmailJob(
  payload: EmailJobPayload,
  delayMs: number
): Promise<{ bullJobId: string }> {
  const queue = getEmailQueue();
  const clampedDelay = Math.max(0, delayMs);

  const options: JobsOptions = {
    delay: clampedDelay,
    jobId: payload.emailJobId, // Guarantees idempotency (cannot add duplicate job while in queue)
  };

  const job = await queue.add('send-email', payload, options);
  console.log(`[Queue] Scheduled email job ${payload.emailJobId} with delay ${clampedDelay}ms (Job ID: ${job.id})`);

  return { bullJobId: String(job.id) };
}

/**
 * Startup reconciliation to guarantee persistence across server/Redis restarts.
 * Ensures all emails marked SCHEDULED in DB with future send times are present in BullMQ.
 */
export async function reconcileScheduledJobs(): Promise<void> {
  try {
    const queue = getEmailQueue();
    const scheduledEmails = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED'] },
      },
    });

    if (scheduledEmails.length === 0) {
      console.log('🔄 [Reconciliation] No pending scheduled emails in database to reconcile.');
      return;
    }

    console.log(`🔄 [Reconciliation] Checking ${scheduledEmails.length} pending scheduled emails...`);
    let reEnqueuedCount = 0;

    for (const email of scheduledEmails) {
      const existingJob = await queue.getJob(email.id);

      if (!existingJob) {
        // Job was not found in Redis (e.g. after Redis restart or flush). Re-enqueue it!
        const now = Date.now();
        const targetTime = new Date(email.scheduledAt).getTime();
        const remainingDelay = Math.max(0, targetTime - now);

        await queue.add(
          'send-email',
          {
            emailJobId: email.id,
            userId: email.userId,
            senderEmail: email.senderEmail,
            recipientEmail: email.recipientEmail,
            subject: email.subject,
            body: email.body,
            scheduledAt: email.scheduledAt.toISOString(),
            hourlyLimit: email.hourlyLimit,
            delayBetweenEmails: email.delayBetweenEmails,
          },
          {
            delay: remainingDelay,
            jobId: email.id,
          }
        );

        reEnqueuedCount++;
        console.log(`🔄 [Reconciliation] Re-enqueued missing job ${email.id} with delay ${remainingDelay}ms`);
      }
    }

    console.log(`✅ [Reconciliation] Completed. Re-enqueued ${reEnqueuedCount} jobs.`);
  } catch (error) {
    console.warn('⚠️ [Reconciliation] Failed to reconcile jobs on startup:', (error as Error).message);
  }
}
