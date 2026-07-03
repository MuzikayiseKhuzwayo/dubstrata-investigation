# Enterprise CDN Capabilities Specification

This document defines the operational capabilities, infrastructure layouts, security controls, and data structures provided to **Dubstrata Enterprise Clients** (e.g., systematic quant hedge funds, asset managers, and institutional risk desks).

The Dubstrata Agentic CDN converts unstructured global public media, prediction market consensus, and sovereign gazette registries into point-in-time, structured alternative data signals optimized for high-frequency consumption by autonomous AI trading swarms.

---

## 1. Core Enterprise Data Products

Enterprise customers gain access to three primary data streams, engineered for high concurrency and deterministic low latency:

### A. The Causal Narrative Knowledge Graph
A multi-relational property graph (persisted inside a cluster-backed ArcadeDB instance) mapping how geopolitical, macroeconomic, corporate, and individual events influence assets and markets.
* **Dynamic Entity Support:** Tracks standard equities and assets (e.g., `TSLA`, `AAPL`, `BTC`, `DOGE`) alongside key market figureheads (e.g., Central Bankers, founders, regulators), geopolitical bodies, and unlisted entities.
* **Narrative Predicates:** Mappings like `COLLABORATES_WITH`, `CONFLICTS_WITH`, `INFLUENCES`, `AMPLIFIES_NARRATIVE`, `REPRESENTS`, `DOWNGRADES_OUTLOOK_FOR`, and `THREATENS_SUPPLY_CHAIN_OF`.
* **Directional Market Impact Signs:** Mapped as `+1` (Bullish / Sentiment Amplification), `0` (Neutral / Benchmark Alignment), and `-1` (Bearish / Risk Expansion).

### B. Live Prediction Market Sensor (Polymarket CLOB)
Aggregates and syncs real-time prediction market consensus as causal sensors to gauge implied probability anomalies against RAG ground-truth:
* **Consensus Sentiment Index (CSI):** A weighted metric scaled from `-100` (Extreme NO) to `+100` (Extreme YES), highlighting crowd-sourced momentum.
* **Participant Conviction Engine:** Ranks orderbook and wallet profiles by capital exposure, win rate, and accuracy:
  $$\text{Weight}_i = \left(\frac{\text{Position Value USD}}{1000}\right) \times (\text{Historical Win Rate})^2 \times (\text{Accuracy Coefficient})$$
* **Ground-Truth Divergence Alerts:** Triggers streaming notifications when crowd-implied probability diverges from ground-truth regulatory facts.

### C. Time-Series Alternative Data Ledger
A Declarative Time-Partitioned PostgreSQL engine optimized for quant ingestion pipelines.
* Exposes historical hourly and daily metrics, price changes, sentiment velocity, and factuality scores.
* Periodically exported in high-performance **Apache Parquet** format via PyArrow and synced directly to client-dedicated Google Cloud Storage (GCS) buckets.

---

## 2. Global API Gateway & Pricing Matrix

All endpoints support universal request tracing, returning a unique `log_id` for audits, and enforce transaction cost deductions from pre-paid USDC client balance ledger accounts in real-time.

| Endpoint | Primary Function | SLA Latency | Cost (USDC) |
| :--- | :--- | :--- | :--- |
| `POST /api/v1/ingest` | Raw document/URL parsing & LLM graph synthesis | $< 5.0\text{s}$ | `$0.050` |
| `POST /api/v1/query` | Vector-traversal Cypher RAG context query | $< 150\text{ms}$ | `$0.005` *(Free on JIT Scrape)* |
| `POST /api/v1/query/intelligence-report` | 10-section structured analyst report synthesis | $< 4.5\text{s}$ | `$0.020` *(Free on JIT Scrape)* |
| `POST /api/v1/query/inference-conviction` | Consensus CSI score & market price divergence | $< 100\text{ms}$ | `$0.010` |
| `POST /api/v1/query/model-future` | Predicts future scenario probabilities based on RAG | $< 250\text{ms}$ | `$0.015` |
| `POST /api/v1/memory` | Write to episodic key-value memory | $< 80\text{ms}$ | `$0.001` |
| `GET /api/v1/memory/{key}` | Read from episodic key-value memory | $< 50\text{ms}$ | `$0.001` |
| `POST /api/v1/feedback` | User rating feedback loop & cache modifier | $< 80\text{ms}$ | `$0.001` |
| `POST /api/v1/trust-report` | Retrieve domain credibility & fallacy score | $< 100\text{ms}$ | `$0.005` |
| `POST /api/v1/historical-timeline` | Pull superseded/historical claims timeline | $< 150\text{ms}$ | `$0.003` |
| `POST /api/v1/entities-by-category` | Entity category filter query | $< 80\text{ms}$ | `$0.001` |
| `POST /api/v1/all-facts` | Retrieve all active claims about an entity | $< 120\text{ms}$ | `$0.004` |
| `POST /api/v1/interaction-hooks` | Autonomous recommendations payload | $< 100\text{ms}$ | `$0.002` |
| `POST /api/v1/find-conflicts` | Contradictory claims audit engine | $< 180\text{ms}$ | `$0.005` |
| `GET /api/v1/alt-data/historical` | Pull raw historical metrics time-series | $< 120\text{ms}$ | `$0.003` |

