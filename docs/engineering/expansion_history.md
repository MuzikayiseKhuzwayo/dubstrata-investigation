# Dubstrata: Phase Expansion History

This document consolidates the specifications, projects, and development roadmaps across all previous expansion phases of the Dubstrata Causal Financial CDN.

---

## Phase 2: Core Scalability & Automated State Synchronization

### 1. Demand-Driven Headless Crawlers (Resource Optimization)
* **Goal**: Optimize computational resources by driving ingestion based on actual demand (agent search volume or live trend data) rather than blind periodic cron jobs.
* **Action**: Implement an analytics and queuing layer that monitors `query_graph` failures and external API trend signals.
* **Integration**: Instead of continuously scraping the same sites, the crawler is directed by a priority queue. If an agent repeatedly searches for an entity that lacks density, or if online trends indicate a new topic is highly relevant, the headless crawler is securely deployed to gather context specifically for that domain.

### 2. Just-In-Time (JIT) Knowledge Ingestion
* **Goal**: Ensure the Graph RAG is self-healing. If an agent queries for a concept that does not exist in the database, the system should instantly fetch the answer, ingest it, and return the result within the same query lifecycle.
* **Action**: Build an automated fallback handler in `core/mcp_server.py`.
* **Integration**: When `query_graph` returns "No relevant context found", the MCP server will immediately trigger a Wikipedia API search (or DuckDuckGo scrape) for the query, pipe the text through `run_extraction()`, map it to the database, and then re-run the Cypher retrieval. This makes the database autonomously self-expanding.

### 3. Temporal Graph Versioning (Memory States)
* **Goal**: Allow the graph to hold context on previous states of a document, rather than destructively overriding or conflicting with existing nodes.
* **Action**: Transition from a purely static graph to a Temporal Knowledge Graph.
* **Integration**: 
  * Add `valid_from` and `valid_to` properties on `[:CLAIMED_IN]` and `[:RELATES_TO]` edges. 
  * When a crawler detects a website update, instead of deleting the old Claims, we cap their `valid_to` timestamp and insert the new Claims with the current timestamp.
* **Outcome**: Agents can query the "current" state of the world, or ask "What did this document claim last week?", creating true historical semantic memory.

### 4. Advanced MCP Drill-Down Tools
* **Goal**: Provide agents with granular tools to surgically interact with specific parts of the graph, rather than relying solely on the broad `query_graph` vector search.
* **Action**: Expand `core/mcp_server.py` with specialized endpoint functions.
* **Integration**: 
  * `get_interaction_hooks(url: str)`: Directly fetches actionable hooks for a specific domain to trigger agentic workflows.
  * `drill_down_facts(entity_name: str)`: Bypasses vector search to pull all `AtomicFact`s explicitly connected to a specific `Entity`.
  * `check_security_alerts(domain: str)`: Allows an agent to check if a source has previously triggered injection or hostility alerts before trusting its data.

### 5. Cloud Database Migration
* **Goal**: Transition ArcadeDB from a local Docker container to a globally accessible, highly available cloud environment.
* **Action**: Deploy ArcadeDB to a cloud provider (e.g., AWS EC2, DigitalOcean Droplet, or Kubernetes cluster).
* **Integration**: Update the `.env` with the production `ARCADEDB_URI` (ensure it uses `https://` for secure Basic Auth). Ensure `REDIS_HOST` and `REDIS_PORT` are configured so the Headless Crawler and MCP Server can communicate across cloud boundaries. Ensure basic authentication, IP whitelisting, and SSL are configured to protect the exposed HTTP and Bolt ports.

### 6. Asynchronous Event Webhooks
* **Goal**: Trigger downstream agent workflows the moment a substrate is refined.
* **Action**: Implement a webhook dispatcher in the ingestion pipeline.
* **Integration**: Whenever the Headless Crawler ingests a new `Substrate` that contains a `Security Alert` or a high-priority `Interaction Hook`, an event is fired to a webhook URL. This can immediately wake up an external Agent to act on the hook or alert an admin channel.

---

## Phase 3: SaaS Expansion Plan (The B2D Transition)

