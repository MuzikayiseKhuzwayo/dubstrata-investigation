# Dubstrata API: Master User Acceptance Testing (UAT) Specification

This document provides the definitive, production-grade guide for manual and automated verification of all 14 endpoints exposed by the **Dubstrata API Gateway**. Each route description includes its logical category, headers, parameter templates, valid request payloads, expected success response models, and common error conditions.

---

## Gateway Configurations & Testing Sandbox

All local UAT assertions are executed against the running dev server:
- **Base URL:** `http://localhost:8000`
- **MCP SSE Base URL:** `http://localhost:8000/mcp`
- **Default Authentication:** HTTP Bearer token in the `Authorization` header (`Authorization: Bearer <API_KEY>`).
- **Web3 Micropayment Authorization:** Transaction signature sent in the `x-transaction-signature` header.

> [!NOTE]
> For testing purposes, the Supabase Sandbox seeded testing API key is `dub_live_test123` linked to the active tenant `11111111-1111-1111-1111-111111111111` (Acme Corp).

---

## API Endpoint Reference Map

### Category A: Identity, Onboarding & Economic Lifecycle

#### 1. Developer Portal Homepage
* **Route:** `GET /`
* **Description:** Serves the front-end developer dashboard and real-time ROI calculator HTML interface.
* **Authentication:** None.
* **Curl Command:**
  ```bash
  curl -s -X GET http://localhost:8000/
  ```
* **Success Response:** `200 OK` (Content-Type: `text/html`)
* **Expected Payload:** Standard HTML document rendering the developer portal.

---

#### 2. Programmatic Tenant Registration
* **Route:** `POST /api/v1/auth/tenant/register`
* **Description:** Programmatically invites a new human administrator to establish a Workspace/Tenant, sending them an invite email. Protected by a sliding-window rate limiter (max 5 requests/min per IP).
* **Authentication:** None.
* **Headers:**
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "human_email": "operator@acme.org",
    "organization_name": "Acme Autonomous Corp",
    "agent_name": "Sentry-v4"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/auth/tenant/register \
    -H "Content-Type: application/json" \
    -d '{
      "human_email": "operator@acme.org",
      "organization_name": "Acme Autonomous Corp",
      "agent_name": "Sentry-v4"
    }'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "pending_human_verification",
    "message": "Successfully registered operator@acme.org. An orchestration email has been sent to the human for verification...",
    "human_email": "operator@acme.org",
    "agent_name": "Sentry-v4"
  }
  ```
* **Error Responses:**
  - `400 Bad Request` (User already exists or database failure).
  - `429 Too Many Requests` (Sliding window rate limit exceeded).

---

#### 3. On-Chain Subscription Provisioning
* **Route:** `POST /api/v1/auth/provision`
* **Description:** Accepts a valid Solana or Base EVM transaction signature showing USDC transferred to the merchant wallet. Tops up the tenant balance and provisions a permanent API key on first execution.
* **Authentication:** None.
* **Headers:**
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "tenant_id": "11111111-1111-1111-1111-111111111111",
    "x_transaction_signature": "5tW23BfR1Gmock_signature_to_simulate_usdc_transfer_base58_encoded_here",
    "wallet_address": "HvRY3J7agUDUWy2aymAmpz69C844yxXcKhmTCk7V8ESK"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/auth/provision \
    -H "Content-Type: application/json" \
    -d '{
      "tenant_id": "11111111-1111-1111-1111-111111111111",
      "x_transaction_signature": "5tW23BfRmock_sig_123",
      "wallet_address": "HvRY3J7agUDUWy2aymAmpz69C844yxXcKhmTCk7V8ESK"
    }'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "success",
    "message": "Successfully created your permanent API key with 10.0 USDC balance.",
    "tenant_id": "11111111-1111-1111-1111-111111111111",
    "api_key": "db_56d8a...",
    "balance_added": 10.0
  }
  ```
* **Error Responses:**
  - `400 Bad Request` (Transaction invalid, failed, or zero transfer to merchant).
  - `403 Forbidden` (Transaction signature has already been used/double spend).
  - `500 Internal Server Error` (Supabase connectivity or blockchain RPC failure).

---

