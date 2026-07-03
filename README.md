# ⚡ Strata Geopolitical Situation Monitor & Business Agent Hub

Welcome to **Strata**, an advanced, open-source workstation that integrates live geopolitical and macroeconomic signal monitoring, real-time risk reasoning via causal graph RAG engines, and an autonomous multi-agent operational debate hub.

The system continuously screens international news, maps risk cascades, launches collaborative subagent debates to formulate strategic counter-measures, validates compliance against local operational directives, and streams everything in real-time to a dark-themed glassmorphism visual dashboard.

---

## 🏗️ Core Architecture & Flow

Strata is designed for highly coordinated, compliance-guided risk mitigation. Instead of running disjointed or unconstrained LLMs, it aligns multiple specialist agents under a central Orchestrator that reads local SOP files, uses sandbox disk storage as a workspace, and respects Operator boundaries.

```
                          ┌──────────────────────────┐
                          │   Live RSS News Feeds    │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  Background Risk Daemon  │ <─── [Screens Macro/Geopolitical Threats]
                          └─────────────┬────────────┘
                                        │ (Critical Anomaly)
                                        ▼
                          ┌──────────────────────────┐
                          │    Agent Hub Session     │ <─── [Autonomously Spawns Debate]
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  Server Autopilot Loop   │ <─── [Sequentially Orchestrates Turns]
                          └─────┬──────────────┬─────┘
                                │              │
                                ▼              ▼
                    ┌──────────────────────┐ ┌──────────────────────┐
                    │   Subagent SOPs      │ │  Compliance Checks   │
                    │ (Visionary, Seller,  │ │  (EIP-712 / Solana  │
                    │ Producer, etc.)      │ │   Signature Audits)  │
                    └──────────────────────┘ └──────────────────────┘
```

---

## 🌟 Key Platform Modules

### 1. Geopolitical Risk Ingestion Daemon (`src/utils/contentDaemon.ts`)
Runs in the background, systematically polling production XML streams (Macroeconomics, Finance, Energy, Politics).
* **Economic Risk Filter**: Screens incoming items for risk indicators (e.g. *recession, collapse, inflation, sanctions, default, liquidity, contagion*).
* **Autonomous Debates**: On capturing a critical threat, it initializes a new Agent Hub session, posts a detailed System Alert, and launches a background debate to outline strategic countermeasures.

### 2. Multi-Agent Collaboration Room (`src/utils/agentChatManager.ts`)
Coordinates 5 core business subagents executing local Standard Operating Procedures (SOPs):
* **Visionary (SOP-STR-001)**: Formulates strategic priorities, SVAR impact loops, and market decoupling paths.
* **Producer (SOP-OPS-004)**: Checks sprint backlogs, engineering WIP limits, and pipeline metrics.
* **Seller (SOP-SLS-001)**: Coordinates quantitative account lead acquisition, billing setups, and MEDDPICC checks.
* **Controller (SOP-FIN-001)**: Audits financial ledger receipts, tables, and validates Solana x402 compliance signatures.
* **Systematiser (SOP-OPS-001)**: Eliminates operational friction, maps ingestion cycles, and designs graph RAG loops.

### 3. Server-Driven Autopilot Loop
Runs a background orchestration loop on the server. When Autopilot is enabled:
* Subagents debate sequentially, pausing 3 seconds between responses for natural pacing.
* The loop runs autonomously, writing logs and sandbox files to disk, until the Orchestrator yields control to the Operator (`User` turn).
* The Autopilot state persists globally across conversation tabs.

### 4. Real-Time Glassmorphic SSE Dashboard
A dark glassmorphism layout with neon glowing backdrops and static sidebar navigation:
* 🤖 **Agent Hub (Chat)**: View active debates, input Operator queries, summon specific agents, toggle Autopilot, and inspect files written by agents to the sandbox workspace.
* 📡 **Signal Center**: View live RSS signals with expandable full-text article cards and manual risk investigation triggers.
* ⚙️ **Agent Management**: View and modify core agent prompts, roles, and hyper-directives in real-time.
* 💼 **Business Context**: Sync local markdown business rule files to keep the subagents aligned with your organizational strategy.

### 5. Interactive Alert Modals
Real-time browser notifications. When the background Daemon detects a high-risk event, a modal overlay triggers immediately showing the warning details and provides a direct shortcut to **"Go to Hub Debate"** to inspect the live strategic planning.

---

## 🚀 Quick Start

### 📦 Installation
Verify you have Node.js (v18+) and install dependencies:
```bash
npm install
```

### ⚙️ Configuration
Create your environment file:
```bash
copy .env.example .env
```
Populate `.env` with your API keys:
* `DUBSTRATA_API_KEY`: Your key to authenticate against cloud knowledge graphs.
* `SIMULATION_MODE`: Defaults to `true` (runs virtual portfolio to mitigate risk).

### 🏃 Running the Application
Start the concurrently grouped Express backend server, Vite build tracker, and background Daemon:
```bash
npm start
```
Open your browser to **`http://localhost:3000`** to view the dashboard!

---

## 📁 File Structure

```
├── data/
│   ├── agent_chats.json          # Persistent Agent Hub chat histories
│   ├── rss_feeds.json            # Parsed RSS feed cache
│   └── agents/                   # Sandbox workspace directory
│       ├── brain_map.json        # Asset registry tracking files created by agents
│       └── [RoleName]/           # Isolated folder workspaces for individual agents
├── src/
│   ├── index.ts                  # App bootloader starting background loops & Express
│   ├── harness.ts                # Main integration orchestrator
│   ├── utils/
│   │   ├── contentDaemon.ts      # Geopolitical Ingestion Daemon class
│   │   ├── agentChatManager.ts   # Chat session controller & Autopilot loop
│   │   └── eventBroker.ts        # Node EventBroker dispatching SSE frames
│   └── dashboard/
│       ├── server.ts             # Express REST server & SSE stream endpoint
│       └── frontend/             # React SPA (Vite + Tailwind + Lucide Icons)
```

---

## 📄 Open Source License
Distributed under the permissive **MIT License**. Check out [LICENSE](file:///c:/Users/muzik/Documents/GitHub/dubstrata-investigation/LICENSE) for details.
