import { Router, Response } from 'express';
import { slackService } from '../services/slack.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { config } from '../config';

const router = Router();

/**
 * Get current Slack integration status
 */
router.get('/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'demo-user-1';
    const status = await slackService.getStatus(userId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Connect Slack via Incoming Webhook URL
 */
router.post('/webhook', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'demo-user-1';
    const { webhookUrl, channel } = req.body;

    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      res.status(400).json({ error: 'Valid Slack incoming webhook URL is required' });
      return;
    }

    const integration = await slackService.connectWebhook(userId, webhookUrl, channel);
    res.json({
      success: true,
      message: 'Slack connected successfully via Webhook!',
      integration,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Send test alert to Slack
 */
router.post('/test', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'demo-user-1';
    const result = await slackService.sendTestNotification(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Disconnect Slack integration
 */
router.post('/disconnect', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'demo-user-1';
    await slackService.disconnect(userId);
    res.json({ success: true, message: 'Slack disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Slack OAuth start redirect
 */
router.get('/oauth/start', (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id || 'demo-user-1';
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=incoming-webhook,chat:write&redirect_uri=${encodeURIComponent(
    config.slack.redirectUri
  )}&state=${state}`;

  res.redirect(slackAuthUrl);
});

/**
 * Slack OAuth callback
 */
router.get('/oauth/callback', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(`${config.clientUrl}?slack_error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code) {
      res.redirect(`${config.clientUrl}?slack_error=missing_code`);
      return;
    }

    let userId = req.user?.id || 'demo-user-1';
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
        if (parsed.userId) userId = parsed.userId;
      } catch {}
    }

    await slackService.handleOAuthCallback(String(code), userId);
    res.redirect(`${config.clientUrl}?slack_connected=true`);
  } catch (err) {
    res.redirect(`${config.clientUrl}?slack_error=${encodeURIComponent((err as Error).message)}`);
  }
});

export default router;