To effectively prospect, sell, and build a business around Dubstrata, it must transition from a powerful local repository into a Developer-Facing SaaS (B2D) and an Ecosystem-Integrated Agentic Tool. 

Because your product targets developers, AI architects, and autonomous agents, your go-to-market (GTM) strategy must speak their language: API-first, highly documented, and clearly demonstrating ROI (Token Arbitrage).

### Project 1: Core API & Multi-Tenant Infrastructure
* **Task 1.1: FastAPI Cloud Wrapper**
  * Stand up a FastAPI application using Uvicorn to serve as the external entry point.
  * Implement `/api/v1/ingest`: Accepts a URL or raw text, instantly triggers `run_extraction`, and returns a Job ID or the completed Substrate.
  * Implement `/api/v1/query`: Accepts a user query, triggers `retrieve_context`, and returns the exact dense context payload.
  * Expose the 6 advanced Drill-Down tools as distinct REST endpoints (e.g., `/api/v1/trust-report`, `/api/v1/historical-timeline`).
* **Task 1.2: Multi-Tenancy Graph Architecture (COMPLETED)**
  * ArcadeDB does not natively segment users out of the box. Update the Cypher queries in `db_writer.py` and `retriever.py` to require and enforce a `tenant_id` property on every `Document`, `Claim`, and `Entity` node.
  * Ensure Vector Indexes (`vectorNeighbors`) apply post-filters for `tenant_id` so one customer's agent cannot query another customer's knowledge graph.
  * Pass `tenant_id` securely from the FastAPI middleware down through the `mcp_server.py` and extraction engines.
* **Task 1.3: Scalable Worker Deployment**
  * Deploy the `ARQ` Worker on a high-memory compute instance (e.g., AWS EC2 or Render Background Worker).
  * Secure the Redis instance using ACLs/TLS so the FastAPI server and the Worker can safely communicate across the cloud.
  * **Horizontal Scaling Architecture**: Deploy multiple identical Worker Droplets/EC2 instances pointing to the centralized Redis broker. This allows ARQ to automatically load-balance micro-tasks (like `scrape_url`), scaling web scraping capabilities infinitely based on demand.

### Project 2: The Web3 Billing & Authentication Layer (x402 Micropayments)
* **Task 2.1: API Key Management & User Auth**
  * Stand up a lightweight relational database (e.g., PostgreSQL/Supabase) strictly for User Management. *Do not store users or API keys in the ArcadeDB knowledge graph.*
  * Build an API Key generation system using standard prefixes (`dub_live_...`) and secure hash storage (Argon2/bcrypt).
  * Build a FastAPI Middleware dependency (`Depends(verify_api_key)`) to intercept and authorize all incoming `/api/v1/` requests.
* **Task 2.2: The x402 Solana Micropayment Gateway**
  * Implement the `x402` (HTTP 402 Payment Required) protocol inside the FastAPI middleware. If an unauthenticated Agent pings the API, return a `402` error containing a Solana wallet address and the exact USDC price for the query.
  * Build a high-speed Blockchain Listener (using Helius Webhooks or a native Solana RPC). The listener monitors the Dubstrata wallet for incoming USDC transactions and instantly logs the cryptographic receipt to the database.
  * Implement cryptographic receipt verification. When an Agent pays the invoice and retries their query with the transaction hash, FastAPI instantly verifies the hash and releases the Graph RAG data.

### Project 3: The Hosted MCP Gateway
* **Task 3.1: FastMCP SSE (Server-Sent Events) Deployment**
  * The current `mcp_server.py` uses standard I/O (`stdio`), which requires the agent to run the Python script locally. You must convert the FastMCP server to use an SSE Transport over HTTP.
  * Bind the SSE FastMCP server into the FastAPI app routing (`/sse` and `/messages`), secured behind the API Key Middleware.

### Project 4: Developer Portal & Marketing
* **Task 4.1: The Landing Page & Dashboard**
  * Buy a domain (`dubstrata.com` or `.dev`). Build a dark-mode landing page focusing on the "Anti-Raw Text" crusade and Token Arbitrage.
  * Build a dynamic ROI Calculator: "If your agent reads 100 pages/day = $X in OpenAI tokens. Using Dubstrata = $Y. Savings: 95%."
  * Implement a developer dashboard where users can generate their API keys, view their graph ingestion metrics, and check their Stripe usage limits.
