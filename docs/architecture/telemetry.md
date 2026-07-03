# Telemetry and Logging Layer

This document details the telemetry architecture used to monitor the health, performance, and B2B SaaS metric rollups of the Dubstrata system. Telemetry data is rolled up into time-bucket intervals using atomic PostgreSQL upsert queries to prevent race conditions and write-path blockages.

---

## The 4 Pillars of Telemetry Rollups

### 1. LLM Arbitrage & Cost Telemetry
* **Tokens Saved (Deduplication):** Hits against the URL MD5 hash cache and the `_DEMAND_CACHE` to track how many expensive `gemini-embedding-2` and reasoning calls were avoided.
* **JIT Skips:** Bypasses where the MCP server or retrieval pipeline intercepted a search query because the target entity was already fully resolved inside ArcadeDB.
* **Truncation Events:** Detections where DuckDuckGo or Wikipedia crawled content exceeded the context window limits and triggered safe semantic truncation.

### 2. Graph Topology & Ingestion Health
* **Node Distribution:** Absolute counts of `Document`, `Entity`, `Claim`, `ContextFragment`, and `InteractionHook` nodes.
* **Graph Density:** Ratio of edges (`:RELATES_TO`, `[:MENTIONS]`) to nodes.
* **Delta Sweeps:** Archiving metrics tracking temporal version invalidations.

### 3. Worker Fleet Metrics
* **Queue Throughput:** Rate of background tasks (e.g., `deep_crawl_entity`) handled by the ARQ engine.
* **Crawler Intercepts:** Domain-level filtering and blocked URL metrics.

### 4. B2B SaaS Billing & Tenant Telemetry
* **x402 Solana Micropayments:** Conversion rates of the Web3 micropayment handshakes.
* **RLS Violations:** Detections of queries attempting to cross tenant security boundaries.
* **Stripe Metering Logs:** Rollups of billable API requests.

---

## Schema DDL: `system_telemetry_rollups`

```sql
CREATE TABLE system_telemetry_rollups (
    time_bucket TIMESTAMPTZ NOT NULL,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    
    -- LLM Arbitrage (Additive Counters)
    tokens_saved BIGINT DEFAULT 0,
    jit_skips INT DEFAULT 0,
    truncation_events INT DEFAULT 0,

    -- Graph Topology (Gauges / Snapshots)
    total_documents BIGINT DEFAULT 0,
    total_entities BIGINT DEFAULT 0,
    total_claims BIGINT DEFAULT 0,
    graph_density NUMERIC(8,4) DEFAULT 0.0000,
    delta_sweeps_archived INT DEFAULT 0,

    -- Worker Fleet (Additive Counters)
    arq_tasks_dispatched INT DEFAULT 0,
    arq_tasks_completed INT DEFAULT 0,
    banned_urls_intercepted INT DEFAULT 0,

    -- B2D SaaS (Additive Counters)
    api_requests BIGINT DEFAULT 0,
    x402_fallbacks INT DEFAULT 0,
    rls_violations INT DEFAULT 0,

    PRIMARY KEY (time_bucket, tenant_id)
);

CREATE INDEX idx_telemetry_time_brin ON system_telemetry_rollups USING BRIN (time_bucket);
CREATE INDEX idx_telemetry_tenant ON system_telemetry_rollups (tenant_id, time_bucket DESC);
```

---

## Atomic Increments via PostgREST

FastAPI background tasks perform updates using an atomic database function `increment_telemetry`. This guarantees non-blocking, race-free operations across all worker threads.

