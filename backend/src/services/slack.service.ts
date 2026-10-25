import axios from 'axios';
import { prisma } from '../db/prisma';
import { config } from '../config';

export interface RateLimitNotificationParams {
  userId?: string;
  senderEmail: string;
  limit: number;
  currentCount: number;
  nextWindowTime: string;
}

export class SlackService {
  /**
   * Sends a live message to the user's connected Slack when their sender hits an hourly rate limit.
   * If Slack is not connected, fails silently without throwing error.
   */
  public async notifyRateLimitHit(params: RateLimitNotificationParams): Promise<boolean> {
    const { userId, senderEmail, limit, currentCount, nextWindowTime } = params;

    try {
      // Find active Slack integration for this user (or global integration if no specific user)
      let integration = null;

      if (userId) {
        integration = await prisma.slackIntegration.findFirst({
          where: { userId, isActive: true },
        });
      }

      if (!integration) {
        // Fallback to any active integration in the system
        integration = await prisma.slackIntegration.findFirst({
          where: { isActive: true },
        });
      }

      if (!integration) {
        console.log('[Slack] No connected Slack integration found. Skipping notification.');
        return false;
      }

      const payload = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ Rate Limit Alert: ReachInbox Email Scheduler',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Sender *${senderEmail}* has reached the configured hourly limit of *${limit} emails/hour*.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Current Sent:* ${currentCount}/${limit}`,
              },
              {
                type: 'mrkdwn',
                text: `*Next Window Starts:* ${nextWindowTime}`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '🛡️ *Idempotency Guarantee:* Remaining jobs have been safely delayed and queued for the next window. Zero emails dropped.',
              },
            ],
          },
        ],
      };

      if (integration.webhookUrl) {
        console.log(`[Slack] Sending live notification via Webhook: ${integration.webhookUrl}`);
        const response = await axios.post(integration.webhookUrl, payload, { timeout: 8000 });
        console.log('[Slack] ✅ Notification delivered to Slack successfully! Status:', response.status);
        return true;
      }

      if (integration.accessToken && integration.channelId) {
        console.log(`[Slack] Sending notification via Slack Web API to channel: ${integration.channelId}`);
        const response = await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: integration.channelId,
            ...payload,
          },
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          }
        );
        console.log('[Slack] ✅ Notification delivered via API:', response.data);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Slack] ❌ Failed to send Slack notification:', (error as Error).message);
      return false;
    }
  }

  /**
   * Sends a test verification message to Slack.
   */
  public async sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    const integration = await prisma.slackIntegration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration || (!integration.webhookUrl && !integration.accessToken)) {
      return { success: false, message: 'No active Slack connection found for this account.' };
    }

    const testPayload = {
      text: '🎉 ReachInbox Scheduler is successfully connected to your Slack workspace! Rate-limit alerts will appear here in real time.',
    };

    try {
      if (integration.webhookUrl) {
        await axios.post(integration.webhookUrl, testPayload, { timeout: 8000 });
      } else if (integration.accessToken && integration.channelId) {
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          { channel: integration.channelId, text: testPayload.text },
          { headers: { Authorization: `Bearer ${integration.accessToken}` } }
        );
      }
      return { success: true, message: 'Test message sent to Slack successfully!' };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Connects Slack via direct Incoming Webhook URL.
   */
  public async connectWebhook(userId: string, webhookUrl: string, channelName?: string) {
    return prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        webhookUrl,
        channel: channelName || '#general',
        isActive: true,
      },
      create: {
        userId,
        webhookUrl,
        channel: channelName || '#general',
        isActive: true,
      },
    });
  }

  /**
   * Exchanges an OAuth authorization code from Slack for an access token.
   */
  public async handleOAuthCallback(code: string, userId: string) {
    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        code,
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        redirect_uri: config.slack.redirectUri,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const data = response.data;
    if (!data.ok) {
      throw new Error(data.error || 'Slack OAuth exchange failed');
    }

    return prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        accessToken: data.access_token,
        teamId: data.team?.id,
        teamName: data.team?.name,
        channel: data.incoming_webhook?.channel,
        channelId: data.incoming_webhook?.channel_id,
        webhookUrl: data.incoming_webhook?.url,
        isActive: true,
      },
      create: {
        userId,
        accessToken: data.access_token,
        teamId: data.team?.id,
        teamName: data.team?.name,
        channel: data.incoming_webhook?.channel,
        channelId: data.incoming_webhook?.channel_id,
        webhookUrl: data.incoming_webhook?.url,
        isActive: true,
      },
    });
  }

  /**
   * Disconnects Slack for a given user.
   */
  public async disconnect(userId: string) {
    return prisma.slackIntegration.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  /**
   * Gets the Slack connection status for a user.
   */
  public async getStatus(userId: string) {
    const integration = await prisma.slackIntegration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return { connected: false };
    }

    return {
      connected: true,
      teamName: integration.teamName || 'Slack Workspace',
      channel: integration.channel || '#alerts',
      connectedAt: integration.updatedAt,
    };
  }
}

export const slackService = new SlackService();
