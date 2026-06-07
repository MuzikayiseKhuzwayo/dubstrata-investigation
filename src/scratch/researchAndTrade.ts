import dotenv from 'dotenv';
dotenv.config();

import { TradingAgentHarness } from '../harness';
import { logger } from '../utils/logger';
import { TradeIntent } from '../dubstrata/types';
import crypto from 'crypto';

async function main() {
  logger.info('================================================================');
  logger.info('   ⚡ STARTING DUBSTRATA CAUSAL TRADING ANALYSIS (LIVE RUN) ⚡  ');
  logger.info('================================================================');

  const harness = new TradingAgentHarness();
  
  // Connect to the local Dubstrata MCP server proxy
  const initialized = await harness.initialize();
  if (!initialized) {
    logger.warn('Could not initialize live MCP client. Running in simulation fallback mode.');
  }

  // 1. Target the Fed September 2026 Rate Hikes market
  const targetQuestion = 'Will the Fed increase interest rates by 25 bps after the September 2026 meeting?';
  logger.info(`Target Market Resolved: "${targetQuestion}"`);

  // 2. Query the Dubstrata Causal Graph using surgical tools
  const research = await harness.researchMarket(targetQuestion);
  
  console.log(research.memo);

  // 3. Act as the Fund Manager (Antigravity) and formulate our decision dynamically using Causal LLM Sensor
  logger.info('Formulating investment decision via live causal validation sensor...');
  const evaluation = await harness.evaluateTradeDecisionViaLLM(research.market, research);

  const { decision, confidence, betAmount, reasoning } = evaluation;

  logger.info(`\n📊 FUND MANAGER DECISION FORMULATED:`);
  logger.info(`- Market:     ${research.market.question}`);
  logger.info(`- Recommendation: ${decision === 'HOLD' ? 'SUSPEND TRADING (HOLD)' : 'BUY ' + decision}`);
  logger.info(`- Implied Odds (NO): ${Math.round(parseFloat(research.market.outcomePrices[1]) * 100)}% (${research.market.outcomePrices[1]}/share)`);
  logger.info(`- Agent Confidence: ${Math.round(confidence * 100)}%`);
  logger.info(`- Trade Size:     $${betAmount.toFixed(2)}`);

  // 4. Check compliance and execute the simulated trade
  try {
    if (decision === 'HOLD') {
      logger.warn('Logging compliance-enforced HOLD block directly to cryptographic audit ledger...');
      const dailySpent = harness.auditLogger.getDailySpentUSD('antigravity-fund-manager');
      const mandateResult = harness.verifier.evaluateTrade(
        'antigravity-fund-manager',
        research.market.category,
        0,
        dailySpent
      );
      
      const intent: TradeIntent = {
        marketId: research.market.id,
        marketQuestion: research.market.question,
        outcomeSelected: 'NO',
        probabilityImplied: parseFloat(research.market.outcomePrices[1]),
        probabilityLLM: confidence,
        reasoning,
        amountUSD: 0,
        timestamp: Date.now()
      };

      harness.auditLogger.logAudit(
        intent,
        'HOLD',
        mandateResult.activeMandate?.signature ? crypto.createHash('sha256').update(mandateResult.activeMandate.signature).digest('hex') : 'none',
        'SIMULATED',
        'Causal graph query error or model exception. Capital protected under single-source-of-truth guidelines.'
      );

      // Print recent audit ledger entries to show the chained proof
      const logs = harness.auditLogger.readAuditLogs();
      const latestBlock = logs[logs.length - 1];
      
      logger.info('\n================================================================');
      logger.info('⚠️  SIMULATED POSITION SUSPENDED (HOLD) DUE TO CAUSAL ERROR!');
      logger.info('================================================================');
      logger.info('\n🔒 CRYPTOGRAPHIC COMPLIANCE LEDGER RECEIPT:');
      console.log(`- Block ID:        ${latestBlock.id}`);
      console.log(`- Decision Action: ${latestBlock.decision}`);
      console.log(`- Compliance Sig:  ${latestBlock.mandateHash.slice(0, 16)}... (EIP-712 Active)`);
      console.log(`- Chain Proof:     ${latestBlock.verificationHash}`);
      logger.info('================================================================');
    } else {
      const tradeResult = await harness.executeTradeDecision(
        research.market,
        decision,
        betAmount,
        confidence,
        reasoning
      );

      logger.info('\n================================================================');
      logger.info('✅ simulated POSITION EXECUTED SUCCESSFULLY!');
      logger.info('================================================================');
      console.log(JSON.stringify(tradeResult, null, 2));

      // Print recent audit ledger entries to show the chained proof
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
    logger.error(`Trade execution failed: ${err.message}`);
  } finally {
    await harness.shutdown();
  }
}

main().catch(console.error);