```sql
CREATE OR REPLACE FUNCTION increment_telemetry(
    p_tenant_id UUID,
    p_tokens_saved BIGINT DEFAULT 0,
    p_jit_skips INT DEFAULT 0,
    p_truncation_events INT DEFAULT 0,
    p_total_documents BIGINT DEFAULT NULL,
    p_total_entities BIGINT DEFAULT NULL,
    p_total_claims BIGINT DEFAULT NULL,
    p_graph_density NUMERIC DEFAULT NULL,
    p_delta_sweeps_archived INT DEFAULT 0,
    p_arq_tasks_dispatched INT DEFAULT 0,
    p_arq_tasks_completed INT DEFAULT 0,
    p_banned_urls_intercepted INT DEFAULT 0,
    p_api_requests BIGINT DEFAULT 0,
    p_x402_fallbacks INT DEFAULT 0,
    p_rls_violations INT DEFAULT 0
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_time_bucket TIMESTAMPTZ := date_trunc('hour', now());
BEGIN
    INSERT INTO system_telemetry_rollups (
        time_bucket, tenant_id, tokens_saved, jit_skips, truncation_events,
        total_documents, total_entities, total_claims, graph_density,
        delta_sweeps_archived, arq_tasks_dispatched, arq_tasks_completed,
        banned_urls_intercepted, api_requests, x402_fallbacks, rls_violations
    ) VALUES (
        v_time_bucket, p_tenant_id, p_tokens_saved, p_jit_skips, p_truncation_events,
        COALESCE(p_total_documents, 0), COALESCE(p_total_entities, 0), COALESCE(p_total_claims, 0), COALESCE(p_graph_density, 0),
        p_delta_sweeps_archived, p_arq_tasks_dispatched, p_arq_tasks_completed,
        p_banned_urls_intercepted, p_api_requests, p_x402_fallbacks, p_rls_violations
    )
    ON CONFLICT (time_bucket, tenant_id) DO UPDATE SET
        tokens_saved = system_telemetry_rollups.tokens_saved + EXCLUDED.tokens_saved,
        jit_skips = system_telemetry_rollups.jit_skips + EXCLUDED.jit_skips,
        truncation_events = system_telemetry_rollups.truncation_events + EXCLUDED.truncation_events,
        total_documents = COALESCE(NULLIF(EXCLUDED.total_documents, 0), system_telemetry_rollups.total_documents),
        total_entities = COALESCE(NULLIF(EXCLUDED.total_entities, 0), system_telemetry_rollups.total_entities),
        total_claims = COALESCE(NULLIF(EXCLUDED.total_claims, 0), system_telemetry_rollups.total_claims),
        graph_density = COALESCE(NULLIF(EXCLUDED.graph_density, 0), system_telemetry_rollups.graph_density),
        delta_sweeps_archived = system_telemetry_rollups.delta_sweeps_archived + EXCLUDED.delta_sweeps_archived,
        arq_tasks_dispatched = system_telemetry_rollups.arq_tasks_dispatched + EXCLUDED.arq_tasks_dispatched,
        arq_tasks_completed = system_telemetry_rollups.arq_tasks_completed + EXCLUDED.arq_tasks_completed,
        banned_urls_intercepted = system_telemetry_rollups.banned_urls_intercepted + EXCLUDED.banned_urls_intercepted,
        api_requests = system_telemetry_rollups.api_requests + EXCLUDED.api_requests,
        x402_fallbacks = system_telemetry_rollups.x402_fallbacks + EXCLUDED.x402_fallbacks,
        rls_violations = system_telemetry_rollups.rls_violations + EXCLUDED.rls_violations;
END;
$$;
```

---

## Processing Performance Telemetry

To track latency profiles, payload sizes, and failures across processing pipeline boundaries (e.g., crawler, LLM extract, DB writes), Dubstrata maintains the time-partitioned `processing_performance_logs` relational table.

### Schema DDL: `processing_performance_logs`

```sql
CREATE TABLE IF NOT EXISTS public.processing_performance_logs (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL,
    stage TEXT NOT NULL,
    target TEXT,
    status TEXT NOT NULL,
    latency_ms DOUBLE PRECISION NOT NULL,
    payload_size INTEGER,
    error_message TEXT,
    PRIMARY KEY (timestamp, id)
) PARTITION BY RANGE (timestamp);
```

### Background Performance Logging

Pipeline operations dispatch telemetry logs using `track_performance_log()` inside `core/telemetry.py`. This method runs fire-and-forget inserts in a background daemon thread, eliminating blocking time-penalties on the hot write-path.

### Performance Analytics Endpoint

Authorized tenant clients can pull rolled-up performance analytics via:
`GET /api/v1/telemetry/performance/stats`
Exposes average latency, success rates, throughput metrics, and stage-by-stage diagnostics.

