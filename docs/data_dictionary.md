# Time-Series Alternative Data Ledger: Data Dictionary

This document serves as the official data dictionary and interpretation guide for the `alt_data_time_series` dataset. It defines every column, mathematical formula, value boundary, and metadata property, providing downstream quantitative engineers and institutional investors with a clear mapping of the system's output.

---

## 1. Mathematical Formulas & Core Calculations

### A. Participant Conviction Weight
For each participant, conviction is calculated as:
\[\text{Weight} = \left(\frac{\text{Position Value USD}}{1000}\right) \times \text{Win Rate}^2 \times \text{Accuracy Coefficient}\]
* **Win Rate**: The participant's historical track record in resolving predictions correctly (default is `0.50`).
* **Accuracy Coefficient**: A multiplier reflecting how close the participant's historical entries were to the final outcome price (default is `1.00`).

### B. Consensus Sentiment Index (CSI)
The CSI aggregates the total conviction weights of YES holders versus NO holders:
\[\text{CSI} = \frac{\text{Yes Weight} - \text{No Weight}}{\text{Yes Weight} + \text{No Weight}} \times 100.0\]
* **Range**: \([-100.0, +100.0]\)
* **Interpretation**: A positive value indicates a net bullish consensus (YES preference); a negative value indicates a net bearish consensus (NO preference).

### C. Relative Whale Definition
To prevent absolute capital distortions, a participant is classified as a whale relative to the local pool:
\[\text{Is Whale} \iff \text{Participant Position Value} \ge 1.5 \times \text{Mean Position Value of the Pool}\]
*(If the pool size is \(\le 2\), any participant with active holdings is categorized as a whale).*

### D. Adaptive Semantic Trust Decay & Metric Dampening
For fallback semantic graph retrievals, a piecewise linear **Trust Decay Coefficient** ($T_d$) is calculated for each claim based on its vector similarity ($\text{sim}$):

\[T_d(\text{sim}) = \begin{cases} 
      1.0 & \text{if } \text{sim} \ge 0.80 \\
      \frac{\text{sim} - 0.65}{0.80 - 0.65} & \text{if } 0.65 \le \text{sim} < 0.80 \\
      0.0 & \text{if } \text{sim} < 0.65
   \end{cases}\]

