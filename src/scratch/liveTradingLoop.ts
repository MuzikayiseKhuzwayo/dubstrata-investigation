import dotenv from 'dotenv';
dotenv.config();

import { TradingAgentHarness } from '../harness';
import { logger } from '../utils/logger';
import { TradeIntent } from '../dubstrata/types';
import crypto from 'crypto';

async function main() {
  logger.info('================================================================');
  logger.info('🤖 STARTING LIVE AGENTIC FUND MANAGER LOOP (DUBSTRATA-MCP) 🤖');
  logger.info('================================================================');

  const harness = new TradingAgentHarness();
  
  // Connect to the Dubstrata MCP server proxy
  const initialized = await harness.initialize();
  if (!initialized) {
    logger.warn('Could not initialize Dubstrata MCP client. Running in simulated fallback mode.');
  }

  // 1. Scout the live Polymarket listings sorted by closest expiration date
  logger.info('Scouting active short-term contracts...');
  const activeMarkets = await harness.gamma.fetchMarkets(3); // Fetch top 3 soonest-closing high-volume listings

  if (activeMarkets.length === 0) {
    logger.warn('No active markets scouted. Aborting trade run.');
    await harness.shutdown();
    return;
  }

  logger.info(`Successfully scouted ${activeMarkets.length} contracts for immediate evaluation.\n`);

  for (const market of activeMarkets) {
    logger.info('----------------------------------------------------------------');
    logger.info(`🔍 EVALUATING MARKET: "${market.question}"`);
    logger.info(`   Category:  ${market.category} | Expiration: ${new Date(market.endDate).toLocaleString()}`);
    logger.info(`   Odds:      YES: ${Math.round(parseFloat(market.outcomePrices[0] || '0.5') * 100)}% | NO: ${Math.round(parseFloat(market.outcomePrices[1] || '0.5') * 100)}%`);
    logger.info(`   Volume:    $${parseFloat(market.volume).toLocaleString()}`);
    logger.info('----------------------------------------------------------------');

    // 2. Query the Dubstrata Causal Graph using Graph-RAG tools
    logger.info('🧠 Inquiring Dubstrata Graph RAG...');
    const graphContext = await harness.dubstrata.queryGraph(market.question);
    
    // Extract main entity
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
    
    logger.info(`🧠 Retrieving factual claims for entity: "${mainEntity}"...`);
    const facts = await harness.dubstrata.getAllFacts(mainEntity);

    logger.info('🧠 Checking source conflicts...');
    const conflicts = await harness.dubstrata.findConflicts(mainEntity);

    // Evaluate compliance mandate for sizing checks
    const dailySpent = harness.auditLogger.getDailySpentUSD('antigravity-fund-manager');
    const mandateEvaluation = harness.verifier.evaluateTrade(
      'antigravity-fund-manager',
      market.category,
      250, // standard check size
      dailySpent
    );

    // 3. Act as the Fund Manager and formulate the trade decision via live LLM Causal sensor
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

    // 4. Execute Decision on simulated CLOB or log HOLD block
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
          'Causal graph query error or model exception. Capital protected.'
        );

        logger.info(`🚫 Live evaluation of "${market.question}" placed on HOLD.`);
      } else {
        // Execute dynamic paper-trade
        const orderResult = await harness.executeTradeDecision(
          market,
          decision,
          betAmount,
          confidence,
          reasoning
        );

        logger.info(`✅ Live evaluation complete! Executed BUY ${decision} size $${betAmount} on market: "${market.question}".`);
      }
    } catch (err: any) {
      logger.error(`Failed to execute trade decision: ${err.message}`);
    }
  }

  logger.info('\n================================================================');
  logger.info('🔥 LIVE FUND MANAGER LOOP CYCLE SUCCESSFULLY CONCLUDED!');
  logger.info('================================================================');
  
  await harness.shutdown();
}

main().catch(console.error);
