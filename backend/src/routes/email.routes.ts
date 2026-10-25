import { Router, Response } from 'express';
import { prisma } from '../db/prisma';
import { scheduleEmailJob } from '../queue/email.queue';
import { elasticsearchService } from '../services/elasticsearch.service';
import { etherealService } from '../services/ethereal.service';
import { rateLimiterService } from '../services/rateLimiter.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { config } from '../config';

const router = Router();

/**
 * Schedule one or multiple emails (e.g. from lead CSV upload)
 */
router.post('/schedule', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'demo-user-1';
    const {
      recipients,
      senderEmail,
      subject,
      body,
      startTime,
      delayBetweenEmails = config.scheduler.minEmailDelayMs,
      hourlyLimit = config.scheduler.maxEmailsPerHourPerSender,
    } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ error: 'Recipients array is required and must not be empty' });
      return;
    }

    if (!subject || !body) {
      res.status(400).json({ error: 'Subject and Body are required' });
      return;
    }

    const sender = senderEmail || 'sales@reachinbox.test';
    const baseStartTime = startTime ? new Date(startTime).getTime() : Date.now();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const scheduledResults: any[] = [];
    const interEmailDelay = Math.max(0, parseInt(String(delayBetweenEmails), 10));

    console.log(`\n📅 [Scheduler] Scheduling batch of ${recipients.length} emails for sender: ${sender}`);

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim();
      if (!recipient || !recipient.includes('@')) continue;

      // Each lead receives a spaced scheduled time based on delayBetweenEmails
      const targetTimeMs = Math.max(Date.now(), baseStartTime + i * interEmailDelay);
      const scheduledDate = new Date(targetTimeMs);
      const delayMs = Math.max(0, targetTimeMs - Date.now());

      // 1. Create DB record
      const emailJob = await prisma.emailJob.create({
        data: {
          userId,
          senderEmail: sender,
          recipientEmail: recipient,
          subject,
          body,
          scheduledAt: scheduledDate,
          status: 'SCHEDULED',
          delayBetweenEmails: interEmailDelay,
          hourlyLimit: parseInt(String(hourlyLimit), 10),
          batchId,
        },
      });

      // 2. Schedule BullMQ delayed job (Idempotency guaranteed by jobId: emailJob.id)
      const { bullJobId } = await scheduleEmailJob(
        {
          emailJobId: emailJob.id,
          userId,
          senderEmail: sender,
          recipientEmail: recipient,
          subject,
          body,
          scheduledAt: scheduledDate.toISOString(),
          hourlyLimit: parseInt(String(hourlyLimit), 10),
          delayBetweenEmails: interEmailDelay,
        },
        delayMs
      );

      // 3. Update DB with BullMQ job ID
      const updated = await prisma.emailJob.update({
        where: { id: emailJob.id },
        data: { bullJobId },
      });

      // 4. Index scheduled email into Elasticsearch
      try {
        await elasticsearchService.indexEmail(updated);
      } catch (esErr) {
        console.warn('[Scheduler] ES indexing skipped/failed:', (esErr as Error).message);
      }

      scheduledResults.push(updated);
    }

    res.status(201).json({
      success: true,
      batchId,
      totalScheduled: scheduledResults.length,
      emails: scheduledResults,
    });
  } catch (error) {
    console.error('Error scheduling emails:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Get all scheduled (pending / processing / rescheduled) emails
 */
router.get('/scheduled', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 50, search = '' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    if (search && String(search).trim().length > 0) {
      // Use Elasticsearch service
      const searchResult = await elasticsearchService.searchEmails({
        userId,
        query: String(search),
        status: 'SCHEDULED',
        limit: Number(limit),
        offset: skip,
      });
      res.json(searchResult);
      return;
    }

    const where: any = {
      status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED_RESCHEDULED'] },
    };
    if (userId) where.userId = userId;

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        take: Number(limit),
        skip,
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.emailJob.count({ where }),
    ]);

    res.json({ emails, total });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Get all sent / delivered / failed emails
 */
router.get('/sent', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 50, search = '' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    if (search && String(search).trim().length > 0) {
      const searchResult = await elasticsearchService.searchEmails({
        userId,
        query: String(search),
        status: 'SENT',
        limit: Number(limit),
        offset: skip,
      });
      res.json(searchResult);
      return;
    }

    const where: any = {
      status: { in: ['SENT', 'FAILED'] },
    };
    if (userId) where.userId = userId;

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        take: Number(limit),
        skip,
        orderBy: { sentAt: 'desc' },
      }),
      prisma.emailJob.count({ where }),
    ]);

    res.json({ emails, total });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Search emails across scheduled and sent
 */
router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { q, status } = req.query;

    const results = await elasticsearchService.searchEmails({
      userId,
      query: String(q || ''),
      status: status ? String(status) : undefined,
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * List available sender accounts (multi-sender support)
 */
router.get('/senders', (_req: AuthRequest, res: Response): void => {
  const senders = etherealService.getAvailableSenders();
  res.json({ senders });
});

/**
 * Get rate limit status for a sender
 */
router.get('/ratelimit/:senderEmail', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sender = decodeURIComponent(req.params.senderEmail);
    const count = await rateLimiterService.getSenderCurrentCount(sender);
    const limit = config.scheduler.maxEmailsPerHourPerSender;
    res.json({
      sender,
      currentCount: count,
      limit,
      remaining: Math.max(0, limit - count),
      isRateLimited: count >= limit,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Reset rate limit for a sender (helpful for testing)
 */
router.post('/ratelimit/reset', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { senderEmail } = req.body;
    if (senderEmail) {
      await rateLimiterService.resetRateLimit(senderEmail);
    }
    res.json({ success: true, message: `Rate limit reset for ${senderEmail}` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Cancel a scheduled email
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const email = await prisma.emailJob.findUnique({ where: { id } });
    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    if (email.status === 'SENT') {
      res.status(400).json({ error: 'Cannot cancel an email that has already been sent' });
      return;
    }

    await prisma.emailJob.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, message: 'Email scheduled job cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
