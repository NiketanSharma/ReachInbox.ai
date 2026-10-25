import { createApp } from './app';
import { config } from './config';
import { connectDatabase } from './db/prisma';
import { elasticsearchService } from './services/elasticsearch.service';
import { reconcileScheduledJobs } from './queue/email.queue';
import { setupEmailWorker } from './worker/email.worker';
import { setupBullBoard } from './routes/dashboard.routes';
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import { authMiddleware } from './middlewares/auth.middleware';

async function bootstrap() {
  console.log('=====================================================');
  console.log('🚀 ReachInbox Distributed Email Job Scheduler Server');
  console.log('=====================================================');

  const app = createApp();

  // 1. Connect to Database (PostgreSQL)
  await connectDatabase();

  // 2. Initialize Elasticsearch Index
  await elasticsearchService.initializeIndex();

  // 3. Mount Bull Board Queue Dashboard (before auth middleware)
  try {
    const bullBoardRouter = setupBullBoard();
    app.use('/admin/queues', bullBoardRouter);
    console.log(`📊 BullMQ Live Queue Dashboard mounted at: http://localhost:${config.port}/admin/queues`);
  } catch (boardErr) {
    console.warn('⚠️ BullBoard setup skipped:', (boardErr as Error).message);
  }

  // 4. API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/slack', slackRoutes);
  app.use('/api/emails', authMiddleware, emailRoutes);

  // 5. Run Startup Reconciliation for Server Restart Resilience
  await reconcileScheduledJobs();

  // 6. Launch BullMQ Email Worker
  setupEmailWorker();

  // 7. Start Express Server
  const server = app.listen(config.port, () => {
    console.log(`\n⚡ Backend API server listening on: http://localhost:${config.port}`);
    console.log(`📡 Client URL: ${config.clientUrl}`);
    console.log(`🎯 Worker Concurrency: ${config.scheduler.workerConcurrency}`);
    console.log(`⏱️ Min Email Delay: ${config.scheduler.minEmailDelayMs}ms`);
    console.log(`📊 Max Emails Per Hour Per Sender: ${config.scheduler.maxEmailsPerHourPerSender}`);
    console.log('=====================================================\n');
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('\n🛑 Gracefully shutting down ReachInbox Scheduler...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
