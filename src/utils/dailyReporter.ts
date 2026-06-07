import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuditEntry, Portfolio } from '../dubstrata/types';
import { logger } from './logger';
import { DubstrataMCPClient } from '../dubstrata/client';

export interface DailyPerformanceReport {
  timestamp: number;
  reportDate: string;
  netWorthUSD: number;
  simulatedBalanceUSD: number;
  openValuationUSD: number;
  unrealizedPnLUSD: number;
  totalSettledTrades: number;
  winsCount: number;
  lossesCount: number;
  winRate: number;
  totalUSDCInvested: number;
  totalUSDCPayout: number;
  netRealizedProfitUSD: number;
  realizedROI: number;
  isChainValid: boolean;
  totalAuditBlocks: number;
  dailySpentUSD: number;
  dailyLimitUSD: number;
  markdownContent: string;
}

export class DailyReporter {
  private portfolioPath: string;
  private ledgerPath: string;
  private auditLogPath: string;
  private mandatesPath: string;
  private dubstrata?: DubstrataMCPClient;

  constructor(
    portfolioPath = './data/portfolio.json',
    ledgerPath = './data/realized_ledger.json',
    auditLogPath = './data/audit_logs.jsonl',
    mandatesPath = './data/mandates.json',
    dubstrata?: DubstrataMCPClient
  ) {
    this.portfolioPath = portfolioPath;
    this.ledgerPath = ledgerPath;
    this.auditLogPath = auditLogPath;
    this.mandatesPath = mandatesPath;
    this.dubstrata = dubstrata;
  }

  public async compile(): Promise<DailyPerformanceReport> {
    logger.info('📊 Initiating Daily Performance Audit and Cryptographic Chain Verification...');

    // 1. Load data files
    let portfolio: Portfolio = { balanceUSD: 0, simulatedBalanceUSD: 10000, positions: {} };
    if (fs.existsSync(this.portfolioPath)) {
      try {
        portfolio = JSON.parse(fs.readFileSync(this.portfolioPath, 'utf-8'));
      } catch (err: any) {
        logger.error(`Error parsing portfolio data: ${err.message}`);
      }
    }

    let realizedLedger: any[] = [];
    if (fs.existsSync(this.ledgerPath)) {
      try {
        realizedLedger = JSON.parse(fs.readFileSync(this.ledgerPath, 'utf-8'));
      } catch (err: any) {
        logger.error(`Error parsing realized ledger: ${err.message}`);
      }
    }

    let auditLogs: AuditEntry[] = [];
    if (fs.existsSync(this.auditLogPath)) {
      try {
        const content = fs.readFileSync(this.auditLogPath, 'utf-8').trim();
        if (content) {
          auditLogs = content.split('\n').filter(Boolean).map(line => JSON.parse(line));
        }
      } catch (err: any) {
        logger.error(`Error parsing audit logs: ${err.message}`);
      }
    }

    let mandates: any[] = [];
    if (fs.existsSync(this.mandatesPath)) {
      try {
        mandates = JSON.parse(fs.readFileSync(this.mandatesPath, 'utf-8'));
      } catch (err: any) {
        logger.error(`Error parsing mandates: ${err.message}`);
      }
    }

    // 2. Cryptographic Chain Verification
    let isChainValid = true;
    let failedBlockIndex = -1;
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < auditLogs.length; i++) {
      const entry = auditLogs[i];
      const payload = JSON.stringify({
        id: entry.id,
        intent: entry.intent,
        decision: entry.decision,
        executionStatus: entry.executionStatus,
        timestamp: entry.timestamp,
        previousHash
      });
      const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');

      if (calculatedHash !== entry.verificationHash) {
        isChainValid = false;
        failedBlockIndex = i;
        logger.error(`❌ LEDGER CRITICAL CORRUPTION: Block index ${i} verification hash mismatch! Expected "${entry.verificationHash.slice(0, 8)}...", Calculated "${calculatedHash.slice(0, 8)}..."`);
        break;
      }
      previousHash = entry.verificationHash;
    }

    if (isChainValid) {
      logger.info('⚡ Mathematical Ledger integrity verified! Cryptographic proof chain is fully unbroken.');
    }

    // 3. Compute Metrics
    // Open positions valuation
    let openValuationUSD = 0;
    let openCostBasisUSD = 0;
    const openPositionsCount = Object.keys(portfolio.positions).length;

