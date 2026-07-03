# Causal Search and Retrieval Mechanics

To develop a relational embedding system that ensures **maximum relevance** and **shortest search times**, Dubstrata combines the semantic understanding of Large Language Models (LLMs) with the topological structure of a Knowledge Graph (KG).

This approach is referred to as **Graph Retrieval-Augmented Generation (Graph RAG)** or a **Vector-Graph Hybrid**.

---

## Phase 1: Structuring the Data for Embedding

Before turning the data into vectors, the hierarchical JSON is serialized into "embeddable units" to preserve connections.

### 1. Node Embeddings (Entities & Concepts)
Extracts the `knowledge_graph.entities` and embeds their enriched descriptions.
* **Format:** `[Entity Name] + [Type] + [Context from JSON]`
* **Example:** `"Hextech. Concept. Hextech is a form of magical technology central to the plot of Arcane..."` &rarr; **Vector A**

### 2. Relational / Triplet Embeddings (The Edges)
To capture *how* things are connected, the system embeds relationship triplets (`subject` &rarr; `predicate` &rarr; `object`).
* **Format:** `[Subject] [Predicate] [Object] in the context of [Article Title]`
* **Example:** `"Hextech drives the plot of Viktor in 'Arcane' and the Myth of Progress."` &rarr; **Vector B**

### 3. Logic & Claim Embeddings (The "Why")
Extracts the `logic_layer.claims` and `intelligence_stubs.abstract`.
* **Format:** `[Claim Argument] because [Evidence]`
* **Example:** `"Hextech serves as a useful metaphor for real-world technological progress because it helps us understand both the nature of progress..."` &rarr; **Vector C**

---

## Phase 2: Choosing the Embedding Strategy

To ensure the embeddings understand the *relations*, the system supports:
* **Option A: LLM Text Embeddings (Best for Natural Language Queries)**
  Passes text strings created in Phase 1 through an embedding model (`gemini-embedding-2` or open-source equivalents). This maps the semantic meaning of the entities and their relationships into a high-dimensional vector space.
* **Option B: Knowledge Graph Embeddings (KGE) (Best for Structural Queries)**
  For large datasets, algorithms like **TransE**, **RotatE**, or **GraphSAGE** force the vector of the *Subject* + the vector of the *Predicate* to equal the vector of the *Object* (\(V_{\text{subject}} + V_{\text{predicate}} \approx V_{\text{object}}\)).

*(Dubstrata defaults to Option A, as it handles fuzzy, human natural language searches much better).*

---

## Phase 3: Storage for Shortest Search Times

To achieve millisecond search times, the system leverages ArcadeDB's HNSW vector indexing combined with graph traversals:

1. **HNSW Indexing:** Stores the embeddings using a Hierarchical Navigable Small World (HNSW) index, creating a multi-layered graph of vectors. HNSW brings search times from \(O(N)\) down to \(O(\log N)\).
2. **Property Graph Storage:** Stores the actual JSON metadata (salience scores, reading time, characters) as properties on the nodes.

---

## Phase 4: Search Execution Dataflow (The 4-Stage Retrieval Pipeline)

To ensure maximum recall, prevent lookahead bias, and maintain mathematical scaling boundaries, the retriever executes the following pipeline:

### 1. Stage 0: Tense/Aspect Mapping & Query Preservation
* **Tense/Aspect Extraction:** A non-destructive prefix parser checks leading auxiliary/modal verbs (e.g., *Has*, *Did* &rarr; `past`; *Is*, *Are* &rarr; `present`; *Will*, *Would* &rarr; `future`) to identify the temporal aspect of the query.
* **Semantic Query Preservation:** The query is kept completely intact. Unlike legacy regex verb-stripping, the natural syntactic structure is preserved for the transformer model's self-attention layers.
* **Retrieval Benchmark Metrics:** Side-by-side tests of unmodified queries versus syntactically stripped noun phrases showed that verb-stripping consistently degraded cosine similarity against target concepts by **4.8% to 8.2%** (e.g., matching *"Will Northvolt's battery manufacturing be delayed?"* to target concept *"Northvolt supply chain delay"* degraded by **8.27%** when stripped).
* **Asset/Sports Keyword Triggering:** Standard queries are scanned for equities/sports keywords to determine if real-time pricing pipelines should be pre-cached.

### 2. Stage 1: Vector Generation
* The intact query string is passed to the Gemini Embedding API to construct a high-dimensional vector.

