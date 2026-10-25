import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getEmailQueue } from '../queue/email.queue';

export function setupBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const emailQueue = getEmailQueue();

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue as any) as any],
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