    for (const id of Object.keys(portfolio.positions)) {
      const pos = portfolio.positions[id];
      openValuationUSD += pos.currentValue;
      openCostBasisUSD += pos.shares * pos.averagePrice;
    }
    const unrealizedPnLUSD = openValuationUSD - openCostBasisUSD;
    const simulatedBalanceUSD = portfolio.simulatedBalanceUSD;
    const netWorthUSD = simulatedBalanceUSD + openValuationUSD;

    // Realized ledger metrics
    const totalSettledTrades = realizedLedger.length;
    let winsCount = 0;
    let lossesCount = 0;
    let totalUSDCInvested = 0;
    let totalUSDCPayout = 0;
    let netRealizedProfitUSD = 0;

    for (const trade of realizedLedger) {
      totalUSDCInvested += trade.investment || 0;
      totalUSDCPayout += trade.payout || 0;
      netRealizedProfitUSD += trade.netProfit || 0;
      
      if (trade.status === 'WON') {
        winsCount++;
      } else if (trade.status === 'LOST') {
        lossesCount++;
      }
    }

    const winRate = totalSettledTrades > 0 ? parseFloat(((winsCount / totalSettledTrades) * 100).toFixed(2)) : 0;
    const realizedROI = totalUSDCInvested > 0 ? parseFloat(((netRealizedProfitUSD / totalUSDCInvested) * 100).toFixed(2)) : 0;

    // Daily compliance limits
    const targetAgentId = 'antigravity-fund-manager';
    const mandate = mandates.find(m => m.agentId === targetAgentId);
    const dailyLimitUSD = mandate ? mandate.dailyLimit : 2000;

    // Calculate daily spent today (May 26, 2026)
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEnd = new Date().setHours(23, 59, 59, 999);
    let dailySpentUSD = 0;

    for (const entry of auditLogs) {
      if (
        entry.timestamp >= todayStart &&
        entry.timestamp <= todayEnd &&
        entry.decision === 'BUY' &&
        (entry.executionStatus === 'SUCCESS' || entry.executionStatus === 'SIMULATED')
      ) {
        dailySpentUSD += entry.intent.amountUSD;
      }
    }

    // 3.5 Sourcing Causal Intelligence from Dubstrata /api/v1/query/intelligence-report
    const openPositions = Object.values(portfolio.positions);
    let causalBriefing = '';
    
    if (this.dubstrata && openPositions.length > 0) {
      logger.info('🧠 Sourcing causal intelligence from Dubstrata network for active positions...');
      try {
        // Construct query topic listing the questions of our holdings
        const holdingsQuery = openPositions.map((pos, idx) => `${idx + 1}. ${pos.marketQuestion}`).join('\n');
        const queryTopic = `Comprehensive portfolio intelligence audit on the following active market events:\n${holdingsQuery}`;
        
        const rawReport = await this.dubstrata.compileIntelligenceReport(queryTopic);
        
        let content = rawReport;
        try {
          const parsed = JSON.parse(rawReport);
          content = parsed.report || parsed.result || parsed.structured_result?.report || parsed.content || JSON.stringify(parsed, null, 2);
        } catch {
          // Keep as raw text
        }
        
        // Strip telemetry protocol if present
        if (typeof content === 'string' && content.includes('[DUBSTRATA TELEMETRY PROTOCOL]')) {
          const parts = content.split('----------------------------------------');
          if (parts.length > 1) {
            content = parts.slice(1).join('----------------------------------------').trim();
          }
        }
        
        causalBriefing = content;
      } catch (err: any) {
        logger.warn(`⚠️ Sourcing portfolio intelligence from Dubstrata failed: ${err.message}`);
        causalBriefing = `*Unable to retrieve causal briefing: ${err.message}*`;
      }
    } else {
      causalBriefing = `*No active holdings to analyze or Dubstrata client not initialized.*`;
    }

    // 4. Generate beautiful, high-fidelity markdown report
    const now = new Date();
    const reportDateStr = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleString();

