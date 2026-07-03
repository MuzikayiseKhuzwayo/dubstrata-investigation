# API Endpoint Pricing Strategy

This document outlines the usage-based pricing matrix and compute credits assigned to each of the Dubstrata platform API endpoints.

---

## Endpoint Pricing Matrix

| Endpoint | Action / Value Provided | Compute Effort | Suggested Price (USDC) | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`/api/v1/ingest`** | **The Synthesizer:** Creates permanent knowledge. | **EXTREME** (Headless crawl + Gemini 2.5 Pro extraction + Vector Gen + Graph Upserts) | **$0.0025 - $0.25** | Most expensive endpoint. Pays for LLM token processing and database write. However, the value is permanent. |
| **`/api/v1/query`** | **The Core Brain:** Deep semantic RAG with JIT fallbacks. | **HIGH** (Vector similarity + Graph traversal + Potential JIT LLM extraction) | **$0.0050** | Flagship feature. Often triggers background tasks or JIT Wikipedia queries, meaning compute can spike. |
| **`/api/v1/find-conflicts`** | **The Reasoner:** Groups claims by source for contradiction analysis. | **MEDIUM-HIGH** (Heavy Cypher pattern matching across multiple nodes/edges) | **$0.005** | Very high value for an agent trying to determine the truth between conflicting sources. Requires moderate DB compute. |
| **`/api/v1/trust-report`** | **The Shield:** Calculates fallacy rates and security alerts for a domain. | **MEDIUM** (Cypher query + potential JIT ingestion) | **$0.005** | High value for autonomous agents needing to know if a source contains prompt injections before executing its code. |
| **`/api/v1/all-facts`** | **The Dump:** Deterministic retrieval of 50 active facts about an entity. | **MEDIUM** (Cypher query + potential JIT/deep crawl trigger) | **$0.004** | Standard retrieval. If the entity is known, it's a cheap read. If not, it triggers the headless worker. |
| **`/api/v1/historical-timeline`** | **The Time Machine:** Retrieves superseded (`is_latest = false`) claims. | **MEDIUM** (Cypher query sorting by timestamps) | **$0.003** | Niche but valuable for agents needing context on how an entity has changed over time. |
| **`/api/v1/interaction-hooks`** | **The Next-Step:** Returns actionable hooks from a document. | **LOW-MEDIUM** (Simple Cypher traversal) | **$0.002** | Cheap read operation, but provides direct behavioral instructions for agents. |
| **`/api/v1/entities-by-category`**| **The Explorer:** Lists entities matching a type (e.g., PERSON). | **LOW** (Standard DB index scan) | **$0.001** | Basic database read. Low compute, mostly used for exploratory listing. |

---

## Strategic Recommendations

### 1. The "Cache Hit" Discount (Friction Arbitrage)
Dubstrata leverages a semantic deduplication logic and `_DEMAND_CACHE`. If a query hits the cache, the compute cost drops to near zero. The system still charges the full price because we sell the *answer*, not the raw compute.

### 2. Anonymous vs. Registered Pricing
* **Anonymous (x402 Solana Gateway):** Charged at a **premium flat rate** (e.g., $0.25 across all endpoints) to offset the transaction signature verification overhead.
* **Registered (API Key):** Charged at the granular fractional prices listed above, deducted from their pre-paid credit balance. This heavily incentivizes agents to use the `/api/v1/auth/tenant/register` onboarding flow.

### 3. Background Worker Arbitrage
ARQ workers scrape DuckDuckGo and ingest data asynchronously. When a user triggers `force_deep_crawl`, they pay $0.05 for the trigger. The background worker executes the compute cost 60 seconds later. If multiple agents ask about the same trending topic, 1 agent pays for the crawl, and the others pay for the cached result.