#### 4. Cryptographic Wallet Rotation
* **Route:** `POST /api/v1/auth/agent/update`
* **Description:** Autonomously rotates the agent's public key (wallet address). Requires Bearer API Key authorization, and verifies a cryptographic Ed25519 signature of a challenge nonce (5-minute expiry). Protected by rate limits.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "new_wallet_address": "E43Z2BmockNewWalletAddressEd25519Base58Format",
    "signature": "3mSignatureBytesBase58EncodedDynamicChallengeNonceSignedByPrivateKey",
    "nonce": "update-wallet:E43Z2BmockNewWalletAddressEd25519Base58Format:1716200000"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/auth/agent/update \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{
      "new_wallet_address": "HvRY3J7agUDUWy2aymAmpz69C844yxXcKhmTCk7V8ESK",
      "signature": "3mSignatureBytes...",
      "nonce": "update-wallet:HvRY3J7agUDUWy2aymAmpz69C844yxXcKhmTCk7V8ESK:1716200000"
    }'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "success",
    "message": "Successfully rotated agent wallet address from <old_address> to HvRY3J7agUDUWy2aymAmpz69C844yxXcKhmTCk7V8ESK.",
    "tenant_agent_id": "11111111-1111-1111-1111-111111111111",
    "old_wallet_address": "old_wallet...",
    "new_wallet_address": "HvRY3J7agUDUWy2aymAmpz69C844yxXcKhmTCk7V8ESK"
  }
  ```
* **Error Responses:**
  - `400 Bad Request` (Expired nonce, malformed signature, or cryptographic validation failure).
  - `401 Unauthorized` (Invalid or missing Bearer token).
  - `429 Too Many Requests` (Rate limit exceeded).

---

### Category B: Deep Ingestion & Hybrid Semantic Retrieval

#### 5. Fact & Document Ingestion
* **Route:** `POST /api/v1/ingest`
* **Description:** Crawls and processes raw text or HTML, structures it into entities and claims, and saves it to the global graph. Supports multi-tenant privacy overrides.
* **Authentication:** `Authorization: Bearer <API_KEY>` or hybrid Web3 micropayment.
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "url": "https://en.wikipedia.org/wiki/SpaceX",
    "text": "SpaceX is an aerospace manufacturer headquartered in El Segundo, California.",
    "is_private": false,
    "restricted_role": null
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/ingest \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{
      "url": "https://en.wikipedia.org/wiki/SpaceX",
      "text": "SpaceX is an aerospace manufacturer headquartered in El Segundo, California.",
      "is_private": false,
      "restricted_role": null
    }'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": "Successfully ingested 1 document and extracted entities/claims."
  }
  ```
* **Error Responses:**
  - `400 Bad Request` (Missing both URL and text parameters).
  - `401 Unauthorized` (Invalid API key).

---

#### 6. Hybrid RAG Graph Query
* **Route:** `POST /api/v1/query`
* **Description:** Interrogates the Graph RAG index using high-performance semantic search. Filters nodes based on tenant ownership and RBAC rules.
* **Authentication:** `Authorization: Bearer <API_KEY>` or hybrid Web3 micropayment.
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "query": "Who founded SpaceX?",
    "is_private": false,
    "agent_role": "sales_agent"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/query \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "Who founded SpaceX?",
      "is_private": false,
      "agent_role": "sales_agent"
    }'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": "Elon Musk founded SpaceX in 2002 to revolutionize space transportation."
  }
  ```

---

### Category C: Episodic Memory Store (KV Engine)

#### 7. Save Episodic Memory State
* **Route:** `POST /api/v1/memory`
* **Description:** Persists a structured agent state or KV payload tied to the tenant workspace.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "key": "handshake_sequence_v1",
    "value": {
      "status": "established",
      "retry_attempts": 0,
      "metadata": {
        "negotiated_by": "Agent-47",
        "gas_price_gwei": 45
      }
    }
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/memory \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{
      "key": "handshake_sequence_v1",
      "value": {
        "status": "established",
        "retry_attempts": 0,
        "metadata": {
          "negotiated_by": "Agent-47",
          "gas_price_gwei": 45
        }
      }
    }'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "success",
    "id": "11111111-1111-1111-1111-111111111111:handshake_sequence_v1",
    "key": "handshake_sequence_v1"
  }
  ```

---

#### 8. Retrieve Episodic Memory State
* **Route:** `GET /api/v1/memory/{key}`
* **Description:** Fetches the persistent KV memory state tied to the authenticated tenant.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
* **Curl Command:**
  ```bash
  curl -s -X GET http://localhost:8000/api/v1/memory/handshake_sequence_v1 \
    -H "Authorization: Bearer dub_live_test123"
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "key": "handshake_sequence_v1",
    "value": {
      "status": "established",
      "retry_attempts": 0,
      "metadata": {
        "negotiated_by": "Agent-47",
        "gas_price_gwei": 45
      }
    },
    "updated_at": 1716200000000
  }
  ```