### 3. Stage 2: Hybrid Search & Fallback Strategies
* **Vector Index Lookups (ANN):** Executes an ArcadeDB `vectorNeighbors` query on both `Claim[embedding]` and `Entity[embedding]`.
* **Scalar SQL Fallback:** If vector searches return empty results (e.g., index socket timeouts, uninitialized indexes, or empty tenant partitions), the system executes an automated fallback query using SQL scalar parameters (`SELECT ... FROM Claim/Entity`) to prevent system lockouts.
* **Keyword Substring Pre-Fetching:** Fetches nodes matching query terms via SQL `LIKE` statements to capture critical terms that might be missed by vector indexes. Common helper verbs (e.g. *will, should, have, were*) are ignored to prevent search noise.
* **Technical Concept Anchoring:** Searches containing technical product/model tokens (e.g., `qwen`, `claude`, `llama`) are strictly anchored, filtering out claims that do not contain these specific terms.
* **Two-Stage Hard Gate & Log-Ranking:**
  1. **Hard Semantic Filter:** Candidate nodes must first pass a strict cosine similarity gate of $S_{\text{cosine}} \ge 0.50$.
  2. **Post-Filter Re-ranking:** Remaining candidates are sorted using a normalized log-scale feedback ranking:
     $$S_{\text{ranking}} = 0.7 \cdot S_{\text{cosine}} + 0.3 \cdot \frac{\ln(W_{\text{feedback}} + 1)}{\ln(11)}$$
     This ensures that authority metrics cannot artificially boost semantically irrelevant nodes past the filter gates.
  3. **Bounded Text Boost:** Entities matching query terms exactly are given a similarity boost capped at `min(1.0, sim + 0.25)` to prevent cosine boundary violations ($>1.0$).

### 4. Stage 3: Sub-Graph Traversal & Lookahead Bias Protection
* **Cypher Traversal:** Uses the claim IDs and entity names from Stage 2 to traverse neighbors in ArcadeDB.
* **Lookahead Bias Safeguards:** To prevent future data leakage during quantitative backtests, Cypher query traversals are filtered using explicit target point-in-time checks (`d.target_date <= $t_date_param`).
* **Super-Node & Latency Protection:** Traversals order documents and relations by `target_date` DESC and `confidence_score` DESC, capped at `LIMIT 50`. This ensures that only the freshest, most confident relationships are surfaced, protecting against super-node exponential latency sweeps and context window bloat.

### 5. Stage 4: Telemetry Natural Language Serialization
* **Reasoning Silo Remediation:** Instead of late-injecting numerical price action or prediction market probabilities (which isolates them from RAG validation), all metrics are serialized into structured temporal pseudo-sentences:
  > *"As of [Timestamp], live prediction market consensus weights (Market ID: [ID]) indicate a [X]% probability of the event occurring, with an Orderbook Volume of $[Y] USD."*
* **Holistic Sufficiency Evaluation:** The serialized sentences are merged directly into the context evaluated by the Self-RAG validator. This enables unified reasoning over text and metrics, allowing the validator to identify logical contradictions (such as a narrative claim asserting stability while live spot prices are crashing) prior to client delivery.

---

## Phase 5: Semantic Caching via `QueryNode`

To avoid redundant LLM synthesis and embedding calls, Dubstrata caches successfully resolved queries and responses inside ArcadeDB:
1. **Caching (Post-Retrieval):** When a new query completes successfully (non-cached, status complete), it is embedded and saved as a `QueryNode` vertex containing `id`, `query`, `response`, and `log_id`. An SQL command updates its vector property.
2. **Retrieval (Pre-Search):** Subsequent queries are embedded and compared against the 5 closest `QueryNode` vertices in ArcadeDB using `vectorNeighbors`.
3. **Feedback Validation:**
   - If the closest node similarity $\ge 0.98$, the system queries the `api_usage_feedback` table in Supabase for user ratings.
   - **Cache Hit:** If the helper rating score is $\ge 4$, the cached response is returned immediately.
   - **Cache Bypass:** If the rating is $\le 2$, the cache is penalized, forcing a fresh deep graph retrieval and JIT crawl.

---

## Phase 6: Multi-Market Sensor & Financial Price Injection

To enrich causal RAG context with real-world financial conditions, the retriever dynamically identifies asset symbols (e.g., `TSLA`, `AAPL`, `BTC`, `ETH`, `GOLD`) within the query and retrieved claims/entities:
1. **Ticker Extraction:** The system normalizes potential tickers and compares them against `SUPPORTED_TICKERS`.
2. **Unified Spot Fetching:**
   - **Crypto Assets:** Spot price, high/low, and 24h volumes are fetched via the Binance Spot API.
   - **Equities, Commodities, & Forex:** Spot and daily indicators are resolved via Yahoo Finance Chart API.
3. **Context Injection:** Prices are formatted into `[MARKET PRICE ACTION]` blocks and appended directly to the retrieved RAG context for downstream LLM awareness.