* **Task 4.2: World-Class Documentation**
  * Use GitBook or Mintlify to build API documentation.
  * Provide copy-paste cURL requests, code snippets, and clear visualizations of the `Substrate` JSON schema.

### Project 5: Ecosystem Integration (Agent Availability)
* **Task 5.1: Publish Client SDKs**
  * Open-source a `dubstrata-client` for Python (PyPI) and TypeScript (npm). This package acts as a clean wrapper around your API.
  * Write and publish official plugins for LangChain (`DubstrataRetriever`) and LlamaIndex (`DubstrataGraphStore`).
* **Task 5.2: MCP Directories & Custom GPTs**
  * Submit Dubstrata's hosted SSE endpoint to MCP directories (Smithery.ai, MCP Registry).
  * Build a public "Dubstrata Research Agent" Custom GPT in the OpenAI Store that acts as a lead-generation tool, demonstrating the self-healing Graph RAG capabilities.

---

## Phase 4: The "Permanent Layer of Truth" Expansion Plan

### Project 1: Episodic Memory KV Store (The "Agent State" Layer)
* **Concept**: Graph RAG is for understanding the world (Semantic Knowledge). But agents also need to remember *themselves* (Episodic Memory & State). Forcing an LLM to extract a 15-character API key or a chat transcript is a waste of tokens.
* **Subtask 1.1**: Build a new `/api/v1/memory` endpoint that bypasses the Gemini extraction pipeline entirely.
* **Subtask 1.2**: Allow agents to drop raw JSON payloads (e.g., `{"stripe_key": "sk_test_123", "last_user_intent": "angry"}`) directly into ArcadeDB as a `MemoryStore` node.
* **Subtask 1.3**: Link these nodes strictly to `tenant_id`. Agents can now use Dubstrata as a lightning-fast Key-Value store for their internal brain state, unifying their Knowledge and Memory into a single backend API.

### Project 2: Active Graph Synthesis (The "Sleep Cycle")
* **Concept**: Right now, Dubstrata ingests facts continuously. Over months, conflicting facts from different sources will accumulate. The graph needs to organize itself without being asked.
* **Subtask 2.1**: Build an autonomous background daemon that activates during low-traffic server hours (The "Sleep Cycle").
* **Subtask 2.2**: The daemon traverses the graph, identifies clusters of Claims linked to the same Entity, and feeds them to an LLM to evaluate for contradictions or redundancy.
* **Subtask 2.3**: The LLM merges these clusters into a single, highly dense `TruthNode` with a calculated `confidence_score` based on source trust, significantly optimizing the graph density for future queries.

### Project 3: Sub-Agent RBAC (Role-Based Access Control)
* **Concept**: A single enterprise tenant (like "Globex Corp") doesn't just have one agent. They have a fleet of agents (Sales Agent, DevOps Agent, HR Agent). They need granular data compartmentalization.
* **Subtask 3.1**: Expand the Supabase schema to include an `agent_id` beneath the `tenant_id`.
* **Subtask 3.2**: Introduce "Sub-graph permissions" in the `retriever.py` Cypher queries.
* **Subtask 3.3**: The HR Agent can query the `Employee Salaries` sub-graph, while the Sales Agent is blocked, but both can query the overarching `Globex Corp` private graph and the Global Public graph.

### Project 4: Developer Portal & Marketing (The MVP Finish Line)
* **Subtask 4.1**: Build a Next.js/React frontend dashboard (`dubstrata.com` or `.dev`).
* **Subtask 4.2**: Implement Supabase Auth UI on the frontend so users can register, view their API keys, and track their usage logs.
* **Subtask 4.3**: Build a dynamic ROI Calculator: "If your agent reads 100 pages/day = $X in OpenAI tokens. Using Dubstrata = $Y. Savings: 95%."
* **Subtask 4.4**: Finalize the Stripe (or Paddle/LemonSqueezy) integration on the frontend so users can enter their credit cards to un-revoke their `api_keys`.

