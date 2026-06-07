# 📝 Changelog: Dubstrata Causal Investment Harness

All notable changes, architectural milestones, and feature implementations for the Dubstrata-MCP and Polymarket AI Trading Agent Harness will be documented in this file.

---

## [1.1.0] - 2026-05-26

### Added
- **JIT Pending Resilience (`src/dubstrata/client.ts`)**: Implemented a self-correcting wait-and-retry loop in the `queryGraph` client method. If the cloud proxy is running background scraping/crawling cycles and returns `DATA PENDING` (or equivalent pending logs), the client logs a warning countdown, pauses for 5 seconds, and automatically retries (up to 4 times) to ensure decisions never fail due to cold-start Graph RAG data.
- **Structured Causal Reasoning in Audits**: Upgraded the decision-making engine's reasoning to output rich, structured HTML blocks in the immutable transaction receipts. Every audit entry now explicitly breaks down:
  1. **📊 Causal Information Analysis**: Decoding the causal pathways found in Dubstrata.
  2. **💡 Meaning & Odds Implications**: Explaining the mispricing margin.
  3. **🎯 Tactical Trading Decision**: Describing why the execution size and action are logically valid.
- **Deep Telemetry Logging Console Enhancements**: Upgraded the WINSON console outputs inside `recordInteraction` to write comprehensive, beautiful, multiline tool transaction traces containing:
  - Exact inputs/query parameters.
  - Estimated token volume counts (estimated characters / 4 rule of thumb) for inputs, outputs, and total.
  - Latency (ms) and cloud API vs. simulated fallback execution states.
  - Snippets of raw output responses (truncated beautifully to 800 characters to prevent console spam).
- **Changelog Tracker**: Added `CHANGELOG.md` to track our progress, milestones, and audit ledger enhancements.

### Changed
- **Rapid Validation Sort (`src/polymarket/gammaClient.ts`)**: Reconfigured `GammaClient.fetchMarkets` to prioritize active, unresolved prediction markets closing as soon as possible. Enabled `order: 'endDate'` and `ascending: true` in Gamma API parameters, backed by a robust local pre-filter (removing past/resolved dates) and a local `new Date().getTime()` sorting loop.
- **Mock Scouter Sort**: Realigned `getMockMarkets()` to return pre-configured markets sorted in ascending order of `endDate` (closest first).
- **README Renewal**: Fully revamped `README.md` to provide comprehensive architecture documentation, setup instructions, quick-start scripts, and file structures.

---

## [1.0.0] - 2026-05-25

### Added
- **Strict TypeScript Environment**: Initialized `package.json` and strict `tsconfig.json` compiler, configuring standard Winston logs.
- **Dubstrata MCP Proxy Integration (`src/dubstrata/client.ts`)**: Connected stdio proxy to the `@dubstrata/mcp-server@1.0.1` package on NPM. Managed sanitization to ensure environment variables explicitly prioritize live cloud connectivity (`https://api.dubstrata.com`).
- **EIP-712 Mandate compliance Verifier (`src/dubstrata/mandateVerifier.ts`)**: Added a digital verifier which recovers and validates typed signatures. Includes active demo signatures protecting against budget or category overruns.
- **SHA-256 Chained Audit Trail Ledger (`src/dubstrata/auditLogger.ts`)**: Built an append-only JSONL logger recording transaction snapshots. Implemented cryptographic chaining where every block dynamically hashes its own parameters alongside the previous block's SHA-256 hash.
- **Polymarket Connector Modules (`src/polymarket/`)**:
  - `gammaClient.ts`: Live event/volume/odds scouter wrapper.
  - `clobClient.ts`: Simulated bookkeeper managing virtual pUSD trades and USDC allowances.
- **Historical Backtesting Simulator (`src/backtest/runner.ts`)**: Core player playing 5 notable late-2024 prediction events, prompting strategy decisions, checking mandates, and chaining ledger receipts.
- **Premium Glassmorphism Dashboard UI (`src/dashboard/`)**: Express API backend and Vanilla CSS/JS single-page frontend featuring dark themes, neon radial glowing rings, backdrop blurs, and interactive strategy runners.
- **Index Entrypoint (`src/index.ts` & `src/harness.ts`)**: Main boot script spinning up Express and connecting the background trading harness concurrently.
