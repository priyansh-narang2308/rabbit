# Rabbit

Rabbit is a multi-environment AI agent orchestration engine built on the Solari SDK. It decouples the LLM reasoning layer from physical execution, enabling a single autonomous agent to seamlessly route tasks across cloud browsers, secure sandboxes, and remote desktops within a unified pipeline.

Built as a submission for the Pinetree Research SWE Intern Challenge.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Architecture](#architecture)
- [Execution Model](#execution-model)
- [Solari SDK Integration](#solari-sdk-integration)
- [Agent Loop Design](#agent-loop-design)
- [Multi-Environment Orchestration](#multi-environment-orchestration)
- [Audit System](#audit-system)
- [LLM Provider Architecture](#llm-provider-architecture)
- [Project Structure](#project-structure)
- [Demo Scenarios](#demo-scenarios)
- [Getting Started](#getting-started)
- [Design Decisions](#design-decisions)
- [License](#license)

---

## The Problem

Most AI agent frameworks are confined to a single runtime environment. The agent reasons, browses the web, and executes code all within the same local process. This creates three fundamental problems:

1. **Security**: LLM-generated code runs with full local system access. There is no isolation between the agent's reasoning and its side effects.
2. **Scalability**: A single local process cannot efficiently manage parallel browser sessions across different geographies, spin up ephemeral compute for data processing, and interact with desktop GUIs simultaneously.
3. **Orchestration**: When a task spans multiple environments (browse a website, process the scraped data, inject results into a desktop application), there is no clean abstraction for handing off state between isolated execution contexts.

The fundamental insight behind Rabbit is that the LLM should only be responsible for planning and reasoning. The physical execution of those plans should happen in purpose-built, isolated environments managed by infrastructure designed for that purpose.

---

## The Solution

Rabbit introduces a strict separation between the **reasoning layer** (the LLM) and the **execution layer** (Solari environments). The local LLM acts exclusively as a planner: it observes the current state of an environment, decides the next action, and delegates execution to the appropriate Solari-managed runtime.

This means:
- Web browsing happens in Solari Cloud Browsers with stealth fingerprinting, geo-proxies, and automatic captcha resolution, not in a local Puppeteer instance.
- Code execution happens in Solari Sandboxes, which are ephemeral, isolated containers with no access to the host machine.
- Desktop GUI interaction happens in Solari Desktop VMs, which provide screenshot-based visual interaction loops.
- The local machine only runs the LLM inference and the orchestration logic. It never directly touches the target systems.

---

## Architecture

Rabbit is structured as a strict npm workspace monorepo containing three internal packages:

```
rabbit/
  packages/
    core/          @rabbit/core     Execution engine, agent loops, Solari bindings
    server/        @rabbit/server   REST API, SSE telemetry, BullMQ task queue
    web/           @rabbit/web      Next.js 15 dashboard, real-time monitoring
```

### Data Flow

```
Client Request
    |
    v
Hono REST API (packages/server)
    |
    v
BullMQ Task Queue (Redis)
    |
    v
Worker Daemon (packages/server)
    |
    v
MultiEnvOrchestrator (packages/core)
    |
    +---> MultiEnvPlanner (LLM) ---> Decomposes task into ordered sub-steps
    |
    +---> For each sub-step:
    |       |
    |       +---> environment: "browser"
    |       |       BrowserManager --> Solari Cloud Browser
    |       |       AgentOrchestrator (Planner -> Executor -> Evaluator loop)
    |       |
    |       +---> environment: "sandbox"
    |       |       SandboxManager --> Solari Sandbox
    |       |       SandboxOrchestrator (SandboxPlanner -> SandboxExecutor loop)
    |       |
    |       +---> environment: "desktop"
    |               DesktopManager --> Solari Desktop VM
    |               DesktopOrchestrator (DesktopPlanner -> DesktopExecutor loop)
    |
    v
Aggregated Result --> SSE Stream --> Dashboard UI
```

---

## Execution Model

Rabbit uses a three-phase execution model within each environment:

### 1. Plan

The Planner receives the current environment state (DOM snapshot + screenshot for browsers, command output for sandboxes, screenshot for desktops) and produces a single structured JSON action. The action schema is enforced via Zod discriminated unions at parse time.

### 2. Execute

The Executor takes the validated action and performs it against the target environment. For browsers, this means calling Playwright methods on the remote Solari browser page. For sandboxes, this means running shell commands in the remote container. For desktops, this means performing mouse clicks and keyboard inputs on the remote VM.

### 3. Evaluate

The Evaluator is a second LLM call that receives the action that was just taken and the resulting environment state. It returns a boolean judgment on whether the action succeeded and produces reasoning about what to do next. This creates a self-correcting feedback loop: if the Evaluator determines an action failed, the Planner receives that failure context in its next iteration and can adjust its strategy.

This Plan-Execute-Evaluate loop runs iteratively until the Planner emits a terminal action (`done` or `error`) or the step limit is reached.

---

## Solari SDK Integration

Rabbit is a comprehensive integration of the Solari platform. Every execution environment is provisioned and managed through Solari's SDK.

### BrowserManager

Wraps `@solarisdk/browser` to provision ephemeral cloud browser sessions. Each session supports:

- **Geo-proxy assignment**: Route browser traffic through specific countries (US, GB, JP, etc.) to access localized content.
- **Stealth fingerprinting**: Automated browser fingerprint randomization to avoid bot detection.
- **Captcha resolution**: Built-in captcha solving without manual intervention.
- **Session recording**: Full rrweb-based session recording for post-execution replay.
- **Profile persistence**: Save and restore browser state (cookies, localStorage) across sessions using Solari Profiles.

Implementation: `packages/core/src/solari/browser-manager.ts`

### SandboxManager

Wraps `@solarisdk/sdk` to provision isolated, ephemeral Linux containers. Each sandbox supports:

- **Command execution**: Run arbitrary shell commands (Python scripts, data processing pipelines) in complete isolation from the host.
- **File system access**: Read and write files within the sandbox for data ingestion and output extraction.
- **Configurable templates**: Launch sandboxes with pre-configured environments (base, Python, Node.js).
- **Idle timeout**: Automatic cleanup after a configurable idle window.

Implementation: `packages/core/src/solari/sandbox-manager.ts`

### DesktopManager

Wraps `@solarisdk/sdk` to provision full remote desktop VMs for GUI automation. Each desktop supports:

- **Screenshot capture**: Capture the current visual state of the remote desktop for LLM analysis.
- **Mouse and keyboard input**: Programmatic mouse movement, clicking, and keyboard typing on the remote VM.
- **Stream URL**: Access a live video stream of the remote desktop for real-time monitoring.
- **Template selection**: Launch desktops with specific OS templates (Ubuntu 22.04, etc.).

Implementation: `packages/core/src/solari/desktop-manager.ts`

### ProfileManager

Manages Solari Profiles for persistent identity across browser sessions. Enables agents to authenticate once and reuse that authenticated state in future sessions without re-authenticating.

Implementation: `packages/core/src/solari/profile-manager.ts`

### RecordingDownloader

Asynchronously retrieves raw rrweb NDJSON session recordings from completed browser sessions. This ensures zero performance overhead during execution while still capturing complete session replays for auditing.

Implementation: `packages/core/src/solari/recording.ts`

---

## Agent Loop Design

### Browser Agent

The browser agent loop is the most complex. It operates on two input modalities simultaneously:

1. **Visual**: A PNG screenshot of the current page, encoded as base64 and sent as an image part in the LLM prompt. This allows the agent to "see" the page layout, rendered content, and visual cues that are not present in the DOM.
2. **Structural**: A simplified DOM snapshot of the current page, providing CSS selectors, element text, and page structure. This allows the agent to identify interactive elements and construct precise selectors.

The Planner processes both inputs and emits one of nine possible actions: `navigate`, `click`, `type`, `scroll`, `evaluate`, `wait`, `extract`, `done`, or `error`. Each action is validated against a strict Zod discriminated union schema before execution.

Implementation: `packages/core/src/agent/planner.ts`, `packages/core/src/agent/executor.ts`, `packages/core/src/agent/orchestrator.ts`

### Sandbox Agent

The sandbox agent operates on command output. The Planner receives the stdout/stderr from the previous command and decides the next shell command to run. The agent can write files, install packages, execute Python scripts, and read output files.

The action schema for sandbox agents uses a different discriminated union: `run_command`, `done`, or `error`.

Implementation: `packages/core/src/agent/sandbox-planner.ts`, `packages/core/src/agent/sandbox-executor.ts`, `packages/core/src/agent/sandbox-orchestrator.ts`

### Desktop Agent

The desktop agent operates on screenshots of a remote VM. The Planner receives a screenshot and decides the next GUI action: mouse click at specific coordinates, keyboard input, or screenshot capture for analysis.

Implementation: `packages/core/src/agent/desktop-planner.ts`, `packages/core/src/agent/desktop-executor.ts`, `packages/core/src/agent/desktop-orchestrator.ts`

---

## Multi-Environment Orchestration

The `MultiEnvOrchestrator` is the top-level coordinator that enables cross-environment workflows. Given a complex task, it:

1. Calls the `MultiEnvPlanner` to decompose the task into an ordered list of sub-steps, each assigned to a specific environment (`browser`, `sandbox`, or `desktop`).
2. Iterates through the sub-steps sequentially, provisioning the appropriate Solari environment for each step.
3. Passes the output of each completed step as input context to the next step, enabling data flow across environment boundaries.
4. Supports per-step configuration, such as assigning different geo-proxies to different browser phases.

This is the core innovation of Rabbit: the ability to chain heterogeneous execution environments into a single coherent pipeline, with the LLM maintaining reasoning continuity across all of them.

Implementation: `packages/core/src/agent/multi-env-planner.ts`, `packages/core/src/agent/multi-env-orchestrator.ts`

---

## Audit System

Rabbit includes a comprehensive audit system designed for compliance and debugging.

### AuditLogger

Every agent step is logged as an `AuditEntry` containing:
- The action type, target selector/URL, and input value
- The reasoning the LLM provided for choosing this action
- The URL and screenshot after execution
- Whether the action succeeded or failed
- The duration in milliseconds
- A cryptographically random UUID and ISO timestamp

Implementation: `packages/core/src/audit/trail.ts`

### EvidenceCollector

Captures before/after screenshots for every agent action, providing visual proof of each state transition.

Implementation: `packages/core/src/audit/evidence.ts`

### ReplayParser

Parses raw rrweb NDJSON session recordings into structured event streams for post-execution analysis.

Implementation: `packages/core/src/audit/replay-parser.ts`

---

## LLM Provider Architecture

Rabbit abstracts the LLM layer behind a provider-agnostic interface. The system currently ships with three provider implementations:

### OpenRouter (Primary)

Uses the OpenRouter API to access `openai/gpt-4o-mini`. This is the default provider and provides the best balance of speed, accuracy, and JSON schema compliance for agentic workflows.

Implementation: `packages/core/src/llm/openrouter.ts`

### Groq

Uses the Groq API for high-speed inference. Includes automatic rate-limit retry logic with dynamic backoff parsed from Groq's error responses.

Implementation: `packages/core/src/llm/groq.ts`

### Ollama (Local)

Uses Ollama's OpenAI-compatible local API for fully offline, zero-cost inference. Supports vision models (llava) for browser automation.

Implementation: `packages/core/src/llm/ollama.ts`

All three providers export the same interface pattern (`xxxChat()`, `parseAction()`, `extractJson()`, `parseJsonObject()`), making it trivial to swap between them by changing a single import line.

Every provider includes a `parseAction()` utility that performs deep recursive search through the LLM's response to recover valid actions even when the model wraps them in unexpected structures, uses non-standard discriminator keys, or nests them inside reasoning objects.

---

## Project Structure

```
packages/core/src/
  agent/
    planner.ts              Browser action planner (vision + DOM)
    executor.ts             Browser action executor (Playwright)
    evaluator.ts            Action success evaluator (LLM)
    orchestrator.ts         Single-environment agent loop
    sandbox-planner.ts      Sandbox command planner
    sandbox-executor.ts     Sandbox command executor
    sandbox-orchestrator.ts Sandbox agent loop
    desktop-planner.ts      Desktop GUI planner (screenshot)
    desktop-executor.ts     Desktop GUI executor (mouse/keyboard)
    desktop-orchestrator.ts Desktop agent loop
    multi-env-planner.ts    Cross-environment task decomposer
    multi-env-orchestrator.ts Cross-environment pipeline coordinator
  solari/
    browser-manager.ts      Solari cloud browser provisioning
    sandbox-manager.ts      Solari sandbox provisioning
    desktop-manager.ts      Solari desktop VM provisioning
    profile-manager.ts      Solari persistent identity management
    recording.ts            Session recording downloader
  llm/
    openrouter.ts           OpenRouter API provider
    groq.ts                 Groq API provider
    ollama.ts               Ollama local provider
  audit/
    trail.ts                Immutable audit log
    evidence.ts             Screenshot evidence collector
    replay-parser.ts        rrweb session replay parser
  demo/
    pricing-research.ts     Competitor pricing pipeline
    form-autofill.ts        Multi-step form automation
    persistent-identity.ts  Session persistence demo

packages/server/src/
    index.ts                Hono REST API + SSE streaming + BullMQ worker

packages/web/
    Next.js 15 dashboard with real-time telemetry
```

---

## Demo Scenarios

Navigate to `/dashboard/demo` in the web dashboard to run pre-configured integration scenarios.

### 1. Competitor Pricing Analysis

Demonstrates the full multi-environment pipeline. The `MultiEnvOrchestrator` provisions three sequential browser sessions, each routed through a different geo-proxy (US, UK, JP), to scrape localized pricing data from Dropbox, Google Drive, and Microsoft OneDrive. The aggregated raw data is then handed off to a Solari Sandbox where the agent writes and executes a Python script to normalize the data into a structured comparison table.

This scenario exercises: `BrowserManager` (geo-proxied sessions, stealth, captcha), `SandboxManager` (ephemeral compute, command execution), `MultiEnvOrchestrator` (cross-environment data handoff), and the full Plan-Execute-Evaluate loop.

### 2. Deterministic Form Autofill

Demonstrates precision browser interaction. The agent navigates to a multi-step passport application form on JotForm, fills every field from a pre-defined data specification, handles page transitions, and submits. Every keystroke and field value is captured in the immutable audit trail with before/after screenshots.

This scenario exercises: `BrowserManager` (single session), `AgentOrchestrator` (extended multi-step interaction), `AuditLogger` (complete evidence chain), and `EvidenceCollector` (visual verification).

### 3. Persistent Identity

Demonstrates Solari Profile integration. An initial browser session authenticates against a target system and the resulting session state (cookies, localStorage) is committed to a Solari Profile. A second browser session is launched using that profile and verifies that the agent can interact with the target system without re-authenticating.

This scenario exercises: `BrowserManager` (profile-based sessions), `ProfileManager` (state persistence), and session continuity across independent browser instances.

---

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- Redis (running locally or remotely)
- A Solari Platform API key (get one at console.getsolari.com)
- An OpenRouter API key (or Groq API key, or local Ollama installation)

### Installation

```bash
git clone https://github.com/priyansh-narang2308/rabbit.git
cd rabbit
npm install
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
SOLARI_API_KEY=slr_live_...
OPENROUTER_API_KEY=sk-or-v1-...

SOLARI_BASE_URL=https://api.getsolari.com
SOLARI_BROWSER_URL=https://api.getsolari.com

DATABASE_URL="./rabbit.db"

REDIS_HOST=localhost
REDIS_PORT=6379
```

### Running

```bash
# Build the core execution engine
npm run build -w @rabbit/core

# Apply database migrations
npm run db:push -w @rabbit/server

# Start the development stack (API server + Web dashboard + Core watcher)
npm run dev
```

- Dashboard: http://localhost:3000
- API Server: http://localhost:3001

---

## Design Decisions

### Why decouple the LLM from execution?

The single most important architectural decision in Rabbit is that the LLM never directly executes anything. It only plans. This means the LLM can run on a completely different machine (or even a local laptop with Ollama) from where the actual browsing, code execution, and desktop interaction happens. This separation provides security isolation, horizontal scalability, and clean failure boundaries.

### Why Zod discriminated unions for action schemas?

Every action the LLM produces must conform to a strict schema before it reaches the Executor. Using Zod discriminated unions on the `type` field means that invalid actions are caught at parse time, not at execution time. This prevents the agent from ever executing a malformed action and provides clear, actionable error messages when the LLM hallucinates an invalid structure.

### Why three separate orchestrators instead of one?

Browser automation (DOM + screenshots + Playwright), sandbox automation (shell commands + file I/O), and desktop automation (screenshots + mouse/keyboard) have fundamentally different input/output modalities. Forcing them into a single abstraction would either over-generalize the interface or create leaky abstractions. Each orchestrator is purpose-built for its environment, and the `MultiEnvOrchestrator` composes them at a higher level.

### Why BullMQ and Redis?

Task execution can take minutes (multiple browser sessions, sandbox processing). Using an in-memory queue would lose state on process restart. BullMQ backed by Redis provides durable task persistence, automatic retries on failure, and the ability to scale workers horizontally without changing the API layer.

### Why multiple LLM providers?

Different deployment contexts have different constraints. Cloud-hosted models (OpenRouter, Groq) provide the highest accuracy and speed but require API keys and incur costs. Local models (Ollama) provide zero-cost, zero-latency, fully private inference but sacrifice accuracy on complex JSON schemas. Rabbit supports all three so that users can choose the right tradeoff for their use case.

### Why Server-Sent Events for telemetry?

The dashboard needs to display real-time agent progress (which step is executing, what action was taken, whether it succeeded). WebSockets would work but add connection management complexity. SSE provides a simple, HTTP-native, unidirectional stream that is sufficient for telemetry and works through standard load balancers and proxies without special configuration.

---

## License

Distributed under the MIT License. See LICENSE for further information.