### Project 5: Chain-Agnostic Web3 Payment Middleware (The Omnichain Gateway)
* **Subtask 5.1**: Integrate a Cross-Chain Intent Protocol (like LayerZero, Across, or a custom Axelar middleware).
* **Subtask 5.2**: When an agent requests data, the `402 Payment Required` response provides not just a Solana address, but an Omnichain Intent payload. The agent can pay with USDC on *any* EVM or SVM chain.
* **Subtask 5.3**: The Web3 Middleware catches the payment event on the origin chain (e.g., Base), validates the cryptographic proof, instantly grants the Agent API access, and asynchronously bridges the USDC to our main Dubstrata Treasury wallet. This creates a completely frictionless, chain-agnostic monetization layer.

### Project 6: Hybrid Credit-Based Monetization & Friction Arbitrage
* **Subtask 6.1**: Enhance the `402 Payment Required` message to explicitly include a registration link (`https://dubstrata.com/register`). This hints to anonymous Agents (and the humans monitoring their logs) that they can bypass the per-query x402 friction by subscribing for an API Key.
* **Subtask 6.2**: Registered tenants use a credit-based dashboard (paying via FIAT or USDC top-ups). Every API call decrements their balance.
* **Subtask 6.3**: When a tenant's credits hit `0`, their API Key is temporarily suspended. Instead of throwing a generic `401 Unauthorized`, the middleware defaults them back into the `402 Payment Required` state! The Agent can either autonomously pay the x402 micropayment to keep the workflow alive, or notify its developer to top up their API dashboard.
* **Subtask 6.4**: Implement rate limiting and IP blocking for agents who repeatedly spam the x402 gateway with invalid or fake transaction signatures, preventing malicious attacks designed to overwhelm the on-chain RPC node.

### Project 7: Agent-Native Web3 Subscriptions (Autonomous Auth Edge)
* **Subtask 7.1**: Create a dedicated `/api/v1/auth/provision` endpoint (The Autonomous Auth Edge).
* **Subtask 7.2**: Agents send a payload containing an on-chain transaction hash (e.g., from Solana or Base) proving they transferred a bulk sum of USDC (e.g., 50 USDC) to the Dubstrata treasury.
* **Subtask 7.3**: The endpoint verifies the transaction hash on-chain, reads the transferred amount, and automatically generates (or tops up) a dedicated `api_key` for that specific agent. The system maps the USDC value directly to an internal credit balance, allowing the agent to self-subscribe and manage its own runtime economics indefinitely.

### Project 8: Recursive Knowledge Expansion (Hourly Deep Scrape)
* **Subtask 8.1**: Build a recursive hourly background daemon that queries the graph for newly created `Entity` nodes or `[:RELATES_TO]` edges that lack sufficient contextual depth (e.g., nodes with fewer than 3 inbound claims).
* **Subtask 8.2**: The daemon automatically dispatches these "orphan" or "shallow" entities to the Headless Crawler.
* **Subtask 8.3**: The crawler executes deep scrapes of highly relevant content, ingests the new intelligence, and attaches the resulting claims and context fragments directly to the original nodes. This creates a continuously expanding, self-densifying Knowledge Graph that autonomously learns about newly discovered concepts without human prompting.

### Project 9: Full-Scale Security Audit & Red Teaming (Post-Setup Validation)
* **Subtask 9.1**: Conduct a full-scale audit of all vulnerable points, including the FastAPI cloud gateway, Supabase database rules, ArcadeDB cypher queries, and crawler background jobs.
* **Subtask 9.2**: Deploy adversarial AI agents to execute red teaming exercises. Simulate attacks designed to bypass RBAC (Sub-Agent Role-Based Access), exploit the Web3 micropayment layer, or inject malicious payloads during JIT scraping.
* **Subtask 9.3**: Implement automated security regression tests, strict rate-limiting on payment verification edge nodes, and anomaly detection to flag unnatural graph densification activities.