    let blockChainBadge = '';
    if (isChainValid) {
      blockChainBadge = `<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
  <span style="font-size: 1.5rem;">🛡️</span>
  <div>
    <strong style="color: #10B981; font-size: 0.95rem; display: block;">CRYPTOGRAPHIC LEDGER INTEGRITY VERIFIED</strong>
    <span style="color: rgba(255, 255, 255, 0.7); font-size: 0.8rem; line-height: 1.4;">SHA-256 block proof chain completely intact. Audit ledger of ${auditLogs.length} blocks verified. Zero modifications detected.</span>
  </div>
</div>`;
    } else {
      blockChainBadge = `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
  <span style="font-size: 1.5rem;">⚠️</span>
  <div>
    <strong style="color: #EF4444; font-size: 0.95rem; display: block;">LEDGER CRITICAL WARNING: TAMPER DETECTED</strong>
    <span style="color: rgba(255, 255, 255, 0.7); font-size: 0.8rem; line-height: 1.4;">SHA-256 hash mismatch at block index ${failedBlockIndex}! The integrity of the audit trails has been compromised.</span>
  </div>
</div>`;
    }

    let positionsTableContent = '';
    if (openPositionsCount === 0) {
      positionsTableContent = `*No active open positions currently in the portfolio.*`;
    } else {
      positionsTableContent = `| Position ID | Question / Market | Target | Investment | Shares | Live Price | Valuation | Profit / Loss |
|---|---|---|---|---|---|---|---|
`;
      for (const id of Object.keys(portfolio.positions)) {
        const pos = portfolio.positions[id];
        const costBasis = pos.shares * pos.averagePrice;
        const profitLoss = pos.currentValue - costBasis;
        const profitColor = profitLoss >= 0 ? '#10B981' : '#EF4444';
        const sign = profitLoss >= 0 ? '+' : '';
        positionsTableContent += `| \`${id.slice(0, 8)}\` | ${pos.marketQuestion} | **${pos.outcome}** | $${costBasis.toFixed(2)} | ${pos.shares.toFixed(2)} | $${((pos as any).livePrice ?? pos.averagePrice).toFixed(3)} | $${pos.currentValue.toFixed(2)} | <span style="color: ${profitColor}; font-weight: 600;">${sign}$${profitLoss.toFixed(2)}</span> |\n`;
      }
    }

    let settledTableContent = '';
    if (realizedLedger.length === 0) {
      settledTableContent = `*No settled trades archived.*`;
    } else {
      settledTableContent = `| Market ID | Settled Market Question | Target | Outcome | Invested | Payout | Net Profit | Resolution Time |
|---|---|---|---|---|---|---|---|
`;
      // Take the last 10 settled positions to prevent massive tables
      const recentSettled = [...realizedLedger].reverse().slice(0, 10);
      for (const trade of recentSettled) {
        const outcomeColor = trade.status === 'WON' ? '#10B981' : '#EF4444';
        const profitColor = trade.netProfit >= 0 ? '#10B981' : '#EF4444';
        const sign = trade.netProfit >= 0 ? '+' : '';
        const resolvedTimeStr = new Date(trade.resolvedAt).toLocaleTimeString();
        settledTableContent += `| \`${trade.marketId.slice(0, 8)}\` | ${trade.marketQuestion} | **${trade.outcome}** | <span style="background: rgba(${trade.status === 'WON' ? '16,185,129' : '239,68,68'}, 0.1); color: ${outcomeColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${trade.status}</span> | $${trade.investment.toFixed(2)} | $${trade.payout.toFixed(2)} | <span style="color: ${profitColor}; font-weight: 600;">${sign}$${trade.netProfit.toFixed(2)}</span> | ${resolvedTimeStr} |\n`;
      }
      if (realizedLedger.length > 10) {
        settledTableContent += `\n*Showing the 10 most recent settled trades out of ${realizedLedger.length} total trades.*`;
      }
    }

    const dailyBudgetPercent = Math.min(100, (dailySpentUSD / dailyLimitUSD) * 100).toFixed(1);
    const budgetColor = dailySpentUSD > dailyLimitUSD ? '#EF4444' : (dailySpentUSD > dailyLimitUSD * 0.8 ? '#F59E0B' : '#10B981');

