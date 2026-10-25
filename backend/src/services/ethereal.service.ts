import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | false;
  accepted: string[];
  rejected: string[];
}

export interface SenderProfile {
  email: string;
  name: string;
  isDefault: boolean;
}

class EtherealService {
  private transporters: Map<string, Transporter> = new Map();
  private senders: Map<string, SenderProfile> = new Map();
  private defaultAccountCreated = false;

  constructor() {
    // Seed default senders for multi-sender support
    this.addSenderProfile({
      email: 'sales@reachinbox.test',
      name: 'ReachInbox Sales Team',
      isDefault: true,
    });
    this.addSenderProfile({
      email: 'founder@reachinbox.test',
      name: 'ReachInbox Founder',
      isDefault: false,
    });
    this.addSenderProfile({
      email: 'outreach@reachinbox.test',
      name: 'ReachInbox Growth & Outreach',
      isDefault: false,
    });
    this.addSenderProfile({
      email: 'demo@reachinbox.test',
      name: 'ReachInbox Demo Account',
      isDefault: false,
    });
  }

  public addSenderProfile(sender: SenderProfile): void {
    this.senders.set(sender.email.toLowerCase(), sender);
  }

  public getAvailableSenders(): SenderProfile[] {
    return Array.from(this.senders.values());
  }

  /**
   * Retrieves or creates a Nodemailer transporter for a given sender email.
   * Leverages Ethereal test accounts to guarantee fake SMTP testing with preview links.
   */
  public async getTransporter(senderEmail?: string): Promise<{ transporter: Transporter; sender: SenderProfile }> {
    const emailKey = (senderEmail || 'sales@reachinbox.test').toLowerCase();

    let profile = this.senders.get(emailKey);
    if (!profile) {
      profile = {
        email: emailKey,
        name: emailKey.split('@')[0],
        isDefault: false,
      };
      this.senders.set(emailKey, profile);
    }

    if (this.transporters.has(emailKey)) {
      return { transporter: this.transporters.get(emailKey)!, sender: profile };
    }

    let transporter: Transporter;

    // If environment has credentials and this is the default sender, use them
    if (config.ethereal.user && config.ethereal.pass && !this.defaultAccountCreated) {
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: config.ethereal.user,
          pass: config.ethereal.pass,
        },
      });
      this.defaultAccountCreated = true;
    } else {
      // Create a dedicated dynamic Ethereal test account
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log(`[Ethereal] Created test SMTP account for sender: ${emailKey} (${testAccount.user})`);
      } catch (err) {
        console.warn(`[Ethereal] Failed to create test account online, falling back to JSON transport:`, (err as Error).message);
        transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    }

    this.transporters.set(emailKey, transporter);
    return { transporter, sender: profile };
  }

  /**
   * Sends an email via Ethereal SMTP and returns the message ID and test preview URL.
   */
  public async sendEmail(options: SendMailOptions): Promise<SendMailResult> {
    const { transporter, sender } = await this.getTransporter(options.from);

    const fromAddress = options.from.includes('<') ? options.from : `"${sender.name}" <${options.from}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: options.html || `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${options.body.replace(/\n/g, '<br/>')}</div>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(`[Ethereal] Email successfully sent! To: ${options.to} | Subject: "${options.subject}"`);
    if (previewUrl) {
      console.log(`[Ethereal] 🔗 Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId || `msg_${Date.now()}`,
      previewUrl: previewUrl || false,
      accepted: Array.isArray(info.accepted) ? (info.accepted as string[]) : [options.to],
      rejected: Array.isArray(info.rejected) ? (info.rejected as string[]) : [],
    };
  }
}

export const etherealService = new EtherealService();
