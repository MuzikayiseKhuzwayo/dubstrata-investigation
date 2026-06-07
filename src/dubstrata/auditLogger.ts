import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuditEntry, TradeIntent } from './types';
import { logger } from '../utils/logger';

export class AuditLogger {
  private logPath: string;

  constructor(logPath: string = process.env.DUBSTRATA_AUDIT_LOG_PATH || './data/audit_logs.jsonl') {
    this.logPath = logPath;
    this.ensureLogDirExists();
  }

  private ensureLogDirExists() {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private getPreviousHash(): string {
    try {
      if (!fs.existsSync(this.logPath)) {
        return '0000000000000000000000000000000000000000000000000000000000000000';
      }

      const fileContent = fs.readFileSync(this.logPath, 'utf-8').trim();
      if (!fileContent) {
        return '0000000000000000000000000000000000000000000000000000000000000000';
      }

      const lines = fileContent.split('\n');
      const lastLine = lines[lines.length - 1];
      const lastEntry: AuditEntry = JSON.parse(lastLine);
      return lastEntry.verificationHash;
    } catch (err: any) {
      logger.warn(`Could not read previous verification hash: ${err.message}. Defaulting to genesis hash.`);
      return '0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  public getDailySpentUSD(agentId: string): number {
    try {
      if (!fs.existsSync(this.logPath)) {
        return 0;
      }

      const fileContent = fs.readFileSync(this.logPath, 'utf-8').trim();
      if (!fileContent) {
        return 0;
      }

      const lines = fileContent.split('\n');
      const todayStart = new Date().setHours(0, 0, 0, 0);
      let totalSpent = 0;

      for (const line of lines) {
        if (!line.trim()) continue;
        const entry: AuditEntry = JSON.parse(line);
        if (
          entry.intent.timestamp >= todayStart &&
          entry.decision === 'BUY' &&
          (entry.executionStatus === 'SUCCESS' || entry.executionStatus === 'SIMULATED')
        ) {
          totalSpent += entry.intent.amountUSD;
        }
      }

      return totalSpent;
    } catch (err: any) {
      logger.error(`Error calculating daily spent: ${err.message}`);
      return 0;
    }
  }

  public logAudit(
    intent: TradeIntent,
    decision: 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED_BY_MANDATE',
    mandateHash: string,
    executionStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SIMULATED',
    blockReason?: string,
    executionPrice?: number,
    sharesAcquired?: number,
    transactionHash?: string
  ): AuditEntry {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const previousHash = this.getPreviousHash();

    // Constructing raw hash payload
    const hashPayload = JSON.stringify({
      id,
      intent,
      decision,
      executionStatus,
      timestamp,
      previousHash
    });

    const verificationHash = crypto
      .createHash('sha256')
      .update(hashPayload)
      .digest('hex');

    const entry: AuditEntry = {
      id,
      intent,
      decision,
      mandateHash,
      executionStatus,
      timestamp,
      verificationHash,
      blockReason,
      executionPrice,
      sharesAcquired,
      transactionHash
    };

    try {
      this.ensureLogDirExists();
      fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
      logger.info(`📝 Cryptographically chained Audit Entry logged! Decision: ${decision}, Status: ${executionStatus}, Verification Hash: ${verificationHash.slice(0, 8)}...`);
    } catch (err: any) {
      logger.error(`Failed to write cryptographically chained audit: ${err.message}`);
    }

    return entry;
  }

  public readAuditLogs(): AuditEntry[] {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }
      const data = fs.readFileSync(this.logPath, 'utf-8').trim();
      if (!data) return [];
      return data.split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch (err: any) {
      logger.error(`Failed to read audit logs: ${err.message}`);
      return [];
    }
  }
}
