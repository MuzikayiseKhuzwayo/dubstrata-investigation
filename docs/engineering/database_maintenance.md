# Database Maintenance & Administration Procedures

This document details administrative runbooks, migration scripts, purging routines, and secrets rotation procedures for managing the Dubstrata PostgreSQL (Supabase) and Graph (ArcadeDB) instances.

---

## 1. Running Relational Schema Migrations

Supabase PostgreSQL schema changes are tracked inside the project root directory and should be executed using the python migration helper scripts:

### Apply Base Schema
Applies the initial table layouts, RLS policies, onboarding triggers, and database functions. Run the SQL statements inside:
`database/supabase_init.sql`

### Populate Seed Data & Mock Tenants
Seeds testing balances, API keys, and dummy users into the database sandbox. Run the SQL statements inside:
`database/supabase_seed.sql`

### Apply Performance Migrations
Creates the partition triggers, performance logging tables, and monthly partitions. Run the SQL statements inside:
`database/supabase_all_rls_policies.sql` (to verify all tables enforce policies) and the partitions logic inside `database/supabase_init.sql`.

---

## 2. JWT Cryptographic Secrets Rotation

To maintain API security integrity, B2B token signing keys are automatically and manually rotated.

### Automatic Scheduled Rotation
On startup, FastAPI launches `scheduled_jwt_secrets_rotation` via APScheduler. This background daemon generates and registers a new secure UUID key inside the `supabase_jwt_secrets.sql` table daily.

### Manual Rotation Trigger
Administrators can force key rotations programmatically.
* **Endpoint:** `POST /api/admin/secrets/rotate`
* **Authorization:** Requires Admin Service API Key.
* **Curl Command:**
  ```powershell
  curl -X POST http://localhost:8000/api/admin/secrets/rotate -H "Authorization: Bearer dub_live_test123"
  ```

---

## 3. Empty Graph Document Purges

Crawled websites and documents can lose references if claims are merged, conflicts resolved, or entities consolidated. Unreferenced Document nodes waste HNSW vector space.

### Cleanup Script: `core/clean_empty_documents.py`
This script identifies and deletes all `Document` vertices in ArcadeDB that have zero incoming `:CLAIMED_IN` edges from any `Claim` node.

* **Cypher Identification Query:**
  ```cypher
  MATCH (d:Document)
  WHERE NOT (d)<-[:CLAIMED_IN]-(:Claim)
  RETURN d.source_url AS url, d.id AS id
  ```
* **Cypher Purging Query:**
  ```cypher
  MATCH (d:Document {id: $id})
  DETACH DELETE d
  ```

### Scheduled Daily Purge
Driven by `scheduled_empty_docs_cleanup` daemon scheduled within `main.py` to run nightly at `03:00` server time.

### Manual Purge Trigger
* **Endpoint:** `POST /api/v1/admin/cleanup`
* **Curl Command:**
  ```powershell
  curl -X POST http://localhost:8000/api/v1/admin/cleanup -H "Authorization: Bearer dub_live_test123"
  ```

---

## 4. Row-Level Security (RLS) Compliance Audit

To ensure tenant isolation policies remain intact and protect against cross-tenant data leaks:
1. All tables must have `ENABLE ROW LEVEL SECURITY` declared.
2. Select policies must limit access based on JWT parameters:
   ```sql
   CREATE POLICY select_tenant_isolation ON public.api_usage_logs
       FOR SELECT USING (tenant_id = auth.jwt_tenant_id());
   ```
3. Run verification test scripts to assert validation rules:
   ```powershell
   python scratch/test_tenant_telemetry.py
   ```
