# 📝 Changelog: Strata Geopolitical Situation Monitor & Business Agent Hub

All notable changes, architectural milestones, and feature implementations for the Strata Geopolitical Situation Monitor & Business Agent Hub will be documented in this file.

---

## [2.0.0] - 2026-07-03

### Added
- **Global Server-Side Autopilot (`src/utils/agentChatManager.ts`)**: Migrated the recursive autopilot loop from the frontend browser execution to the server backend. Enabled background execution of successive agent turns (with 3-second natural reading delays) that persists globally across conversation tabs and runs until subagents yield back to the Operator.
- **Economic Risk Filter & Ingestion (`src/utils/contentDaemon.ts`)**: Realigned the background scraping Daemon to parse incoming RSS feeds for critical macroeconomic and geopolitical risk keywords (recession, sanctions, inflation, debt, yield curves).
- **Autonomous Hub Debates**: The background Daemon now autonomously initializes new conversation sessions, injects structured System Alerts, and launches background Autopilot loops to draft mitigation documents.
- **Real-Time SSE Updates**: Wired SSE channels for `agent_chat_update` and `agent_typing` in the frontend dashboard. The chat bubbles, agent states, and typing indicators now stream and render dynamically in real-time as subagents complete their thinking cycles.
- **Interactive Modal Alerts**: Designed a premium glassmorphic modal overlay in the dashboard which triggers immediately upon risk ingestion and includes a shortcut to jump straight into the corresponding Agent Hub debate.
- **MIT License**: Included a permissive open-source license file in the repository root.

### Removed
- **Decision Vault**: Deprecated and removed the content assets Decision Vault, its API endpoints (`/api/content/assets`), and frontend panels (`VaultZone.tsx`) to focus the workspace entirely on real-time monitoring and active Agent Hub debates.
- **Telemetry Subsystem**: Removed unneeded telemetry API routes and frontend visualization widgets.

### Changed
- **Strata Branding & Identity**: Renamed the project from "Dubstrata" to **Strata** across all source files, layout files, and HTML title tags.
- **Fixed Sidebar Navigation Layout**: Locked the navigation panel to a static, non-collapsible width of `260px` with `flexShrink: 0` to prevent resizing when different tabs are active.
- **Asset Bundle Logo**: Updated the browser tab favicon to dynamically load the high-fidelity Strata logo from `/logo.png`.

---

## [1.1.0] - 2026-05-26

### Added
- **JIT Pending Resilience (`src/dubstrata/client.ts`)**: Implemented a self-correcting wait-and-retry loop in the `queryGraph` client method. If the cloud proxy is running background scraping/crawling cycles and returns `DATA PENDING`, the client logs a warning countdown, pauses for 5 seconds, and automatically retries (up to 4 times) to ensure decisions never fail.
- **Structured Causal Reasoning in Audits**: Upgraded the decision-making engine's reasoning to output rich, structured HTML blocks in the immutable transaction receipts.
- **Deep Telemetry Logging Console Enhancements**: Upgraded console outputs to write comprehensive, beautiful, multiline tool transaction traces containing query parameters, token volumes, latencies, and responses.

### Changed
- **Rapid Validation Sort (`src/polymarket/gammaClient.ts`)**: Reconfigured `GammaClient.fetchMarkets` to prioritize active, unresolved prediction markets closing as soon as possible.
- **Mock Scouter Sort**: Realigned `getMockMarkets()` to return pre-configured markets sorted in ascending order of `endDate` (closest first).
- **README Renewal**: Fully revamped README documentation.

---

## [1.0.0] - 2026-05-25

### Added
- **Strict TypeScript Environment**: Initialized `package.json` and strict compiler, configuring standard Winston logs.
- **Dubstrata MCP Proxy Integration**: Connected stdio proxy to the `@dubstrata/mcp-server@1.0.1` package on NPM.
- **EIP-712 Mandate Compliance Verifier**: Added a digital verifier which recovers and validates typed signatures.
- **SHA-256 Chained Audit Trail Ledger**: Built an append-only JSONL logger recording transaction snapshots with cryptographic chaining.
- **Polymarket Connector Modules**: Integrated live scouter wrappers and simulated portfolio bookkeepers.
- **Premium Glassmorphism Dashboard UI**: Express API backend and Vanilla CSS/JS single-page frontend featuring dark themes, neon radial glowing rings, backdrop blurs, and interactive strategy runners.
