import dotenv from 'dotenv';
dotenv.config();

import { TradingAgentHarness } from '../harness';
import { logger } from '../utils/logger';
import { TradeIntent } from '../dubstrata/types';
import crypto from 'crypto';

async function main() {
  const queryArg = process.argv.slice(2).join(' ');

  if (!queryArg) {
    logger.error('Usage: npx tsx src/scratch/analyzeMarket.ts "<Market ID, Slug, or Question>"');
    process.exit(1);
  }

  logger.info('================================================================');
  logger.info(`🔍 FUND MANAGER CAUSAL EVALUATION REQUEST: "${queryArg}"`);
  logger.info('================================================================');

  const harness = new TradingAgentHarness();
  const initialized = await harness.initialize();
  if (!initialized) {
    logger.warn('Could not initialize Dubstrata MCP. Running in simulated fallback mode.');
  }

  // 1. Inquire the market details using scouter
  logger.info('Scouting active listings...');
  const activeMarkets = await harness.gamma.fetchMarkets(100); // Fetch a broad sample
  
  let market = activeMarkets.find(m => 
    m.id === queryArg ||
    m.slug.toLowerCase().includes(queryArg.toLowerCase()) ||
    m.question.toLowerCase().includes(queryArg.toLowerCase())
  );

  if (!market) {
    logger.warn(`No active Polymarket listing found matching: "${queryArg}". Synthesizing a real-time tracking contract...`);
    market = {
      id: 'scouted-' + queryArg.replace(/\s+/g, '-').toLowerCase().slice(0, 30),
      question: queryArg,
      slug: queryArg.replace(/\s+/g, '-').toLowerCase().slice(0, 30),
      category: 'Research',
      outcomes: ['YES', 'NO'],
      outcomePrices: ['0.50', '0.50'],
      volume: '100000',
      liquidity: '5000',
      resolved: false,
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 1 day
    };
  }

  logger.info(`🎯 Targeted Listing Identified: "${market.question}"`);
  logger.info(`   Implied Probabilities: YES: ${Math.round(parseFloat(market.outcomePrices[0]) * 100)}% | NO: ${Math.round(parseFloat(market.outcomePrices[1]) * 100)}%`);

  // 2. Perform advanced entity parsing
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

  // 3. Query Dubstrata Graph-RAG
  logger.info(`🧠 Querying Dubstrata Graph RAG for question context...`);
  const graphContext = await harness.dubstrata.queryGraph(market.question);

  logger.info(`🧠 Inquiring surgical facts about entity: "${mainEntity}"...`);
  const facts = await harness.dubstrata.getAllFacts(mainEntity);

  logger.info(`🧠 Investigating contrarian conflicts for: "${mainEntity}"...`);
  const conflicts = await harness.dubstrata.findConflicts(mainEntity);

  // Evaluate compliance mandate for sizing checks
  const dailySpent = harness.auditLogger.getDailySpentUSD('antigravity-fund-manager');
  const mandateEvaluation = harness.verifier.evaluateTrade(
    'antigravity-fund-manager',
    market.category,
    250, // standard check size
    dailySpent
  );

  // 4. Formulate causal decision via Causal LLM Sensor
  logger.info('Formulating investment decision via live causal validation sensor...');
  const evaluation = await harness.evaluateTradeDecisionViaLLM(market, {
    graphContext,
    facts,
    conflicts,
    mandateEvaluation: {
      allowed: mandateEvaluation.allowed,
      reason: mandateEvaluation.reason
    }
  });

  const { decision, confidence, betAmount, reasoning } = evaluation;

  // 5. Place simulated CLOB order or log HOLD block
  try {
    if (decision === 'HOLD') {
      const intent: TradeIntent = {
        marketId: market.id,
        marketQuestion: market.question,
        outcomeSelected: 'NO',
        probabilityImplied: parseFloat(market.outcomePrices[1] || '0.5'),
        probabilityLLM: confidence,
        reasoning,
        amountUSD: 0,
        timestamp: Date.now()
      };

      harness.auditLogger.logAudit(
        intent,
        'HOLD',
        mandateEvaluation.activeMandate?.signature ? crypto.createHash('sha256').update(mandateEvaluation.activeMandate.signature).digest('hex') : 'none',
        'SIMULATED',
        'Causal graph query error or model exception. Directed execution placed on HOLD.'
      );

      logger.warn(`🚫 Evaluation Concluded: SUSPEND TRADE (HOLD) | Market: "${market.question}"`);
    } else {
      const result = await harness.executeTradeDecision(
        market,
        decision,
        betAmount,
        confidence,
        reasoning
      );

      logger.info('\n================================================================');
      logger.info('✅ DIRECTED POSITION EXECUTED SUCCESSFULLY!');
      logger.info('================================================================');
      console.log(JSON.stringify(result, null, 2));
      
      const logs = harness.auditLogger.readAuditLogs();
      const latestBlock = logs[logs.length - 1];
      logger.info('\n🔒 CRYPTOGRAPHIC COMPLIANCE LEDGER RECEIPT:');
      console.log(`- Block ID:        ${latestBlock.id}`);
      console.log(`- Decision Action: BUY ${latestBlock.intent.outcomeSelected}`);
      console.log(`- Compliance Sig:  ${latestBlock.mandateHash.slice(0, 16)}... (EIP-712 Active)`);
      console.log(`- Chain Proof:     ${latestBlock.verificationHash}`);
      logger.info('================================================================');
    }
  } catch (err: any) {
    logger.error(`Directed trade failed: ${err.message}`);
  } finally {
    await harness.shutdown();
  }
}

main().catch(console.error);