> [!NOTE]
> **JIT Scraper Billing Protection:** If a query yields no cached graph results and triggers an automatic background scrape, the endpoint forces a charge of **`0.0 USDC`** for that request. Enterprise clients only pay for successful causal retrieval.

---

## 3. Institutional Security Controls

### A. Perimeter & Rate Limiting
* **Cloud Armor Web Application Firewall (WAAP):** Leverages Google Cloud Armor at the edge to inspect incoming traffic and block directory manipulation, command injection, and cross-site scripting (OWASP Core Rule Set).
* **Identity-Based Adaptive Rate Limiting:** Rate limits are keyed to the SHA-256 hash of the client's API key. Enterprise hosts (`enterprise.dubstrata.com`) are routed to dedicated high-frequency instances bypassing standard retail limits (scaling from 100 to 1,000 req/min).

### B. Authentication & Identity Lifecycle
* **B2B Opaque Reference Tokens:** Clients authenticate via high-entropy tokens (`dub_live_...`), separating external identities from internal metadata.
* **Cryptographic Wallet Rotation:** Supports on-demand Solana-style Ed25519 signature verification on `/api/v1/auth/agent/update` with anti-replay UTC challenge nonces to securely migrate agent identity credentials.
* **mTLS Validation Tunnels:** Supports mutual TLS (mTLS) termination, parsing client X.509 certificate fingerprints to assign tenant permissions before opening standard TCP connections.

### C. Data Isolation & Integrity
* **PostgreSQL Row-Level Security (RLS):** Strict RLS policies are enabled across all 13 database tables (e.g. `api_usage_logs`, `x402_transactions`), isolating data fields based on client UUID parameters.
* **Graph Vector Filter Isolation:** All ArcadeDB Cypher queries parameterize input variables and pre-filter vectors matching `(is_private = false OR tenant_id = :tenant_id)`, ensuring zero data leakage or vector index bleed between competing funds.
* **Point-in-Time Signatures:** Every fact node automatically generates a `SHA-256` validation hash representing the source URL, timestamp, and arguments at creation time to prevent database non-repudiation.

### D. Scraping SSRF Mitigations & AI Shield
* **SSRF Network Blocking:** The crawler engine resolves domain IPs prior to crawling, actively rejecting loopbacks (`127.0.0.1`), RFC 1918 private subnets, and cloud metadata ports (`169.254.169.254`). Enforces `https` protocols and drops redirect chains exceeding 3 hops.
* **AI Vulnerability Shield:** Sanitizes crawled text prior to model ingestion to strip adversarial command overrides (e.g., zero-width space deletion, Cyrillic homoglyph translations, Base64 block quarantines).
* **XML Schema Wrapping:** Dynamic crawler data is strictly wrapped inside `<untrusted_crawled_content>` blocks in prompt templates, instructing the LLM to treat inputs exclusively as data rather than instructions.

### E. Redis WebSocket Ticket Handshake & Throttling
* **Ephemeral Connection Tickets:** Clients cannot connect to the WebSocket stream (`/api/v1/ws/alerts`) with raw static tokens. Instead, they must issue a `POST /api/v1/auth/ws-ticket` request using standard authorization headers. The server registers an ephemeral ticket in Redis (`ws_ticket:{ticket_uuid}`) which expires in 10 seconds.
* **Handshake Authentication:** The client passes the ticket via the query parameters (`ws?ticket=<ticket_uuid>`). On connection, the WebSocket gateway resolves the ticket from Redis, extracts the associated tenant credentials, and purges the ticket from Redis immediately to prevent replay.
* **Concurrent Session Throttling:** The connection manager tracks active sessions in Redis using the key structure `ws_active_conn:{tenant_id}`. Enterprise tenants are capped at a maximum of **5 concurrent active WebSocket connections**. Additional connection attempts are dropped with a policy violation alert.

---

## 4. Enterprise Integrations & MCP Client

Every enterprise subscription includes the verified **Model Context Protocol (MCP)** proxy server client:
* **Verified Namespace:** Published under npm organization scope `io.github.MuzikayiseKhuzwayo/dubstrata` as `@dubstrata/mcp-server`.
* **Stealth Integration:** FastMCP compatibility allows Cursor, Claude Desktop, and IDE agents to interact with all 10 custom Graph RAG tools using local Stdio bridging and environment configurations.
* **Custom Tool Interfaces:**
  * `submit_feedback`: Allows algorithmic agents to dynamically rate responses (Scores 1-5) and scale graph node weights.
  * `compile_intelligence_report`: Generates analyst-grade intelligence reports covering Outlooks, Alternative Scenarios, and Intelligence Gaps.
