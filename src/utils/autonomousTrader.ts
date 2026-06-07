import { TradingAgentHarness } from '../harness';
import { logger } from './logger';
import { PolymarketMarket } from '../polymarket/gammaClient';
import crypto from 'crypto';

export class AutonomousTraderDaemon {
  private harness: TradingAgentHarness;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private intervalMs: number = 90000; // Check and evaluate tracked markets every 90 seconds
  private lastRunTime: number = 0;
  private runHistory: Array<{ timestamp: number; marketsChecked: number; actionsTaken: string[] }> = [];

  constructor(harness: TradingAgentHarness) {
    this.harness = harness;
  }

  public start() {
    if (this.isRunning) {
      logger.info('Autonomous Trader Daemon is already running.');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting Autonomous Trader Daemon background monitoring loop...');

    // Run first cycle immediately
    this.runCycle().catch((err) => {
      logger.error(`Error in Autonomous Trader Daemon startup cycle: ${err.message}`);
    });

    this.intervalId = setInterval(() => {
      this.runCycle().catch((err) => {
        logger.error(`Error in Autonomous Trader Daemon execution cycle: ${err.message}`);
      });
    }, this.intervalMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('⏹️ Stopped Autonomous Trader Daemon background monitoring.');
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      lastRunTime: this.lastRunTime,
      runHistory: this.runHistory.slice(-10) // Keep history of last 10 execution cycles
    };
  }

  private async runCycle() {
    this.lastRunTime = Date.now();
    logger.info('🤖 [AUTONOMOUS CYCLE] Starting systematic news-derived market scan...');

    const actionsTaken: string[] = [];

    try {
      // 1. Fetch currently tracked markets based on news (RSS trends) + baseline active ones
      logger.info('[AUTONOMOUS CYCLE] Fetching RSS-derived tracked markets from harness...');
      const trackedMarkets = await this.harness.fetchTrackedMarkets();

      if (trackedMarkets.length === 0) {
        logger.warn('[AUTONOMOUS CYCLE] No tracked markets fetched. Skipping cycle.');
        return;
      }

      // Load active portfolio positions
      const portfolio = this.harness.clob.loadPortfolio();
      const heldMarketIds = new Set(Object.keys(portfolio.positions));

      // Load recent audit logs to prevent spamming evaluations on the same contract
      const auditLogs = this.harness.auditLogger.readAuditLogs();

      for (const market of trackedMarkets) {
        // Skip if we already hold a position in this market
        if (heldMarketIds.has(market.id)) {
          logger.debug(`[AUTONOMOUS CYCLE] Skipping market "${market.question}" (position already held).`);
          continue;
        }

        // Skip if evaluated in the last 12 hours
        const recentAudit = auditLogs.find(
          (log) =>
            log.intent.marketId === market.id &&
            Date.now() - log.intent.timestamp < 12 * 60 * 60 * 1000
        );
        if (recentAudit) {
          logger.debug(`[AUTONOMOUS CYCLE] Skipping market "${market.question}" (evaluated recently in audit block ${recentAudit.id}).`);
          continue;
        }

        logger.info(`🤖 [AUTONOMOUS CYCLE] New tracked market identified for check: "${market.question}"`);

        // 2. Perform deep causal research via Dubstrata Graph-RAG
        const research = await this.harness.researchMarket(market.question);

        // 3. Formulate causal decision via Causal LLM Sensor
        const evaluation = await this.harness.evaluateTradeDecisionViaLLM(market, research);

        const { decision, confidence, betAmount, reasoning } = evaluation;

        if (decision === 'HOLD') {
          logger.info(`🤖 [AUTONOMOUS CYCLE] Decision on "${market.question}": HOLD. Log trace generated.`);

          // Log checking trace to cryptographic audit ledger
          const dailySpent = this.harness.auditLogger.getDailySpentUSD('antigravity-fund-manager');
          const mandateResult = this.harness.verifier.evaluateTrade(
            'antigravity-fund-manager',
            market.category,
            0,
            dailySpent
          );

          const intent = {
            marketId: market.id,
            marketQuestion: market.question,
            outcomeSelected: 'NO' as 'YES' | 'NO',
            probabilityImplied: parseFloat(market.outcomePrices[1] || '0.5'),
            probabilityLLM: confidence,
            reasoning,
            amountUSD: 0,
            timestamp: Date.now()
          };

          this.harness.auditLogger.logAudit(
            intent,
            'HOLD',
            mandateResult.activeMandate?.signature ? crypto.createHash('sha256').update(mandateResult.activeMandate.signature).digest('hex') : 'none',
            'SIMULATED',
            'Autonomous daemon scan: Evaluated and stood aside (neutral or lack of edge).'
          );

          actionsTaken.push(`Evaluated "${market.question}" -> HOLD`);
        } else {
          logger.info(`🤖 [AUTONOMOUS CYCLE] EXECUTION TRADE DETECTED: BUY ${decision} size $${betAmount} | Market: "${market.question}"`);

          // Submit the simulated trade to CLOB client
          const orderResult = await this.harness.executeTradeDecision(
            market,
            decision,
            betAmount,
            confidence,
            reasoning
          );

          actionsTaken.push(`Executed BUY ${decision} ($${betAmount}) on "${market.question}"`);
        }
      }

      logger.info(`🤖 [AUTONOMOUS CYCLE] Scan complete. Total actions taken: ${actionsTaken.length}`);
    } catch (err: any) {
      logger.error(`[AUTONOMOUS CYCLE ERROR] Cycle failed: ${err.message}`);
    }

    this.runHistory.push({
      timestamp: this.lastRunTime,
      marketsChecked: 10,
      actionsTaken
    });

    // Keep history capped
    if (this.runHistory.length > 50) {
      this.runHistory.shift();
    }
  }
}
