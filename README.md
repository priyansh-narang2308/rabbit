# Rabbit: Enterprise Agent Orchestration

Rabbit is an open-source, multi-environment agent orchestration platform built on the Solari SDK. Designed for production workloads, Rabbit provides a scalable, compliant, and deeply integrated architecture for managing autonomous AI agents across web browsers, secure sandboxes, and desktop environments.

![Rabbit Dashboard Demo](.github/demo-preview.png)

---

## Core Capabilities

- **Multi-Environment Execution**
  Rabbit enables seamless execution chains across isolated environments. A single autonomous agent can orchestrate a sequence that involves scraping authenticated web applications, running data analysis in a secure Python sandbox, and injecting results into legacy Windows desktop clients.

- **Persistent Identity Management**
  Built on top of Solari Profiles, Rabbit maintains persistent sessions across independent task runs. Agents can authenticate once into a target system, and Rabbit securely persists cookies and local storage state, allowing subsequent agent instances to bypass authentication entirely.

- **Immutable Audit Trails**
  Designed for compliance and security, Rabbit records every keystroke, DOM mutation, and network request. The system automatically captures before/after visual verification of every action and downloads complete `rrweb` NDJSON session replays for post-execution auditing.

- **Distributed Queue Architecture**
  Engineered for scale, Rabbit leverages BullMQ and Redis to decouple task ingestion from execution. This guarantees state persistence, automatic retries, and parallel scaling of agent workers.

---

## Architecture Overview

Rabbit is organized as a strict monorepo containing three core internal packages:

- **`@rabbit/core`**: The execution engine. Houses the core LLM Agent Loop (Planner, Executor, Evaluator), the `MultiEnvOrchestrator`, and direct bindings to the Solari SDK for Browser, Sandbox, and Desktop provisioning.
- **`@rabbit/server`**: The control plane. A high-performance Hono/SQLite backend providing the REST API, Server-Sent Events (SSE) streaming telemetry, and the BullMQ task queue worker daemon.
- **`@rabbit/web`**: The presentation layer. A Next.js 15 dashboard built with Tailwind CSS and shadcn/ui, providing control over agent execution, real-time telemetry visualization, and retrospective audit analysis.

```mermaid
graph TD
    Client([Client Application]) --> API[Rabbit Control Plane (Hono API)]
    WebDashboard[Rabbit Web UI (Next.js)] --> API
    API --> DB[(SQLite Database)]
    API --> Redis[(Redis Message Broker)]
    Redis --> Worker[Rabbit Worker Daemon]
    Worker --> Core[@rabbit/core Execution Engine]
    Core --> Browser[Solari Browser Fleet]
    Core --> Sandbox[Solari Sandbox Fleet]
    Core --> Desktop[Solari Desktop Fleet]
```

---

## Solari SDK Integration Matrix

Rabbit serves as a comprehensive reference implementation for the Solari SDK platform.

| Subsystem | Implementation Details |
| :--- | :--- |
| **Browser Virtualization** | Managed via `BrowserManager`. Supports dynamic geo-proxy assignment, stealth fingerprinting, and automatic captcha resolution. |
| **Identity Persistence** | Utilizes Solari Profiles to bypass 2FA and standard authentication flows for recurring automation workflows. |
| **Secure Sandboxing** | Managed via `SandboxManager`. Provides an isolated, ephemeral execution environment for LLM-generated scripts and data aggregation. |
| **Desktop Automation** | Managed via `DesktopManager`. Enables visual, coordinate-based interaction loops for legacy applications inaccessible via DOM or API. |
| **Session Recording** | Asynchronously retrieves raw `rrweb` streams via `RecordingDownloader` upon session termination, ensuring zero performance overhead during execution. |

---

## Deployment & Quick Start

### 1. Prerequisites
- Node.js 18.x or higher
- Redis instance (running locally or remotely)
- Solari Platform API Key

### 2. Environment Configuration
Clone the repository and define the required environment variables in the root directory:

```bash
git clone https://github.com/your-org/rabbit.git
cd rabbit
npm install
```

Create a `.env` configuration file:
```env
SOLARI_API_KEY=your_solari_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Service Initialization
Rabbit utilizes npm workspaces. The entire stack can be initialized from the repository root:

```bash
# 1. Compile the core execution engine
npm run build -w @rabbit/core

# 2. Apply database schemas and migrations
npm run db:push -w @rabbit/server

# 3. Boot the development services (Web Dashboard and API Server)
npm run dev
```

- **Management Dashboard**: `http://localhost:3000`
- **Control Plane API**: `http://localhost:3001`

---

## Reference Scenarios

Navigate to the **Demo Scenarios** module within the dashboard (`/dashboard/demo`) to execute pre-configured integration tests:

1. **Distributed Competitive Analysis**
   The orchestrator provisions three parallel browser sessions routed through distinct geo-proxies (US, UK, JP) to extract localized pricing data. The aggregated payload is then injected into a Solari Sandbox, where the agent normalizes the data into a unified Markdown matrix.
   
2. **Deterministic Data Entry & Auditing**
   Demonstrates precision interaction by navigating a complex, multi-step web form. The agent maps a predefined data schema to DOM elements, with every discrete input logged to the immutable audit trail for compliance verification.
   
3. **Identity Session Persistence**
   Provisions an initial browser session to authenticate against a target system and commits the resulting cookie/local storage state to a Solari Profile. A secondary browser session is subsequently launched using the generated profile, verifying the agent's ability to act on the target system without re-authenticating.

---

## License

Distributed under the MIT License. See `LICENSE` for further information.
