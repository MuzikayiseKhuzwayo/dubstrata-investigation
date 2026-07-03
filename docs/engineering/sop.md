# Dubstrata: Engineering SOP

This standard operating procedure (SOP) defines the operational constraints, quality bars, and engineering directives for developing, testing, and auditing code within the Dubstrata repository.

---

## 1. Zero-Faking & Math Verification Policy
* **Strict Physical Truth**: Code must execute real, valid formulas. Mocked or fake outputs designed to bypass computation or simulate "PASS" conditions are strictly forbidden.
* **Explicit Exceptions**: If a physical mathematical function or downstream integration is not fully implemented, it must raise a clear, descriptive exception (e.g. `NotImplementedError`) rather than returning placeholder/fake data.
* **Equations and Conservation Laws**: Any code performing physical simulations, economic token math (e.g. conviction weightings, CSI calculations, trust decay models), or network flow routing must explicitly log and verify conservation laws and boundaries.

---

## 2. Directory Structure and Architectural Integrity
All code files must reside in their assigned paths:
* `/core`: Core service modules (retriever, extractor, db connection, etc.)
* `/docs`: Consensual system specifications and documents
* `/tests`: Validation tests (UAT specs, unit tests, integration tests)

No random script creations in the root or untracked directories are allowed. Any sandbox or helper scripts must be placed in `scratch/`.

---

## 3. Database RLS and Cypher Query Guidelines
* **SQL Row-Level Security**: Ensure Supabase RLS is strictly verified in test routines. Data separation by `tenant_id` must be preserved in all environments.
* **Cypher Parameterization**: String formatting (`f""`, `%`, or concatenation) inside Cypher query builders is strictly prohibited to prevent Cypher injection attacks. All inputs must be passed via parameter dictionaries.
  ```python
  # SECURE APPROACH
  query = "MATCH (e:Entity {name: $entity_name}) RETURN e"
  parameters = {"entity_name": name}
  ```

---

## 4. Error Handling and Logging standards
* **FastAPI Gateways**: All routers must handle errors gracefully, mapping database exceptions, authentication failures, and rate limits to clean, typed JSON responses (e.g., HTTP `400`, `401`, `402`, `429`, or `500`).
* **Traceability**: All requests passing through the API must support context logging and tracing identifiers.