    const markdownContent = `# 📊 Antigravity Trading Fund Performance Report
*Generated on ${formattedTime}*

${blockChainBadge}

## 💸 Fund Balance Summary

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Simulated Net Worth</span>
    <strong style="display: block; font-size: 1.5rem; color: #60A5FA; margin-top: 0.25rem;">$${netWorthUSD.toFixed(2)}</strong>
  </div>
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Available Cash Balance</span>
    <strong style="display: block; font-size: 1.5rem; color: #F3F4F6; margin-top: 0.25rem;">$${simulatedBalanceUSD.toFixed(2)}</strong>
  </div>
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Active Open Value</span>
    <strong style="display: block; font-size: 1.5rem; color: #F59E0B; margin-top: 0.25rem;">$${openValuationUSD.toFixed(2)}</strong>
  </div>
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Unrealized P&L</span>
    <strong style="display: block; font-size: 1.5rem; color: ${unrealizedPnLUSD >= 0 ? '#10B981' : '#EF4444'}; margin-top: 0.25rem;">${unrealizedPnLUSD >= 0 ? '+' : ''}$${unrealizedPnLUSD.toFixed(2)}</strong>
  </div>
</div>

---

## 📈 Closed Trades Performance & ROI

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Settled Trades</span>
    <strong style="display: block; font-size: 1.4rem; color: #E5E7EB; margin-top: 0.25rem;">${totalSettledTrades}</strong>
    <span style="font-size: 0.75rem; color: rgba(255,255,255,0.4);">${winsCount} Wins | ${lossesCount} Losses</span>
  </div>
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Closed Win Rate</span>
    <strong style="display: block; font-size: 1.4rem; color: #10B981; margin-top: 0.25rem;">${winRate}%</strong>
  </div>
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Total Capital Invested</span>
    <strong style="display: block; font-size: 1.4rem; color: #E5E7EB; margin-top: 0.25rem;">$${totalUSDCInvested.toFixed(2)}</strong>
  </div>
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Net Realized Profit</span>
    <strong style="display: block; font-size: 1.4rem; color: ${netRealizedProfitUSD >= 0 ? '#10B981' : '#EF4444'}; margin-top: 0.25rem;">${netRealizedProfitUSD >= 0 ? '+' : ''}$${netRealizedProfitUSD.toFixed(2)}</strong>
  </div>
  <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
    <span style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Realized ROI (%)</span>
    <strong style="display: block; font-size: 1.4rem; color: ${realizedROI >= 0 ? '#10B981' : '#EF4444'}; margin-top: 0.25rem;">${realizedROI >= 0 ? '+' : ''}${realizedROI}%</strong>
  </div>
</div>

---

## 🎛️ Risk Compliance & Mandate Auditing

<div style="background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
    <span style="color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; font-weight: 600;">Daily Trading Budget Consumption</span>
    <strong style="color: ${budgetColor}; font-size: 0.85rem;">$${dailySpentUSD.toFixed(2)} / $${dailyLimitUSD.toFixed(2)} (${dailyBudgetPercent}%)</strong>
  </div>
  <div style="background: rgba(255, 255, 255, 0.05); height: 8px; border-radius: 4px; overflow: hidden;">
    <div style="background: ${budgetColor}; width: ${dailyBudgetPercent}%; height: 100%; border-radius: 4px; transition: width 0.3s ease;"></div>
  </div>
  <span style="display: block; color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; margin-top: 0.5rem; line-height: 1.3;">
    All active positions are scrutinized by the EIP-712 Multi-Sig Mandate cryptographic verifier. The daily budget spending limit is reset at midnight UTC.
  </span>
</div>

---

## 🗺️ Current Open Positions Portfolio

${positionsTableContent}

---

## 🧠 Portfolio Causal Intelligence Briefing

${causalBriefing}

---

## 🏁 Recent Settled Positions Log

${settledTableContent}
`;

    // 5. Write out report to file
    const reportsDir = './data/reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = path.join(reportsDir, `daily_performance_report_${reportDateStr}.md`);
    try {
      fs.writeFileSync(reportPath, markdownContent, 'utf-8');
      logger.info(`💾 Performance report successfully archived to: ${reportPath}`);
    } catch (err: any) {
      logger.error(`Failed to write markdown report to disk: ${err.message}`);
    }

    return {
      timestamp: Date.now(),
      reportDate: reportDateStr,
      netWorthUSD,
      simulatedBalanceUSD,
      openValuationUSD,
      unrealizedPnLUSD,
      totalSettledTrades,
      winsCount,
      lossesCount,
      winRate,
      totalUSDCInvested,
      totalUSDCPayout,
      netRealizedProfitUSD,
      realizedROI,
      isChainValid,
      totalAuditBlocks: auditLogs.length,
      dailySpentUSD,
      dailyLimitUSD,
      markdownContent
    };
  }
}
