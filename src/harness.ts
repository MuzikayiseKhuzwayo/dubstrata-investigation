import { DubstrataMCPClient } from './dubstrata/client';
import { MandateVerifier } from './dubstrata/mandateVerifier';
import { AuditLogger } from './dubstrata/auditLogger';
import { GammaClient, PolymarketMarket } from './polymarket/gammaClient';
import { ClobClient } from './polymarket/clobClient';
import { logger } from './utils/logger';
import { TradeIntent } from './dubstrata/types';

export class TradingAgentHarness {
  public dubstrata: DubstrataMCPClient;
  public verifier: MandateVerifier;
  public auditLogger: AuditLogger;
  public gamma: GammaClient;
  public clob: ClobClient;
  private isConnected = false;

  constructor() {
    this.dubstrata = new DubstrataMCPClient();
    this.verifier = new MandateVerifier();
    this.auditLogger = new AuditLogger();
    this.gamma = new GammaClient();
    this.clob = new ClobClient(
      './data/portfolio.json',
      process.env.SIMULATION_MODE !== 'false'
    );
  }

  public async initialize(): Promise<boolean> {
    logger.info('Initializing Dubstrata-MCP Trading Agent Harness...');
    this.isConnected = await this.dubstrata.connect();
    return this.isConnected;
  }

  public async shutdown() {
    logger.info('Shutting down trading harness...');
    await this.dubstrata.disconnect();
  }

