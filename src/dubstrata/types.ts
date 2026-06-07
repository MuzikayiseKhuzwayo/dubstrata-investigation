export interface Mandate {
  agentId: string;
  maxPositionSize: number; // in USD
  allowedCategories: string[];
  dailyLimit: number; // in USD
  expiration: number; // timestamp in seconds
  signature: string; // EIP-712 signature proving authorization
  signerAddress: string; // The principal (e.g. fund owner) who signed the mandate
}

export interface TradeIntent {
  marketId: string;
  marketQuestion: string;
  outcomeSelected: 'YES' | 'NO';
  probabilityImplied: number;
  probabilityLLM: number;
  reasoning: string;
  amountUSD: number;
  timestamp: number;
}

export interface AuditEntry {
  id: string;
  intent: TradeIntent;
  mandateHash: string; // Hash of the active mandate under which this was executed
  decision: 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED_BY_MANDATE';
  blockReason?: string;
  executionStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SIMULATED';
  transactionHash?: string;
  executionPrice?: number;
  sharesAcquired?: number;
  timestamp: number;
  verificationHash: string; // SHA-256 hash of (id + intentJSON + decision + status + timestamp + previousHash)
}

export interface Portfolio {
  balanceUSD: number;
  simulatedBalanceUSD: number;
  positions: {
    [marketId: string]: {
      marketQuestion: string;
      outcome: 'YES' | 'NO';
      shares: number;
      averagePrice: number;
      currentValue: number;
      timestamp: number;
      endDate?: string;
    }
  };
}
