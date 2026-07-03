# Deep Dive Assessment: Relevancy Measures and Graph Insertion Mapping Trust

This report outlines the concrete mathematical and logical safeguards, monitoring metrics, and cleanup processes used to ensure the Dubstrata Knowledge Graph is populated only with relevant information.

---

## 1. Relevance and Alignment Measures (Query to Results)

To prevent irrelevant noise (e.g. general weather patterns) from matching specific causal queries (e.g. political updates), the Dubstrata pipeline enforces the following two-stage gateway filters:

### Stage A: Hard Semantic Cosine Gate
* **Enforcement:** Candidate documents and claims are embedded using the `text-embedding-004` model.
* **Gate Threshold:** A strict $S_{\text{cosine}} \ge 0.60$ threshold is enforced. Any node with a similarity score below this threshold is immediately dropped before traversing relationship edges.
* **Self-RAG Fallback:** If zero candidate nodes pass the gate, the JIT Crawler fallback loop triggers a web search to fetch fresh, direct context.

### Stage B: Dampened Authority Ranking
To avoid "authority distortion" where highly-linked nodes dominate irrelevant queries, a normalized log-scale ranking is applied:
\[S_{\text{ranking}} = 0.7 \cdot S_{\text{cosine}} + 0.3 \cdot \frac{\ln(W_{\text{feedback}} + 1)}{\ln(11)}\]
* The logarithmic dampening restricts the feedback weight's contribution to a maximum range of $[0.0, 0.3]$, ensuring that semantic similarity always remains the primary driver.

---

## 2. Ingestion Mapping (Inserts to the Right Places)

When new scraped articles are ingested, the system ensures correct mapping through:
1. **Entity Resolution & Concatenation:** Entities are resolved via high-fidelity LLM schema extractors. Synthesized properties merge redundant nodes.
2. **Contextual Inbound Bounds:** Relationships (edges) are labeled with metadata such as `valid_at` and `tenant_id`, preventing leakage across private or temporal scopes.

---

## 3. Trusting Cleanup Operations

The system periodically runs `purge_dead_documents()` to clean up orphaned/dead document nodes.
* **Mechanism:**
  ```cypher
  MATCH (d:Document)
  WHERE NOT (d)<-[:CLAIMED_IN]-(:Claim)
  DETACH DELETE d
  ```
* **Can we trust them?** Yes, because:
  1. **Referential Integrity:** The cleanup query checks for the existence of incoming `CLAIMED_IN` relationships. If a document has even one valid claim, it is preserved.
  2. **Isolating Orphans:** Documents that have zero claims extracted from them do not contribute to RAG context and are safely purged.
  3. **No Dangling Edges:** ArcadeDB's `DETACH DELETE` ensures that any remaining dangling relationships (if any exist) are safely removed during deletion, preventing graph corruption.
