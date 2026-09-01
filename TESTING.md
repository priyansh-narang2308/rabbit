# 🐇 Rabbit — Master Testing Guide

Welcome to the peak of agent orchestration. This guide will walk you through exactly how to boot the Rabbit stack, trigger the autonomous agents, and watch them execute complex workflows in real-time.

---

## 🏗 Step 1: Booting the Infrastructure

Rabbit relies on a few core pieces of infrastructure to operate reliably: SQLite (for state/audit) and Redis (for the BullMQ task queues).

### 1. Start Redis

You must have a Redis server running locally on port `6379`.

- **If using Docker:**
  ```bash
  docker run -d -p 6379:6379 redis
  ```
- **If using Homebrew (Mac):**
  ```bash
  brew services start redis
  ```

### 2. Push the Database Schema

We are using Drizzle ORM with SQLite. You need to create the database file and push the tables (`tasks`, `runs`, `audit_entries`, `profiles`, `recordings`).
Open a terminal in the root of the project and run:

```bash
npm run db:push -w @rabbit/server
```

_(You should see Drizzle successfully apply the schema to `rabbit.db`)_

---

## 🚀 Step 2: Starting the Rabbit Stack

Rabbit is a monorepo. We have a unified `dev` script in the root `package.json` that will boot both the Next.js Web Dashboard and the Hono API Server simultaneously.

1. Open a terminal in the root of the `rabbit` folder.
2. Run the dev command:
   ```bash
   npm run dev
   ```

**What is happening?**

- `@rabbit/server` boots up on `http://localhost:3001`.
  - It connects to SQLite.
  - It connects to Redis.
  - It starts the **BullMQ Worker** which listens for incoming tasks in the background.
- `@rabbit/web` boots up on `http://localhost:3000`.
  - The Next.js dashboard is now live.

---

## 👁 Step 3: Experiencing the Dashboard

Open your browser and navigate to **[http://localhost:3000/dashboard/demo](http://localhost:3000/dashboard/demo)**.

This is the control center. You will see three tabs at the top representing the three peak demo scenarios we built.

### Scenario A: Competitor Pricing (Multi-Environment)

1. Click the **"Pricing Research"** tab.
2. Click **"Launch Demo"**.
3. **What to watch:**
   - Notice the **Status** badge instantly change from `idle` → `queued` → `running`.
   - The UI establishes a Server-Sent Events (SSE) connection to the API. You will start seeing a live feed of what the agent is doing under **"Live Step Telemetry"**.
   - The agent is launching _three parallel Solari Browser sessions_ routed through different global proxies (US, UK, Japan).
   - Once it finishes extracting data, it boots a _Solari Sandbox_, generates a Markdown table, and completes the task.
4. **The Result:** You will see a green success box rendering the final Markdown comparison table generated entirely autonomously.

### Scenario B: Form Autofill (Precision execution)

1. Click the **"Form Autofill"** tab.
2. Click **"Launch Demo"**.
3. **What to watch:**
   - The agent navigates to a multi-step practice form.
   - Watch the live telemetry feed. You will see exact audit logs of the agent planning and executing commands like `fill "First Name" with "Priyansh"`.
   - The task will complete successfully once it submits the form.

### Scenario C: Persistent Identity (Session memory)

1. Click the **"Persistent Identity"** tab.
2. Click **"Launch Demo"**.
3. **What to watch:**
   - **Phase 1:** The agent boots a browser, navigates to a login page, enters credentials, and verifies the login. It then securely saves the cookies and local storage to a **Solari Profile**.
   - **Phase 2:** The agent boots a _brand new, fresh browser instance_, but attaches the Profile. It navigates back to the site and proves it is already authenticated without typing a password.
4. **The Result:** You will see the agent confirm that the identity persisted successfully.

---

## 🔍 Step 4: The Deep Audit (Verifying the AI)

Once a task completes, we don't just trust it—we verify it.

1. Navigate to **"Tasks"** in the left sidebar (`/dashboard/tasks`).
2. You will see a list of the tasks you just ran. Click on one of the **Completed** tasks.
3. Welcome to the **Task Detail Page**.
   - **Audit Timeline:** Scroll down. You will see a highly detailed, immutable log of _every single action_ the agent took. It logs the exact timestamp, the reasoning the LLM used, the action type, and the result.
   - **Replay & Screenshots (If enabled):** If the recording flag was on, the backend automatically downloaded the `rrweb` session replay from Solari. You can visually verify exactly what the agent saw and did.

---

## 🎉 Step 5: You Have Reached the Peak

You just ran a distributed, multi-environment, heavily-audited AI agent framework.
Everything is modular, strongly typed, and production-ready.

If everything works as described above, you are ready to record your screen, narrate the magic, and post it to LinkedIn!
