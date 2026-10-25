import { Worker, Job } from 'bullmq';
import { getRedisOptions } from '../queue/redis';
import { EMAIL_QUEUE_NAME, EmailJobPayload, getEmailQueue } from '../queue/email.queue';
import { etherealService } from '../services/ethereal.service';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { rateLimiterService } from '../services/rateLimiter.service';
import { slackService } from '../services/slack.service';
import { elasticsearchService } from '../services/elasticsearch.service';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let emailWorkerInstance: Worker<EmailJobPayload> | null = null;

export function setupEmailWorker(): Worker<EmailJobPayload> {
  if (emailWorkerInstance) {
    return emailWorkerInstance;
  }

  const concurrency = config.scheduler.workerConcurrency;
  console.log(`🚀 Starting BullMQ Email Worker with concurrency = ${concurrency}`);

  emailWorkerInstance = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      const { emailJobId, userId, senderEmail, recipientEmail, subject, body } = job.data;
      console.log(`\n⏳ [Worker] Processing job ${job.id} for email ID: ${emailJobId} -> ${recipientEmail}`);

      // 1. Check current status in DB to ensure idempotency
      const existingEmail = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
      });

      if (!existingEmail) {
        console.warn(`[Worker] Email record ${emailJobId} not found in database. Skipping.`);
        return;
      }

      if (existingEmail.status === 'SENT') {
        console.log(`[Worker] Email ${emailJobId} has already been sent. Skipping to avoid duplicate.`);
        return;
      }

      // 2. Check Hourly Rate Limit (per sender)
      const hourlyLimit = job.data.hourlyLimit || existingEmail.hourlyLimit || config.scheduler.maxEmailsPerHourPerSender;
      const rateLimitCheck = await rateLimiterService.checkAndIncrement(senderEmail, hourlyLimit);

      if (!rateLimitCheck.allowed) {
        console.warn(
          `🚫 [RateLimit] Hourly limit of ${hourlyLimit} reached for sender ${senderEmail} (${rateLimitCheck.currentCount}/${hourlyLimit}).`
        );

        // Compute delay until next available hour window
        const delayUntilNextWindow = rateLimitCheck.nextWindowTimestamp - Date.now() + 1000;
        const nextScheduledDate = new Date(rateLimitCheck.nextWindowTimestamp + 1000);

        console.log(`⏰ [RateLimit] Rescheduling email ${emailJobId} to next window at ${nextScheduledDate.toISOString()} (in ${Math.round(delayUntilNextWindow / 1000)}s)`);

        // Update DB status to RATE_LIMITED_RESCHEDULED and update scheduledAt
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RATE_LIMITED_RESCHEDULED',
            scheduledAt: nextScheduledDate,
          },
        });

        // Trigger Slack Notification (Non-blocking, live call)
        try {
          await slackService.notifyRateLimitHit({
            userId,
            senderEmail,
            limit: hourlyLimit,
            currentCount: rateLimitCheck.currentCount,
            nextWindowTime: nextScheduledDate.toLocaleTimeString(),
          });
        } catch (slackErr) {
          console.warn('[Worker] Slack notification failed:', (slackErr as Error).message);
        }

        // Add back to BullMQ delayed queue for the next window
        const queue = getEmailQueue();
        await queue.add(
          'send-email',
          {
            ...job.data,
            scheduledAt: nextScheduledDate.toISOString(),
          },
          {
            delay: Math.max(1000, delayUntilNextWindow),
            jobId: `${emailJobId}_rescheduled_${Date.now()}`,
          }
        );

        // Complete current job without failing
        return {
          rescheduled: true,
          nextWindow: nextScheduledDate.toISOString(),
        };
      }

      // 3. Mark as PROCESSING in DB
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'PROCESSING' },
      });

      // 4. Delay between each email send (to mimic provider throttling)
      const interEmailDelay = Math.max(
        config.scheduler.minEmailDelayMs,
        job.data.delayBetweenEmails || existingEmail.delayBetweenEmails || 0
      );
      if (interEmailDelay > 0) {
        console.log(`⏱️ [Worker] Applying throttling delay of ${interEmailDelay}ms before sending to ${recipientEmail}`);
        await sleep(interEmailDelay);
      }

      // 5. Send Email via Ethereal SMTP
      try {
        const sendResult = await etherealService.sendEmail({
          from: senderEmail,
          to: recipientEmail,
          subject,
          body,
        });

        // 6. Update DB with SENT status and Ethereal preview URL
        const updatedEmail = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealMessageId: sendResult.messageId,
            etherealPreviewUrl: sendResult.previewUrl ? String(sendResult.previewUrl) : null,
          },
        });

        console.log(`🎉 [Worker] Email ${emailJobId} sent successfully to ${recipientEmail}!`);
        if (sendResult.previewUrl) {
          console.log(`🔗 [Worker] Preview in Ethereal: ${sendResult.previewUrl}`);
        }

        // 7. Index updated email in Elasticsearch
        try {
          await elasticsearchService.indexEmail(updatedEmail);
        } catch (esErr) {
          console.warn('[Worker] Elasticsearch indexing skipped/failed:', (esErr as Error).message);
        }

        return {
          success: true,
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        };
      } catch (sendError) {
        console.error(`❌ [Worker] Failed to send email ${emailJobId}:`, (sendError as Error).message);

        // Update DB as FAILED
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            lastError: (sendError as Error).message,
            retryCount: { increment: 1 },
          },
        });

        throw sendError; // Triggers BullMQ retry backoff
      }
    },
    {
      connection: getRedisOptions(),
      concurrency,
    }
  );

  emailWorkerInstance.on('completed', (job) => {
    console.log(`✔️ [Worker] Job ${job.id} completed successfully`);
  });

  emailWorkerInstance.on('failed', (job, err) => {
    console.error(`💥 [Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  return emailWorkerInstance;
}