* **Error Responses:**
  - `404 Not Found` (Memory key not found or doesn't belong to the tenant).

---

### Category D: Advanced MCP Surgical Graph Interrogation

#### 9. Trust Report
* **Route:** `POST /api/v1/trust-report`
* **Description:** Evaluates a domain's trust score, fallacy metrics, and checks for prompt injection footprints.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "domain": "wikipedia.org"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/trust-report \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"domain": "wikipedia.org"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": {
      "domain": "wikipedia.org",
      "trust_rating": "highly_trusted",
      "fallacy_percentage": 0.0,
      "prompt_injection_detected": false
    }
  }
  ```

---

#### 10. Historical Timeline
* **Route:** `POST /api/v1/historical-timeline`
* **Description:** Pulls chronological updates and superseded facts for a named entity.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "entity_name": "SpaceX"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/historical-timeline \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"entity_name": "SpaceX"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": [
      {
        "text": "SpaceX is developing Starship to land humans on Mars.",
        "timestamp": 1716200000,
        "is_latest": true
      }
    ]
  }
  ```

---

#### 11. Category Entities Filter
* **Route:** `POST /api/v1/entities-by-category`
* **Description:** Lists all entities within a strict ontology category, applying optional regex name filtering.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "category": "Organization",
    "name_filter": "Space"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/entities-by-category \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{
      "category": "Organization",
      "name_filter": "Space"
    }'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": [
      {
        "name": "SpaceX",
        "category": "Organization",
        "claims_count": 14
      }
    ]
  }
  ```

---

#### 12. Retrieve All Facts
* **Route:** `POST /api/v1/all-facts`
* **Description:** Deterministically retrieves all active claims related to a named entity using a Cypher match.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "entity_name": "SpaceX"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/all-facts \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"entity_name": "SpaceX"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": [
      {
        "fact_id": "fact_1",
        "statement": "SpaceX designs, manufactures, and launches advanced rockets.",
        "confidence_score": 0.99
      }
    ]
  }
  ```

---

#### 13. Interaction Hooks
* **Route:** `POST /api/v1/interaction-hooks`
* **Description:** Fetches semantic triggers or next steps extracted from a specified document source URL.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "url": "https://en.wikipedia.org/wiki/SpaceX"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/interaction-hooks \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"url": "https://en.wikipedia.org/wiki/SpaceX"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": [
      {
        "type": "opportunity",
        "action": "Monitor SpaceX rocket launch schedules for satellite payload capacity."
      }
    ]
  }
  ```

---

#### 14. Find Graph Conflicts
* **Route:** `POST /api/v1/find-conflicts`
* **Description:** Identifies contradictory claims about a named entity across different source URLs.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "entity_name": "SpaceX"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/find-conflicts \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"entity_name": "SpaceX"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": {
      "conflicts_found": 0,
      "details": []
    }
  }
---

### Category C: Advanced Analytics, Telemetry & Orchestration

#### 15. WebSocket Ticket Provisioning
* **Route:** `POST /api/v1/auth/ws-ticket`
* **Description:** Requests an ephemeral single-use ticket in Redis to authorize a WebSocket connection.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:** None.
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/auth/ws-ticket \
    -H "Authorization: Bearer dub_live_test123"
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "ticket": "t_abc123xyz456...",
    "expires_in": 10
  }
  ```

---

#### 16. Inference Conviction Index
* **Route:** `POST /api/v1/query/inference-conviction`
* **Description:** Joins Graph RAG context with live prediction market CSI consensus weights and live Yahoo/Binance financial spot price actions to output market conviction anomalies.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "query": "BTC price prediction based on US Fed policy",
    "is_private": false
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/query/inference-conviction \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"query": "BTC price prediction based on US Fed policy"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": "...",
    "status": "complete",
    "ici": 0.85
  }
  ```

---

#### 17. Intelligence Report Generator
* **Route:** `POST /api/v1/query/intelligence-report`
* **Description:** Drives an intensive multi-step retrieval to synthesize a 10-section intelligence analyst report.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "query": "Comprehensive analysis of US sovereign debt risk profile",
    "is_private": false
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/query/intelligence-report \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"query": "Comprehensive analysis of US sovereign debt risk"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "result": "# Intelligence Report\n...",
    "status": "complete"
  }
  ```

---

