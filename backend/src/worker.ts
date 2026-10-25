import { connectDatabase } from './db/prisma';
import { setupEmailWorker } from './worker/email.worker';
import { reconcileScheduledJobs } from './queue/email.queue';

async function startWorker() {
  console.log('🚀 Initializing Standalone ReachInbox Worker Service...');

  await connectDatabase();
  await reconcileScheduledJobs();
  setupEmailWorker();

  console.log('👷 Worker service is running and listening for delayed jobs.');
}

startWorker().catch((err) => {
  console.error('Fatal error starting worker:', err);
  process.exit(1);
});
