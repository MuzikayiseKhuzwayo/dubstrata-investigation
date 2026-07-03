export interface ContentIntent {
  assetId: string;
  topic: string;
  type: 'X' | 'VIDEO' | 'OUTREACH' | 'GEOPOLITICAL';
  promptUsed: string;
  causalFactScraped: string;
  generatedText: string;
  timestamp: number;
}

export interface ContentAuditEntry {
  id: string;
  intent: ContentIntent;
  decision: 'PUBLISH' | 'REJECT' | 'HOLD';
  complianceHash: string; // Hash of the verification constraints
  executionStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SIMULATED';
  timestamp: number;
  verificationHash: string; // SHA-256 chained hash of (id + intentJSON + decision + status + timestamp + previousHash)
}