#### 18. Model Future Scenario Probability
* **Route:** `POST /api/v1/query/model-future`
* **Description:** Simulates future outcomes and assigns probabilities to divergent narrative pathways.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "query": "China regulatory policies on semiconductor exports",
    "is_private": false
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/query/model-future \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"query": "China semiconductor export policy scenario"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "query": "...",
    "predicted_probability": 0.72,
    "confidence": 0.88,
    "scenario_matrix": []
  }
  ```

---

#### 19. Retrieve Alt-Data Historical Time-Series
* **Route:** `GET /api/v1/alt-data/historical`
* **Description:** Pulls raw time-series metrics from PostgreSQL `alt_data_time_series` table for a specific ticker/asset.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
* **Curl Command:**
  ```bash
  curl -s -X GET "http://localhost:8000/api/v1/alt-data/historical?ticker=BTC" \
    -H "Authorization: Bearer dub_live_test123"
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "ticker": "BTC",
    "data_points": [
      {
        "timestamp": "2026-06-20T05:00:00Z",
        "csi": 75.2,
        "implied_trust": 0.94
      }
    ]
  }
  ```

---

#### 20. Algorithmic Feedback Rating Loop
* **Route:** `POST /api/v1/feedback`
* **Description:** Allows agents to submit helpfulness ratings (scores 1-5) for query transactions. Updates semantic caching weights.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "log_id": "8bb8742b-5b58-450a-9d93-3d02a0a2df33",
    "score": 5,
    "comments": "Highly accurate citation of US Fed policy change"
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/feedback \
    -H "Authorization: Bearer dub_live_test123" \
    -H "Content-Type: application/json" \
    -d '{"log_id": "8bb8742b-5b58-450a-9d93-3d02a0a2df33", "score": 5}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "success",
    "message": "Feedback submitted."
  }
  ```

---

#### 21. Query Pipeline Performance Stats
* **Route:** `GET /api/v1/telemetry/performance/stats`
* **Description:** Aggregates and returns latency logs, success ratios, and throughput metrics for system stages.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
* **Curl Command:**
  ```bash
  curl -s -X GET http://localhost:8000/api/v1/telemetry/performance/stats \
    -H "Authorization: Bearer dub_live_test123"
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "success",
    "metrics": {
      "avg_latency_ms": 124.5,
      "success_rate": 0.992
    }
  }
  ```

---

#### 22. Force JWT Secrets Rotation (Admin)
* **Route:** `POST /api/admin/secrets/rotate`
* **Description:** Manually forces JWT token signing secret rotation. Returns success verification.
* **Authentication:** `Authorization: Bearer <API_KEY>` (Requires administrator role key)
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/admin/secrets/rotate \
    -H "Authorization: Bearer dub_live_test123"
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "success",
    "message": "JWT secret successfully rotated."
  }
  ```

---

#### 23. Purge Dead Graph Documents (Admin)
* **Route:** `POST /api/v1/admin/cleanup`
* **Description:** Forces graph traversal cleanup to purge all unreferenced Document vertices.
* **Authentication:** `Authorization: Bearer <API_KEY>`
* **Headers:**
  - `Authorization: Bearer dub_live_test123`
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/admin/cleanup \
    -H "Authorization: Bearer dub_live_test123"
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "success",
    "purged_count": 0,
    "details": []
  }
  ```

---

#### 24. Public Event Webhooks Receiver
* **Route:** `POST /api/v1/webhooks/receiver`
* **Description:** Receives public notifications, triggering JIT sweeps and event-driven ingestions.
* **Authentication:** None (relies on payload signatures)
* **Headers:**
  - `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "event": "regulatory_publish",
    "ticker": "TSLA",
    "payload": {}
  }
  ```
* **Curl Command:**
  ```bash
  curl -s -X POST http://localhost:8000/api/v1/webhooks/receiver \
    -H "Content-Type: application/json" \
    -d '{"event": "regulatory_publish", "ticker": "TSLA"}'
  ```
* **Success Response:** `200 OK`
  ```json
  {
    "status": "accepted",
    "event_id": "evt_bc98427f23a..."
  }
  ```

---

## Verification & Validation Guide

When running the manual verification, ensure:
1. **Response Time:** Requests complete in less than 350ms (cached) or 1500ms (uncached JIT).
2. **Postgres Telemetry Rollups:** API request counts and token tracking metrics in Supabase are updated.
3. **Immutability of Audit Logs:** Rotating wallet addresses creates audit logs in the `agent_identity_logs` table.
4. **Data Isolation:** Private queries do not return facts from other tenants.

