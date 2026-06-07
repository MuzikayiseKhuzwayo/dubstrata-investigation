# Agent Operating Instructions & Guidelines (AGENTS.md)

This document contains repository-level instructions, rules, and style requirements that any autonomous agent, script, or model executing within this harness must strictly follow.

---

## 1. Feedforward Guides & Rules

### 🔍 Causal Single-Source-of-Truth Directive
* **Rule**: All trading, backtesting, or strategic recommendations must use the **Dubstrata MCP** causal graph database as their sole source of causal truth.
* **Outages & Errors**: If the Dubstrata MCP server returns connection errors (e.g., `NameResolutionError`, `HTTPConnectionPool`), the agent must immediately suspend trading activity and place the market on **`HOLD`** with $0.00 allocated. **Do not trade under absolute uncertainty.**

### 🔒 Cryptographic Compliance Mandates
* **Rule**: All transactions must be verified using the digital EIP-712 compliance verifier (`src/dubstrata/mandateVerifier.ts`).
* **Limitations**: Respect all digital signature limits, including `allowedCategories`, `maxPositionSize`, and `dailyLimit`. Any trade violating these boundaries must be blocked and recorded in the audit trail ledger as `BLOCKED_BY_MANDATE`.

### 🛡️ Simulation-Mode Fallback Guard
* **Rule**: Unless `SIMULATION_MODE` is explicitly set to `"false"` in `.env`, all trades must go through the simulated virtual order book (`src/polymarket/clobClient.ts`) to avoid exposing real USDC capital to risk.

---

## 2. Sensor & Feedback Requirements

### 🧪 JSON Schema Validation
* When returning structured decisions (e.g., for backtests or scouting), models must use JSON format.
* **Auto-Correction**: The harness must parse the output. If parsing fails, the harness must loop back, feed the compilation/validation error directly back to the model, and prompt for correction (up to 3 retries).

---

## 3. UI/UX Dashboard Style Architecture
* **Rule**: The Express dashboard uses a custom premium **dark glassmorphism** theme.
* **Aesthetics**:
  - Backgrounds: Dark radial gradients, blurred backdrops (`backdrop-filter: blur(16px)`).
  - Accent Colors: Bright neon indigo (`#6366f1`), neon green (`#10b981`), and danger coral (`#f43f5e`).
  - Reasoning Output: LLM reasoning details must be formatted in styled, legible HTML snippets matching this glassmorphic palette.