  // Prepares a deep causal research investment memo using the 8 surgical graph tools!
  public async researchMarket(questionQuery: string): Promise<{
    market: PolymarketMarket;
    graphContext: string;
    conflicts: string;
    facts: string;
    mandateEvaluation: { allowed: boolean; reason?: string };
    memo: string;
  }> {
    // 1. Scout Polymarket
    const activeMarkets = await this.gamma.fetchMarkets();
    
    // Find matching market or fallback to simulated/new
    let market = activeMarkets.find(m => 
      m.question.toLowerCase().includes(questionQuery.toLowerCase()) || 
      m.slug.toLowerCase().includes(questionQuery.toLowerCase())
    );

    if (!market) {
      logger.warn(`No active Polymarket listing found matching: "${questionQuery}". Synthesizing scouting record...`);
      market = {
        id: 'scouted-' + questionQuery.replace(/\s+/g, '-').toLowerCase().slice(0, 30),
        question: questionQuery,
        slug: questionQuery.replace(/\s+/g, '-').toLowerCase().slice(0, 30),
        category: 'Research',
        outcomes: ['YES', 'NO'],
        outcomePrices: ['0.50', '0.50'],
        volume: '100000',
        liquidity: '5000',
        resolved: false,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    logger.info(`🔍 Scouting data retrieved: "${market.question}" | Implied Probability: ${Math.round(parseFloat(market.outcomePrices[0]) * 100)}% YES`);

    // 2. Query the Dubstrata Causal Graph using surgical tools
    logger.info(`🧠 Inquiring Dubstrata Graph RAG for causal contexts...`);
    const graphContextRaw = await this.dubstrata.queryGraph(market.question);
    
    // Extract primary entity names from the question for factual surgical retrieval
    const cleanQ = market.question.replace(/^(will|is|can|does|should|would|could|whether|what|who|which|the|highest|lowest|temperature|in|be|on|after|before)\s+/i, '');
    const cleanWords = cleanQ.split(/\s+/);
    const entityParts: string[] = [];
    
    for (const w of cleanWords) {
      const clean = w.replace(/[^a-zA-Z]/g, '');
      if (clean.length > 0 && clean[0] === clean[0].toUpperCase()) {
        entityParts.push(clean);
      } else if (entityParts.length > 0) {
        break;
      }
    }
    const mainEntity = entityParts.length > 0 ? entityParts.join(' ') : 'Market Subject';

    logger.info(`🧠 Retrieving factual claims about entity: "${mainEntity}"...`);
    const factsRaw = await this.dubstrata.getAllFacts(mainEntity);

    logger.info(`🧠 Scanning for contrarian conflicts or source contradictions...`);
    const conflictsRaw = await this.dubstrata.findConflicts(mainEntity);

    // Parse domain from resolution source if present to assess credibility
    let domainTrustReport = 'No domain checks performed.';
    if (market.resolutionSource) {
      try {
        const url = new URL(market.resolutionSource);
        logger.info(`🧠 Evaluating historical credibility of source domain: "${url.hostname}"...`);
        domainTrustReport = await this.dubstrata.checkSourceTrust(url.hostname);
      } catch {
        // Ignored
      }
    }

    // 3. Evaluate Compliance Mandates
    const dailySpent = this.auditLogger.getDailySpentUSD('antigravity-fund-manager');
    const mandateEvaluation = this.verifier.evaluateTrade(
      'antigravity-fund-manager',
      market.category,
      250, // standard check size
      dailySpent
    );

    // 4. Construct beautiful Investment Memo
    const memo = `
================================================================================
                    DUBSTRATA AGENTIC CAUSAL INVESTMENT MEMO                    
================================================================================
[MARKET SCOUT]
Question:     ${market.question}
Category:     ${market.category}
Implied Odds: YES: ${Math.round(parseFloat(market.outcomePrices[0]) * 100)}% | NO: ${Math.round(parseFloat(market.outcomePrices[1]) * 100)}%
Volume:       $${parseFloat(market.volume).toLocaleString()}
Expires:      ${new Date(market.endDate).toLocaleString()}

[DUBSTRATA CAUSAL CONTEXTS (Graph RAG)]
${this.formatJSONString(graphContextRaw)}

[ENTITY FACT SHEETS: ${mainEntity}]
${this.formatJSONString(factsRaw)}

[CONTRARIAN CONFLICT SCAN]
${this.formatJSONString(conflictsRaw)}

[SOURCE CREDIBILITY AUDIT]
Resolution Domain: ${market.resolutionSource || 'Self-referential / General'}
Trust Assessment:
${this.formatJSONString(domainTrustReport)}

[REGULATORY COMPLIANCE MANDATE]
Evaluation Address:  ${mandateEvaluation.activeMandate?.signerAddress || 'unloaded'}
EIP-712 Compliance:  ${mandateEvaluation.allowed ? '✅ SECURE - APPROVED' : '🚫 BLOCKED'}
Friction Details:    ${mandateEvaluation.reason || 'None. Fully within trading parameters.'}
Daily Limit Room:    $${mandateEvaluation.activeMandate ? mandateEvaluation.activeMandate.dailyLimit - dailySpent : 0} of $${mandateEvaluation.activeMandate?.dailyLimit || 0} remaining
================================================================================
`;

    return {
      market,
      graphContext: graphContextRaw,
      conflicts: conflictsRaw,
      facts: factsRaw,
      mandateEvaluation: {
        allowed: mandateEvaluation.allowed,
        reason: mandateEvaluation.reason
      },
      memo
    };
  }

  private formatJSONString(raw: string): string {
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  // Place simulated trade after we make a decision
  public async executeTradeDecision(
    market: PolymarketMarket,
    outcome: 'YES' | 'NO',
    amountUSD: number,
    probabilityLLM: number,
    reasoning: string
  ) {
    const dailySpent = this.auditLogger.getDailySpentUSD('antigravity-fund-manager');
    const mandateResult = this.verifier.evaluateTrade(
      'antigravity-fund-manager',
      market.category,
      amountUSD,
      dailySpent
    );

    const intent: TradeIntent = {
      marketId: market.id,
      marketQuestion: market.question,
      outcomeSelected: outcome,
      probabilityImplied: parseFloat(market.outcomePrices[outcome === 'YES' ? 0 : 1]),
      probabilityLLM,
      reasoning,
      amountUSD,
      timestamp: Date.now()
    };

    if (!mandateResult.allowed) {
      logger.warn(`🚫 Trade Rejected by Mandate: ${mandateResult.reason}`);
      this.auditLogger.logAudit(
        intent,
        'BLOCKED_BY_MANDATE',
        mandateResult.activeMandate?.signature ? crypto.createHash('sha256').update(mandateResult.activeMandate.signature).digest('hex') : 'none',
        'FAILED',
        mandateResult.reason
      );
      throw new Error(`Trade Blocked by Compliancy Mandate: ${mandateResult.reason}`);
    }

    const price = parseFloat(market.outcomePrices[outcome === 'YES' ? 0 : 1]);

    logger.info(`Executing Trade on CLOB: BUY ${outcome} size $${amountUSD}...`);
    const orderResult = await this.clob.placeOrder(
      market.id,
      market.question,
      outcome,
      amountUSD,
      price
    );

    // Cryptographic log append
    this.auditLogger.logAudit(
      intent,
      'BUY',
      crypto.createHash('sha256').update(mandateResult.activeMandate!.signature).digest('hex'),
      orderResult.status,
      undefined,
      orderResult.price,
      orderResult.shares,
      orderResult.txHash
    );

    return orderResult;
  }
}

import crypto from 'crypto';
