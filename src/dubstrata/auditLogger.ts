import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ContentAuditEntry, ContentIntent } from './types';
import { logger } from '../utils/logger';
import { eventBroker } from '../utils/eventBroker';

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
      const lastEntry: ContentAuditEntry = JSON.parse(lastLine);
      return lastEntry.verificationHash;
    } catch (err: any) {
      logger.warn(`Could not read previous verification hash: ${err.message}. Defaulting to genesis hash.`);
      return '0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  public logAudit(
    intent: ContentIntent,
    decision: 'PUBLISH' | 'REJECT' | 'HOLD',
    complianceHash: string,
    executionStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SIMULATED'
  ): ContentAuditEntry {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const previousHash = this.getPreviousHash();

    // Constructing raw hash payload for cryptographic verification chain
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

    const entry: ContentAuditEntry = {
      id,
      intent,
      decision,
      complianceHash,
      executionStatus,
      timestamp,
      verificationHash
    };

    try {
      this.ensureLogDirExists();
      fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
      logger.info(`📝 Cryptographically chained Content Audit Entry logged! Type: ${intent.type}, Decision: ${decision}, Hash: ${verificationHash.slice(0, 8)}...`);
      eventBroker.broadcast('audit_logged', entry);
    } catch (err: any) {
      logger.error(`Failed to write cryptographically chained audit: ${err.message}`);
    }

    return entry;
  }

  public readAuditLogs(): ContentAuditEntry[] {
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
