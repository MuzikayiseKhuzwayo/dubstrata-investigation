# ⚡ Dubstrata MCP & Polymarket Trading Agent Harness

Welcome to the **Dubstrata Causal Investment Harness**, a high-fidelity research and execution playground that evaluates the absolute analytical power of the **Dubstrata MCP** causal graph-RAG framework. 

This repository acts as a highly compliant, non-repudiable paper-trading fund manager. It scouts prediction markets on Polymarket, executes programmatic causal analysis using Dubstrata's deep knowledge graph tools, validates positions against cryptographically signed digital mandates, chains audit trails with immutable hashes, and streams everything in real-time to a premium dark-themed glassmorphism visual dashboard.

---

## 🏗️ Core Architecture & Causal Engine

The harness enforces a rigid, strict architectural separation of concerns. Instead of delegating random execution to black-box LLMs, **Dubstrata MCP acts as our absolute, single source of causal truth.**

```
                     ┌──────────────────────────┐
                     │  Polymarket active Scout │
                     └─────────────┬────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │   Dubstrata Graph RAG    │ <─── [ONLY Source of Causal Truth]
                     └─────────────┬────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │ Fund Manager Decision    │
                     └─────────────┬────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │ EIP-712 Mandate Check    │
                     └─────────────┬────────────┘
                                   │
                     ┌─────────────┴────────────┐
             [Passed]│                  [Failed]│
                     ▼                          ▼
       ┌────────────────────────┐    ┌────────────────────────┐
       │ Immutable Audit Chain  │    │ Mandate Block logged   │
       │    (SHA-256 Ledger)    │    │   (Chained Block)      │
       └───────────┬────────────┘    └────────────────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ CLOB simulated Order   │
       │ (10,000 pUSD virtual)  │
       └────────────────────────┘
```

---

## 🌟 Premium Features

### 1. Causal Graph Investigation (`src/dubstrata/client.ts`)
Connects via STDIO proxy to the published `@dubstrata/mcp-server@1.0.1` package on NPM.
* **Deep Telemetry Logging**: Records every single interaction (exact JSON query parameters, response bodies, token sizes, compression ratios, and latencies) directly to `./data/mcp_interactions.jsonl` and formatted console logs.
* **JIT Pending Resilience**: Automatically checks if the cloud proxy returns `DATA PENDING` (due to live web-crawling/scraping loops), logging a countdown and retrying up to 4 times with a 5-second sleep to ensure we never make decisions on empty context.

### 2. Soonest-Closing Market Prioritization (`src/polymarket/gammaClient.ts`)
Fetches unresolved active markets directly from the **Polymarket Gamma API**, requesting and sorting them locally in ascending order of `endDate` (closest first). This enables rapid validation of our agent's causal predictions as markets resolve quickly.

### 3. EIP-712 Compliance Mandate Verifier (`src/dubstrata/mandateVerifier.ts`)
Before any position is proposed, the harness recovers and validates typed EIP-712 compliance mandates cryptographically signed by the principal's private key. The verifier ensures limits like `maxPositionSize`, `dailyLimit`, and `allowedCategories` (e.g., Finance, Politics, General) are strictly honored.

### 4. Non-Repudiable Cryptographic Ledger (`src/dubstrata/auditLogger.ts`)
Every compliance check, trade decision, and outcome is saved in an append-only JSONL audit ledger (`./data/audit_logs.jsonl`). Each ledger block is mathematically chained to the previous block using SHA-256 hashes, creating a fully audit-verifiable record.
* **Structured Causal Reasonings**: Every audit block includes beautiful HTML reasoning segments detailing:
  1. **📊 Causal Information Analysis**: Decoding Dubstrata's graph-RAG evidence.
  2. **💡 Meaning & Odds Implications**: What this means for contract pricing.
  3. **🎯 Tactical Trading Decision**: The logical action for executing the position.

### 5. High-Aesthetic Glassmorphism Dashboard (`src/dashboard/`)
Built with modern dark space variables, radial glowing orbs, blurred backdrops, and neon indigo accenting. Exposes six beautiful real-time tabs:
- 📊 **Portfolio Overview**: Displays active open positions, entry costs, and virtual returns.
- 🔍 **Polymarket Scout**: Lists live, soonest-closing contracts.
- 📜 **Dubstrata Mandates**: Shows cryptographic digital mandates and EIP-712 compliance statuses.
- 🔒 **Audit Trail Chain**: Connects all compliance blocks, displaying their SHA-256 hashes and structured HTML reasoning boxes.
- ⚡ **Backtesting Engine**: Simulates late-2024 historical markets, running causal evaluations to test ROI and win rates.
- 🔌 **MCP Telemetry**: Interactive JSON browser showing full queries, token usage, latencies, and responses.

---

## 🚀 Quick Start

### 📦 Installation
Verify you have Node.js (v18+) and install dependencies:
```powershell
npm install
```

### ⚙️ Configuration
Create your environment file:
```powershell
copy .env.example .env
```
Populate `.env` with your keys:
- `DUBSTRATA_API_KEY`: Your live tenant key to connect to production cloud `https://api.dubstrata.com`.
- `SIMULATION_MODE`: `true` (runs virtual pUSD portfolio to eliminate risk).

### 🏃 Running the Harness & Dashboard
Start the concurrently grouped Express visualizer and agent loop:
```powershell
npm start
```
Open your browser to **`http://localhost:3000`** to view the stunning dashboard!

### 📊 Running Dry-Run Investigations
To run a standalone causal research and compliance verification trace on the Fed September 2026 meeting contract:
```powershell
npm run research-trade
```
This script will output the full telemetry of the MCP calls, estimated token counts, and chain a mathematical audit receipt on your screen!

---

## 📁 File Structure

```
├── data/
│   ├── audit_logs.jsonl          # SHA-256 mathematically chained audit block ledger
│   ├── mcp_interactions.jsonl    # Comprehensive MCP query, response, and token logs
│   ├── portfolio.json            # Virtual bookkeeper storage
│   └── backtest_runs.json        # Archival log of historical strategy runs
├── src/
│   ├── dubstrata/
│   │   ├── client.ts             # Dubstrata MCP proxy stdio client with retries
│   │   ├── auditLogger.ts        # Cryptographic SHA-256 block chain verifier
│   │   ├── mandateVerifier.ts    # EIP-712 typed signature verifier
│   │   └── types.ts              # System TS types
│   ├── polymarket/
│   │   ├── gammaClient.ts        # Live soonest-closing scouter
│   │   └── clobClient.ts         # Simulated portfolio manager
│   ├── backtest/
│   │   └── runner.ts             # Late-2024 historical simulator
│   ├── dashboard/
│   │   ├── server.ts             # Express API provider
│   │   └── public/               # Premium HTML/CSS/JS frontend visualizer
│   ├── index.ts                  # App main launch loop
│   └── harness.ts                # Main orchestrator linking scout, graph, and execution
└── tsconfig.json                 # TypeScript strict compiler config
```
