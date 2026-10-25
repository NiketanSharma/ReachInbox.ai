# ReachInbox.ai — Production-grade Full-stack Email Job Scheduler

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19-green.svg)](https://expressjs.com/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.8-red.svg)](https://docs.bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.11-yellow.svg)](https://www.elastic.co/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)

A distributed, production-grade email scheduling service and modern dashboard built for **ReachInbox.ai** by **Niketan Sharma**.

The system enables reliable delayed scheduling, provider throttling, distributed hourly rate limiting with auto-rescheduling, live Slack notifications upon hitting limits, full-text search indexing via Elasticsearch, and multi-sender fake SMTP delivery using Ethereal Email with preview links.

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Key Engineering Highlights](#-key-engineering-highlights)
3. [Technology Stack](#-technology-stack)
4. [Prerequisites & Quick Start](#-prerequisites--quick-start)
5. [Environment Configuration (.env)](#-environment-configuration-env)
6. [How Scheduling & Persistence Work (No Cron)](#-how-scheduling--persistence-work-no-cron)
7. [Throughput, Rate Limiting & Concurrency](#-throughput-rate-limiting--concurrency)
8. [Live Slack Rate-Limit Notifications](#-live-slack-rate-limit-notifications)
9. [Elasticsearch Search Integration](#-elasticsearch-search-integration)
10. [BullMQ Real-Time Dashboard](#-bullmq-real-time-dashboard)
11. [Frontend Dashboard Features](#-frontend-dashboard-features)
12. [Step-by-Step Demo & Verification Guide](#-step-by-step-demo--verification-guide)
13. [Assumptions, Shortcuts & Trade-offs](#-assumptions-shortcuts--trade-offs)
14. [Submission & Access Details](#-submission--access-details)

---

## 🏛️ Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Frontend (React + Vite + Tailwind)"]
        UI["Main Dashboard"]
        GoogleAuth["Google OAuth Login"]
        Compose["Compose Modal / CSV Lead Parser"]
        ScheduledTab["Scheduled Emails Table"]
        SentTab["Sent Emails Table (Ethereal Links)"]
        SlackModal["Connect Slack (OAuth & Webhook)"]
    end

    subgraph API["Backend API (Express.js + TypeScript)"]
        Endpoints["REST Endpoints (/api/emails, /api/auth, /api/slack)"]
        Reconcile["Startup Reconciliation Service"]
        BullBoard["BullMQ Live Dashboard (/admin/queues)"]
    end

    subgraph DataQueue["Storage & Message Queue"]
        Postgres[("PostgreSQL\n(Prisma ORM)")]
        RedisQueue[("Redis (BullMQ)\nDelayed Sorted Sets")]
        RedisRate[("Redis Atomic Counters\nHourly Sliding Window")]
        ES[("Elasticsearch 8.x\nreachinbox-emails index")]
    end

    subgraph Execution["Distributed Worker Engine"]
        Worker["BullMQ Worker (Configurable Concurrency = 5)"]
        Limiter{"Hourly Limit Exceeded?"}
        SlackNotify["Send Real Slack Alert API Call"]
        DelayBuffer["Throttling Pause (e.g. 2s)"]
        SMTP["Ethereal Fake SMTP Transporters"]
    end

    Compose -->|POST /api/emails/schedule| Endpoints
    Endpoints -->|1. Store records| Postgres
    Endpoints -->|2. Add delayed job (Idempotent)| RedisQueue
    Endpoints -->|3. Index searchable document| ES

    RedisQueue -->|Delayed trigger| Worker
    Worker -->|Check limit| RedisRate
    RedisRate --> Limiter
    Limiter -->|YES: Limit Reached| SlackNotify
    Limiter -->|YES: Reschedule| RedisQueue
    Limiter -->|NO: Allowed| DelayBuffer
    DelayBuffer --> SMTP
    SMTP -->|Sent + Preview URL| Postgres
    SMTP -->|Update status| ES

    Reconcile -.->|On Server Restart: Resync pending jobs| Postgres
    Reconcile -.->|Guarantee future delivery| RedisQueue
```

---

## 🚀 Key Engineering Highlights

| Feature | Requirement | Implementation Details |
|---|---|---|
| **Zero Cron Scheduling** | ❌ No cron jobs | Powered purely by **BullMQ delayed jobs** backed by Redis sorted sets (`bull:<queue>:delayed`). |
| **Server Restart Resilience** | No lost/duplicate jobs | BullMQ state is persisted in Redis. Additionally, an on-boot **reconciliation engine** verifies pending jobs in PostgreSQL and re-enqueues missing ones with exact remaining delays. |
| **Strict Idempotency** | Prevent duplicate sends | Every BullMQ job uses `jobId: emailJob.id`. The worker verifies DB status (`SENT` guard) before execution. |
| **Worker Concurrency** | Configurable concurrency | Multi-job parallel execution configured via `WORKER_CONCURRENCY=5` without race conditions. |
| **Inter-Email Throttling** | Delay between sends | Minimum delay (`MIN_EMAIL_DELAY_MS=2000`) enforced in worker to mimic real-world SMTP throttling. |
| **Hourly Rate Limiter** | Rate limit per sender | Distributed Redis atomic counters (`INCR` + `EXPIRE` over 1-hour window buckets). |
| **Zero-Drop Auto Reschedule** | Never drop emails | When a sender hits the hourly limit, jobs are **not dropped or failed** — they are rescheduled to the next available hour window. |
| **Live Slack Notifications** | Verifiable Slack alert | Real live API call via Slack Webhook / OAuth when rate limit is reached. Handles disconnect/reconnect seamlessly. |
| **Elasticsearch Search** | Searchable emails | Emails are indexed in Elasticsearch `reachinbox-emails` upon creation and dispatch. Multi-match search with PostgreSQL fallback. |
| **Queue Visibility** | Live Queue Dashboard | Mounted `@bull-board/express` at `/admin/queues` showing active, delayed, completed, and failed jobs. |
| **Real Google OAuth** | User authentication | Google Identity Services with client ID & JWT token session. Evaluator demo mode also available. |
| **CSV Lead Upload** | Bulk scheduling | Upload `.csv` or `.txt` files; frontend parses and validates emails in real time with count indicators. |

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js v20+ / TypeScript 5.4
- **Framework**: Express.js
- **Task Queue**: BullMQ 5.8 (backed by Redis 7)
- **Database**: PostgreSQL 16 with Prisma ORM 5.14
- **SMTP**: Ethereal Email (via Nodemailer) with multi-sender support and web preview URLs
- **Search**: Elasticsearch 8.11 client (`@elastic/elasticsearch`)
- **Queue Dashboard**: `@bull-board/api` & `@bull-board/express`
- **Integrations**: Slack Webhooks & OAuth 2.0 (`axios`), Google OAuth (`google-auth-library`), JWT

### Frontend
- **Framework**: React 18 with Vite and TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Authentication**: `@react-oauth/google`
- **HTTP Client**: Axios with JWT interceptors
- **Date Handling**: `date-fns`

---

## 📦 Prerequisites & Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/NiketanSharma/ReachInbox.ai.git
cd ReachInbox.ai
```

### 2. Start Infrastructure (PostgreSQL, Redis, Elasticsearch) via Docker
Run the provided `docker-compose.yml`:
```bash
docker compose up -d
```
*This starts:*
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Elasticsearch on `localhost:9200`

> **Note for Local Testing without Docker:**  
> If Docker is not installed on your machine:
> - You can point `DATABASE_URL` in `.env` to any local or cloud PostgreSQL instance (Neon, Supabase, Railway, etc.).
> - You can point `REDIS_HOST` / `REDIS_PORT` to local Redis (or cloud Upstash Redis).
> - In-memory and database fallbacks are built in so services start gracefully even when standalone!

---

### 3. Setup Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
Backend will start on: **http://localhost:5000**  
BullMQ Live Dashboard: **http://localhost:5000/admin/queues**

---

### 4. Setup Frontend

Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend will start on: **http://localhost:5173**

---

## ⚙️ Environment Configuration (.env)

A ready-to-use `.env.example` is located at the root of the repository:

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox_scheduler?schema=public"

# Redis (BullMQ & Rate Limiter)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=reachinbox-emails

# Scheduler & Concurrency Settings
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=50

# Security
JWT_SECRET=reachinbox_super_secret_jwt_key_2026

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Slack Integration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/oauth/callback

# Ethereal Email (Auto-generated dynamically if left blank)
ETHEREAL_USER=
ETHEREAL_PASS=
```

---

## ⏰ How Scheduling & Persistence Work (No Cron)

### BullMQ Delayed Jobs
Instead of polling databases or running timer ticks (`node-cron`, `setInterval`, `agenda`):
1. When an email sequence is submitted, each recipient receives a scheduled timestamp:
   $$\text{targetTime}_i = \max(\text{now}, \text{startTime} + i \times \text{delayBetweenEmails})$$
2. The delay is calculated as:
   $$\text{delayMs} = \max(0, \text{targetTime} - \text{now})$$
3. A job is pushed into BullMQ:
   ```ts
   await queue.add('send-email', payload, {
     delay: delayMs,
     jobId: emailJob.id, // Enforces idempotency
   });
   ```
4. BullMQ leverages Redis Sorted Sets (`ZADD`) where the score is the target Unix timestamp. Redis naturally orders and notifies workers when jobs become ready.

### Restart Resilience & Reconciliation
- **Redis persistence:** By default, Redis runs with `--appendonly yes` so delayed sets persist across restarts.
- **Boot Reconciliation:** On backend startup (`src/index.ts` -> `reconcileScheduledJobs()`), the system queries all PostgreSQL records where `status IN ('SCHEDULED', 'RATE_LIMITED_RESCHEDULED')`.
- If any job is missing in Redis (e.g., Redis restart or flush), the server re-enqueues it with remaining delay `max(0, scheduledAt - now)` and the same `jobId`.
- **Zero Duplicates:** If a job was already dispatched, its status in DB is `SENT`. The worker checks DB state before triggering Ethereal SMTP, guaranteeing 100% idempotency.

---

## 🚦 Throughput, Rate Limiting & Concurrency

### 1. Worker Concurrency
- Configured via `WORKER_CONCURRENCY` (default: `5`).
- BullMQ worker spawns 5 parallel job processors.
- Database updates and Redis atomic counters ensure workers never collide.

### 2. Inter-Email Send Delay (Provider Throttling)
- Provider throttling is simulated via `MIN_EMAIL_DELAY_MS` (e.g. `2000ms` / 2 seconds).
- The worker executes an asynchronous non-blocking pause (`await sleep(delay)`) between individual dispatches, mimicking real SMTP gateway behavior.

### 3. Distributed Hourly Rate Limiter (Per-Sender)
- Calculated over a 1-hour window bucket:
  ```ts
  const currentHour = Math.floor(Date.now() / 3600000) * 3600000;
  const key = `ratelimit:${senderEmail}:${currentHour}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 7200);
  ```
- **When limit is exceeded:**
  - The job is **not dropped** and **not failed**.
  - Next window time is calculated: `nextWindow = currentHour + 3600000`.
  - The job status in DB is updated to `RATE_LIMITED_RESCHEDULED`.
  - The job is scheduled in BullMQ for `nextWindow`.
  - A live Slack notification is dispatched to the user.

---

## 💬 Live Slack Rate-Limit Notifications

The dashboard provides a dedicated **Connect Slack** modal with two connection methods:
1. **Incoming Webhook URL:** Paste your Slack incoming webhook (e.g., `https://hooks.slack.com/services/...`).
2. **Slack OAuth 2.0:** Standard authorization redirect flow.

### Notification Trigger:
When a sender hits their configured limit:
- The backend sends a formatted Slack message with:
  - ⚠️ Rate Limit Alert header
  - Sender email address
  - Configured hourly limit vs current count
  - Next window start time
  - Idempotency reassurance (Zero emails lost)
- Includes a **Send Test Alert** button in the dashboard to verify live delivery immediately in your demo!

---

## 🔍 Elasticsearch Search Integration

- Index: `reachinbox-emails`
- Whenever an email is created or sent, it is indexed with full-text mappings for:
  - `subject` (boosted $\times 3$)
  - `recipientEmail` (boosted $\times 2$)
  - `senderEmail`
  - `body`
  - `status`
- The search endpoint (`/api/emails/scheduled?search=...` and `/api/emails/sent?search=...`) performs fuzzy multi-match queries.
- **Fail-safe fallback:** If Elasticsearch is not running, searches automatically fall back to PostgreSQL `contains` queries without crashing.

---

## 📊 BullMQ Real-Time Dashboard

The live queue dashboard is available at:
**[http://localhost:5000/admin/queues](http://localhost:5000/admin/queues)**

Features:
- Live view of Delayed, Active, Completed, and Failed queues.
- Visual inspection of job payloads and remaining delay countdowns.
- Retry, promote, and clean options.

---

## 🖥️ Frontend Dashboard Features

Built to closely match the provided ReachInbox Figma design:
1. **Google OAuth Login Screen:** Real Google Sign-In with one-tap and Evaluator quick demo mode.
2. **Top Header:** User name, email, avatar, live Slack status indicator, BullMQ dashboard link, and Sign Out.
3. **Metric Summary Cards:** Queued count, Delivered count, Active Senders, Worker status indicator.
4. **Compose Sequence Modal:**
   - Multi-sender selection dropdown
   - CSV / TXT drag-and-drop file upload with lead counter pill
   - Subject & Body editor
   - Start time picker, delay between sends, and hourly rate limit inputs
5. **Scheduled Emails Table:** Recipient, Sender, Subject, Scheduled Time, Status badge, Cancel action, search bar.
6. **Sent Emails Table:** Recipient, Sender, Subject, Sent Time, Status badge, and **View Email** Ethereal preview link.

---

## 🎬 Step-by-Step Demo & Verification Guide

Follow these steps to record the 5-minute evaluation video:

### Scenario 1: Schedule Emails via CSV
1. Sign in to the dashboard (`http://localhost:5173`).
2. Click **Compose New Email**.
3. Upload `sample_leads.csv` (included in repository root).
4. Notice the detected lead count badge updates automatically (e.g. `5 leads detected`).
5. Set start time to 1 minute ahead and delay to 2 seconds.
6. Click **Schedule Emails**.
7. Observe the jobs populate in the **Scheduled Emails** table.
8. Open the **BullMQ Live Queue** (`http://localhost:5000/admin/queues`) to show delayed jobs waiting in Redis.

### Scenario 2: Email Sending & Ethereal Web Preview
1. Wait for the scheduled time to arrive.
2. The worker automatically dispatches the emails with a 2-second delay between each.
3. Switch to the **Sent Emails** tab on the dashboard.
4. Click the **View Email** button on any sent row.
5. A new browser tab opens showing the actual rendered email in Ethereal fake SMTP!

### Scenario 3: Server Restart Resilience Test
1. Schedule 3 emails set for 2 minutes in the future.
2. In the terminal, stop the backend server (`Ctrl + C`).
3. Point out that the emails are preserved in Redis and PostgreSQL.
4. Start the backend again (`npm run dev`).
5. Observe the reconciliation log: `🔄 [Reconciliation] Checking pending scheduled emails...`
6. Wait for the scheduled time: the emails will successfully send at the exact scheduled time without duplication!

### Scenario 4: Rate Limiting & Live Slack Alert
1. In the dashboard, click **Connect Slack** and enter a Slack incoming webhook. Click **Send Test Alert** to verify live connection.
2. In Compose Email, set **Hourly Limit** to `2` and schedule `4` leads.
3. The first 2 emails will send immediately.
4. The 3rd and 4th emails will trigger the rate limiter:
   - Notice the status badge turns into `Rate Limit Rescheduled`.
   - The jobs are delayed to the next hour window.
   - A live notification appears in your Slack channel!

---

## ⚖️ Assumptions, Shortcuts & Trade-offs

1. **Ethereal Dynamic Accounts:** Ethereal SMTP accounts are dynamically created on the fly if credentials are not provided in `.env`, ensuring zero manual setup is required for fake SMTP testing.
2. **Elasticsearch Resilience:** To ensure that developers without Elasticsearch running can still evaluate the core scheduling and queue functionality, the search endpoint gracefully falls back to PostgreSQL text searching if the Elasticsearch cluster is offline.
3. **Google OAuth Client ID:** A real Google OAuth flow is implemented. If the evaluator does not have a Google Cloud client ID handy, an "Evaluator Demo Sign-In" button is provided on the login screen to test the full authenticated dashboard immediately.

---

## 👥 Submission & Access Details

- **GitHub Repository:** [https://github.com/NiketanSharma/ReachInbox.ai](https://github.com/NiketanSharma/ReachInbox.ai)
- **Collaborator Access Granted:**
  - `Mitrajit`
  - `Yadav036`
- **Submission Form:** [ClickUp Submission Form](https://forms.clickup.com/9005062261/f/8cbwp3n-8876/6NNNJ92DV93PQTAYST)

---

*Developed with passion for ReachInbox.ai.*