### Project 10: Autonomous Tenant Registration (Agent-Driven Onboarding)
* **Subtask 10.1**: Build a new programmatic endpoint `/api/v1/auth/tenant/register` that allows agents to pass essential human/tenant credentials (e.g., organization name, billing email) to bootstrap an account.
* **Subtask 10.2**: Ensure the registration pipeline immediately generates an initial `tenant_id` and allows the agent to simultaneously create an `agent_id` record linked to it, fully bypassing the web dashboard UI.
* **Subtask 10.3**: Implement an asynchronous email loop where the human tenant receives a confirmation or "claim account" link to solidify the setup and take ownership of billing, while the agent proceeds uninterrupted in the meantime.
* **Subtask 10.4**: Institute strict checks (e.g., domain verification, IP filtering, or Web3 wallet signatures) on the agent-driven onboarding endpoint to prevent automated creation of thousands of spam tenant accounts.

### Project 11: Identity Lifecycle & Wallet State Management
* **Subtask 11.1**: Implement endpoints (e.g., `/api/v1/auth/agent/update`) that allow an agent to securely rotate its associated wallet address or public key. This requires a cryptographic proof of ownership from both the old and new identity sources.
* **Subtask 11.2**: Create an immutable log within Supabase (or ArcadeDB) that tracks all state changes for an `agent_id`. If an agent changes its wallet, we must retain the historical linkage to prevent evasion of bans or unpaid balances.
* **Subtask 11.3**: Develop middleware hooks that trigger whenever an identity change occurs. For instance, if a wallet address is rotated, automatically re-verify the new wallet's balance or credit history to enforce continuous payment compliance.
* **Subtask 11.4**: Build protocols for agents to autonomously revoke compromised payment sources or keys, and establish a secure recovery flow that leverages the parent human `tenant` as the ultimate fallback authority.

---

## Phase 5: The "Agentic Feedback & Demand Signaling" Expansion Plan

### Project 1: Full-Spectrum Request Tracing & Feedback Loop
* **Subtask 1.1**: Implement comprehensive telemetry for every incoming request. We will log the raw query, the retrieved graph context, the LLM synthesized response, and the final output payload.
* **Subtask 1.2**: Generate a unique `trace_id` for every query. This ID will be appended to the final response payload returned to the agent.
* **Subtask 1.3**: Expose a new `/api/v1/feedback` endpoint. Agents can submit a payload containing the `trace_id` and a feedback score (e.g., `1-5` or `helpful/unhelpful`, plus optional reasoning).
* **Subtask 1.4**: Build an internal analytics view linking trace payloads to agent feedback, allowing the core team to continuously refine the RAG retrieval tuning, prompt engineering, and context synthesis.

### Project 2: Query Encoding & Intent Graphing (Demand Signaling)
* **Subtask 2.1**: Pass every incoming agent query through the `text-embedding-004` model.
* **Subtask 2.2**: Store the embedded queries as `QueryNode` entities in ArcadeDB. Link these nodes to the `Entity` or `Claim` nodes that were ultimately retrieved to satisfy them.
* **Subtask 2.3**: Use the embedded `QueryNode` database as a blazing-fast semantic cache layer. If a new query mathematically matches a historical query (e.g., > 0.98 cosine similarity), we can bypass the deep graph traversal and serve the cached synthesized response.
* **Subtask 2.4**: Analyze clusters of `QueryNodes` that return poor results or trigger extensive background foraging. This creates an "Interest Heatmap," highlighting exactly what knowledge gaps are currently frustrating our agentic users, allowing us to actively prioritize manual or targeted crawler expansion in those specific sectors.

### Project 3: Agent Identity Verification & Tracking
* **Subtask 3.1**: Develop a system to cryptographically sign or consistently "fingerprint" incoming agent requests based on their origin, configuration, or a provisioned API key specific to the agent instance, not just the parent tenant.
* **Subtask 3.2**: Establish a dedicated logging or ledger system that immutably records critical actions taken by specific verified agents, forming the basis for audit trails and reputation tracking.
* **Subtask 3.3**: Research and draft a technical architecture document detailing how to integrate an advanced, potentially blockchain-based or decentralized identifier (DID) system for agent authentication once standard tracking becomes insufficient.
* **Subtask 3.4**: Implement rate limiting, anomaly detection, and automated suspension protocols keyed to the agent's unique identity to isolate erratic or unauthorized behavior without impacting the parent tenant's other services.

