# WebSocket Alerts Protocol Specification

This document defines the interface specifications, routing pathways, subscription models, and JSON payload structures for clients connecting to the live Dubstrata WebSockets Gateway (`/api/v1/ws/alerts`).

---

## 1. Gateway Connection & Ephemeral Tickets

To protect the server from unauthorized WebSocket spam and resource exhaustion, raw static tokens are not permitted on connection handshake. Connections must use the single-use ticket handshake protocol.

### Step 1: Request Ephemeral Ticket
Before connecting, the client initiates a request via the REST API:
* **Request:** `POST /api/v1/auth/ws-ticket`
* **Response:**
  ```json
  {
    "ticket": "ws_ticket:44ea4909-5a50-4822-ba90-50d4d293d0a2",
    "expires_in": 10
  }
  ```

### Step 2: Connection Handshake
Within 10 seconds, the client must establish the WebSocket connection, passing the ticket as a query parameter:
* **URL:** `ws://localhost:8000/api/v1/ws/alerts?ticket=ws_ticket:44ea4909-5a50-4822-ba90-50d4d293d0a2`

The server validates the ticket from Redis:
- If the ticket exists, the session is authenticated, the ticket is instantly deleted from Redis, and the connection is accepted.
- If the ticket does not exist, has expired, or has already been used, the server returns an HTTP `403 Forbidden` and terminates the TCP handshake.

---

## 2. Throttling and Connection Limits

* **Max Session Concurrency:** Enforced via Redis tracking (`ws_active_conn:{tenant_id}`). A tenant is permitted a maximum of **5 concurrent active WebSocket connections**.
* **Limit Exceeded Action:** Additional connection handshakes beyond the concurrent session limit are dropped with an immediate error frame before termination.

---

## 3. Subscription Management

Upon connection, clients can optionally send JSON messages to subscribe to specific asset updates or filter events.

### Subscription Payload Format
```json
{
  "action": "subscribe",
  "tickers": ["BTC", "TSLA", "GOLD"],
  "min_confidence": 0.70
}
```

### Unsubscribe Payload Format
```json
{
  "action": "unsubscribe",
  "tickers": ["GOLD"]
}
```

---

## 4. Real-time Message Formats

The server pushes real-time market divergence anomalies and alternative data updates to clients.

### A. Consensus Sentiment Index (CSI) Anomaly Alert
Sent when Polymarket consensus diverges from causal graph ground-truth logic signals:
```json
{
  "event": "csi_anomaly",
  "timestamp": "2026-06-20T05:18:00Z",
  "ticker": "BTC",
  "market_question": "Will BTC cross $120k by end of June?",
  "consensus_sentiment_index": 78.4,
  "graph_implied_trust_index": 0.32,
  "divergence": 0.464,
  "anomaly_severity": "HIGH",
  "rationale": "Prediction market pricing implies 78% probability of bullish outcome, but causal graphs identify regulatory compliance failures in US Fed and SEC updates."
}
```

### B. Live Asset Spot Price Broadcast
Sent when yfinance or Binance tickers update or cross boundaries:
```json
{
  "event": "market_price_update",
  "timestamp": "2026-06-20T05:18:10Z",
  "ticker": "TSLA",
  "price": 242.50,
  "change_24h_percent": 3.42,
  "source": "Yahoo Finance API"
}
```

### C. System Telemetry Rollup (Admin Only)
Broadcast to authorized administrative terminals hourly:
```json
{
  "event": "system_telemetry",
  "timestamp": "2026-06-20T05:00:00Z",
  "metrics": {
    "tokens_saved": 482000,
    "arq_tasks_completed": 142,
    "api_requests": 2854
  }
}
```