This coefficient adjusts downstream time-series metrics:
1. **Decayed Document Confidence ($C'_i$)**: For a source confidence $C_i$, the decayed confidence is $C'_i = C_i \times T_d(\text{sim}_i)$.
2. **Dampened Graph Certainty ($G_c$)**: Calculated as the mean decayed confidence score across all $N$ fallback claims:
   \[G_c = \frac{1}{N} \sum_{i=1}^{N} \left( C_i \times T_d(\text{sim}_i) \right)\]
3. **Dampened Inference Conviction Index ($\text{ICI}_{\text{dampened}}$)**: Aggregated toward a neutral baseline ($0.5$) using the average decay of all retrieved claims ($\overline{T}_d$):
   \[\text{ICI}_{\text{dampened}} = 0.5 + (\text{ICI}_{\text{raw}} - 0.5) \times \overline{T}_d \quad \text{where} \quad \overline{T}_d = \frac{1}{N} \sum_{i=1}^{N} T_d(\text{sim}_i)\]
4. **Dampened Divergence Signal ($D_s$)**: Calculated as \(|P_m - G_c|\) where the dampened $G_c$ naturally pulls the divergence signal closer to $0$, preventing false alarms for weak semantic matches.
5. **Justification Prefixing**: Justifications based on claims where \(\text{sim} < 0.80\) are marked with `[Adaptive Context, Sim: X.XX]` to communicate the semantic distance explicitly.

---

## 2. Column-by-Column Specification

| Column Name | Data Type | Range / Options | Description & Interpretation |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | String (UUIDv4) | Unique identifier for the specific time-series data frame tick. |
| `timestamp` | `TIMESTAMPTZ` | ISO 8601 UTC | The exact point-in-time when the data sweep was compiled and written. |
| `market_id` | `VARCHAR` | Unique alphanumeric | The unique condition or contract ID retrieved from the Polymarket API. |
| `market_slug` | `VARCHAR` | URL-friendly slug | The human-readable identifier of the prediction market (e.g., `will-spacexs-valuation-hit-high-3pt0t-by-june-30`). |
| `question` | `TEXT` | UTF-8 String | The exact textual phrasing of the market event being predicted. |
| `underlying_assets` | `TEXT[]` | Array of Strings | Aligned ticker symbols or entity names associated with the market (e.g. `["SPACEX"]`, `["SOL"]`). |
| `market_probability` | `NUMERIC` | `[0.00, 1.00]` | The current market-implied probability of the YES outcome, derived from the orderbook price. |
| `volume_24h_usd` | `NUMERIC` | $\ge 0.0$ | Trading volume in USDC/USD on this market within the last 24 hours. |
| `total_volume_usd` | `NUMERIC` | $\ge 0.0$ | Cumulative trading volume in USDC/USD on this market since creation. |
| `yes_weight` | `NUMERIC` | $\ge 0.0$ | The sum of all YES holder conviction weights. |
| `no_weight` | `NUMERIC` | $\ge 0.0$ | The sum of all NO holder conviction weights. |
| `csi_sentiment_index`| `NUMERIC` | `[-100.0, 100.0]` | The weighted sentiment index. `0.0` represents perfect neutrality. |
| `whale_count_yes` | `INTEGER` | $\ge 0$ | The number of unique YES-leaning accounts classified as whales (relative to the pool). |
| `whale_count_no` | `INTEGER` | $\ge 0$ | The number of unique NO-leaning accounts classified as whales (relative to the pool). |
| `top_whale_conviction`| `NUMERIC` | $\ge 0.0$ | The absolute highest conviction weight calculated for any single tracked whale in this market. |
| `graph_certainty` | `NUMERIC` | `[0.00, 1.00]` | The density score of validated semantic claims. A value of `1.00` means full factual alignment; `0.00` indicates a new market relying on fallback context. |
| `inference_conviction_index` (ICI) | `NUMERIC` | `[0.00, 1.00]` | Blended confidence metric combining orderbook density, participant conviction, and semantic claim relevance. |
| `divergence_signal` | `NUMERIC` | `[-1.00, 1.00]` | The delta between the market-implied probability and the CSI-weighted probability. |
| `divergence_tier` | `VARCHAR` | `ALIGNED`, `MINOR_DIVERGENCE`, `CRITICAL_DIVERGENCE` | Categorical classification of divergence. High-frequency quant swarms target `CRITICAL_DIVERGENCE` as potential arbitrage signals. |
| `l1_justification` | `TEXT` | Sentence String | Direct semantic explanation from the RAG pipeline explaining the divergence tier or factual background of the market. |
| `supporting_claims_count` | `INTEGER` | $\ge 0$ | Total count of validated supporting claims found in the ArcadeDB causal graph or semantic fallback context. |
| `contradicting_claims_count` | `INTEGER` | $\ge 0$ | Total count of validated contradicting claims found. |
| `metadata` | `JSONB` | Structured JSON | Rich inner object containing orderbook depth spreads, whale concentration ratios, and individual trade stats (see Section 3). |

---

## 3. Inner Metadata Schema Breakdown

The `metadata` column contains a structured JSON payload detailing orderbook structure and whale concentration:

### A. `depth_yes` and `depth_no`
Tracks market liquidity by capturing orderbook depth metrics:
* `asks_value_usdc` / `bids_value_usdc`: The total dollar value of active limit orders at the best ask/bid levels.
* `asks_volume_contracts` / `bids_volume_contracts`: The total contract count sitting on the book.

### B. `concentration_yes` and `concentration_no`
Measures position concentration among the largest holders to identify potential market-manipulation or capital centralization:
* `top_n_holdings`: The combined value of the top 10 positions.
* `total_recorded_holdings`: Total contract value across all tracked holders.
* `concentration_ratio`: `top_n_holdings / total_recorded_holdings`. A ratio near `1.0` indicates high centralization (few players dictate the pool).

### C. `orderbook_yes_metrics` and `orderbook_no_metrics`
* `spread`: The difference between best ask and best bid.
* `best_ask` / `best_bid`: Top-of-book execution prices.
* `midpoint`: Standard mid-price calculated from the spread.