### Project 4: Deep Research & Causal Intelligence Report Synthesis
* **Subtask 4.1**: Define a structured JSON response schema for a new `/api/v1/query/intelligence-report` (or `/api/v1/intelligence-report`) endpoint. This report will be programmatically compiled from deep graph lookups and advanced LLM context synthesis, returning the 10 mandatory sections: Bottom Line Up Front (BLUF), Purpose and Scope, Background and Context, Key Findings, Source Evaluation, Analysis and Interpretation, Threat and Risk Assessment, Information Gaps, Predictive Outlook, Actionable Recommendations.
* **Subtask 4.2**: Design and test a dedicated system prompt inside `prompts/intelligence_report.md` instructing `gemini-2.5-pro` to synthesize this report from rich graph sub-networks, ensuring a neutral, highly formal, analyst-grade tone.
* **Subtask 4.3**: Connect the report generator directly to our JIT crawling infrastructure. If the internal knowledge graph is missing background information on the requested topic, the system will trigger a deep, multi-tier passive/active crawl, save the findings, and compile the report on-the-fly.
* **Subtask 4.4**: Create automated unit tests inside `tests/test_intelligence_reports.py` checking the completeness, schema constraints, and domain-trust weights of all 10 intelligence report sections.

### Project 5: High-Performance Architectural Foundations & Optimizations
* **Subtask 5.1**: Evolve all outbound network operations—including our Open-Meteo weather service (`core/weather_service.py`), Wikipedia retrievers, and headless stealth crawlers (`core/worker.py`)—to utilize persistent TCP connection pooling (e.g., `httpx.AsyncClient` or a global shared `requests.Session` thread pool). This reduces roundtrip handshakes and TLS negotiation delays from $O(N)$ down to $O(1)$ reused sockets.
* **Subtask 5.2**: Integrate a Redis-backed or in-memory TTL caching layer for the `resolve_coordinates` function inside the weather service. Because geographical coordinates of cities are completely static, caching resolved location metadata completely eliminates redundant external Geocoding network calls for repetitive global queries.
* **Subtask 5.3**: Refactor the graph database writer (`core/db_writer.py`) to compile multiple individual Cypher and SQL mutations into a single transactional multi-command payload. Grouping entity, relationship, and claim operations into a single POST request reduces network transaction roundtrips between the API and ArcadeDB from $O(N)$ sequential operations to a single $O(1)$ batch write, dramatically lowering write latencies.
* **Subtask 5.4**: Refactor Stage 2 vector searches (`retrieve_context` in `core/retriever.py`) to push `tenant_id` and security RLS constraints directly into ArcadeDB's `vectorNeighbors` search queries using index pre-filtering parameters. Pushing filters down to the index lookup engine avoids retrieving out-of-scope candidate vectors, reducing the Python post-filtering overhead and lowering memory working sets under heavy concurrency.
* **Subtask 5.5**: Perform a systematic latency-reduction sweep across the critical query and ingestion paths: Gemini Context Caching, Model Router Tiering, Graph Property Indexing, and Lightweight Graph Serialization.

### Project 6: Hybrid Causal-Quantitative Integration (yfinance & Binance)
* **Subtask 6.1**: Create a new module `core/financial_service.py` to programmatically retrieve real-time and historical financial data from Yahoo Finance (`yfinance`) and Binance.
* **Subtask 6.2**: Refactor `retrieve_context` in `core/retriever.py` to parse incoming queries and retrieved graph claims for public ticker symbols and map them to corresponding exchange symbols.
* **Subtask 6.3**: Synchronously retrieve the active price indicators in the RAG thread pool and inject a standardized `[MARKET PRICE ACTION]` block directly into the flat string RAG context returned to the synthesis engine.
* **Subtask 6.4**: Expand the platform's universal JSON response schema in `main.py` and `mcp_server.py` to include a dedicated `"price_action"` payload key.
* **Subtask 6.5**: Write automated integration checks inside `tests/test_financial_integration.py` to verify coordinates, Forecast vs. Live Binance API calls, mock offline yfinance history routing, and response schemas.

---

