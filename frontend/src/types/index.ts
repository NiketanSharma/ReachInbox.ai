export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED_RESCHEDULED' | 'CANCELLED';

export interface EmailJob {
  id: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  bullJobId?: string | null;
  etherealMessageId?: string | null;
  etherealPreviewUrl?: string | null;
  delayBetweenEmails: number;
  hourlyLimit: number;
  retryCount: number;
  lastError?: string | null;
  batchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SenderProfile {
  email: string;
  name: string;
  isDefault: boolean;
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
  channel?: string;
  connectedAt?: string;
}

export interface SchedulePayload {
  recipients: string[];
  senderEmail: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}