## Phase 6: Advanced Causality & On-Chain Scale

### 1. Multi-Modal Causal Synthesizer (SEC Charts, PDF Ingest & Earnings Audios)
* **Goal**: Extend the core extraction pipeline to ingest and parse multi-modal inputs, including PDF charts (flowcharts, tables, balance sheets) and audio recordings of corporate earnings calls or Federal Reserve speeches.
* **Proposed Changes**:
  * **Modify `core/extract_engine.py`**:
    * Support passing image/binary files directly to Gemini 2.5 Flash/Pro Vision models.
    * Parse diagrams, visual trendlines, and causal flowchart hierarchies into directional graph claims.
    * Integrate an asynchronous audio transcript processing service (e.g., Whisper API or Gemini native audio) to map figurehead speech inflection and raw text to causal vectors.

### 2. Cross-Tenant Federated Graph Synthesis & Zero-Knowledge Private Matching
* **Goal**: Allow secure, cross-tenant intelligence sharing and overlapping query resolution without exposing raw, sensitive document contents or leaking proprietary private trade strategies.
* **Proposed Changes**:
  * **Modify `core/retriever.py`**:
    * Generate secure cryptographic hashes and anonymized vector embeddings of claims, entities, and exposed assets.
    * Implement a secure private matching protocol using Zero-Knowledge (ZK) bloom filters or homomorphic vector comparisons.
    * Enable agent swarms to discover if another tenant has matching causal vectors, facilitating federated intelligence networks while fully preserving private datarooms.

### 3. Solana Pay Streaming Micropayments (x402 Phase II Gateway)
* **Goal**: Shift from the manual, single-signature receipt clearing system to continuous, sub-second micropayment streaming for autonomous trading agents.
* **Proposed Changes**:
  * **Modify `main.py`**:
    * Integrate Solana Pay payment links and state-channel structures (like helium or custom devnet micro-payment loops).
    * Allow agents to open payment channels and stream USDC credits on a per-token basis (pay-as-you-retrieve).
    * Deduct streamed values dynamically from the Supabase PG billing cache in real-time, matching transaction speeds to high-frequency agent decision cycles.

### 4. Real-Time Macro Shock Simulator & Narrative Stress-Testing Engine
* **Goal**: Build an advanced causal simulator that lets agents model the propagation of macro shocks (e.g., central bank rate changes, supply-chain tariff defaults, sovereign debt restructurings) across the global property graph.
* **Proposed Changes**:
  * **New Endpoint `POST /api/v1/query/stress-test`**:
    * Accepts hypothetical catalyst node parameters (e.g., `"{entity_name: 'Tariffs', impact_sign: '1', exposed_asset: 'CNY'}"`).
    * Traces directional impact path vectors through the property graph.
    * Calculates the cumulative sentiment shifts and calculates the causal blast radius on downstream assets (commodities, FX, stocks).

### 5. Decentralized Swarm Forager & Coordinated Consensus Ingestion
* **Goal**: Refactor the passive single-crawler JIT harvester into a highly coordinated, decentralized crawling swarm.
* **Proposed Changes**:
  * **Modify `core/trend_monitor.py` and `core/worker.py`**:
    * Orchestrate a swarm of Playwright stealth scrapers to concurrently crawl, scrape, and partition domain targets.
    * Implement a consensus voting protocol where scrapers cross-verify contradictory findings (e.g. conflicting dates or metrics).
    * Reject unverified rumors and social media spam automatically using peer-verification thresholds, feeding only highly reliable causal substrates back to the vector graph.

### 6. Unified WebSocket Event Gateway & Live Causal Subscriptions
* **Goal**: Introduce low-latency, real-time streaming notifications to agent swarms, pushing causal intelligence updates instantly upon graph ingestion.
* **Proposed Changes**:
  * **New WebSocket Gateway `/api/v1/ws/alerts`**:
    * Enable agents to subscribe to specific nodes (e.g., `AAPL`), categories, or causal magnitude thresholds.
    * Broadcast parsed and densified graph substrates instantly to subscribers.
    * Guarantee sub-second event delivery, bypassing polling and enabling trading systems to react to macro catalysts at speed.
