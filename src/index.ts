import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import { TradingAgentHarness } from './harness';
import { startDashboardServer } from './dashboard/server';
import { logger } from './utils/logger';
import { AutonomousTraderDaemon } from './utils/autonomousTrader';

async function main() {
  logger.info('================================================================');
  logger.info('       ⚡ DUBSTRATA-MCP & POLYMARKET TRADING AGENT HARNESS ⚡      ');
  logger.info('================================================================');

  const harness = new TradingAgentHarness();
  
  // 1. Initialise connection to Dubstrata MCP server
  const mcpConnected = await harness.initialize();
  
  if (mcpConnected) {
    logger.info('✅ Trading harness successfully initialized with Dubstrata MCP connectivity.');
  } else {
    logger.warn('⚠️ Trading harness initialized in SIMULATED OFFLINE RESEARCH mode.');
    logger.warn('Research tools will return mock graph outputs. To activate live graph lookup, configure DUBSTRATA_API_KEY.');
  }

  // 2. Start the background Autonomous Trading Daemon to systematically monitor markets
  const daemon = new AutonomousTraderDaemon(harness);
  daemon.start();

  // 3. Start premium dashboard visualizer
  logger.info('Spawning companion visualizer server...');
  startDashboardServer(
    harness.verifier,
    harness.auditLogger,
    harness.clob,
    harness.gamma,
    harness.dubstrata,
    harness,
    daemon
  );

  logger.info('================================================================');
  logger.info('🔥 ENGINE RUNNING. Open http://localhost:3000 to view dashboard.');
  logger.info('To evaluate a market via CLI, you can query this harness.');
  logger.info('================================================================');

  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    logger.info('Shutting down engine gracefully...');
    daemon.stop();
    await harness.shutdown();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Fatal crash in trading harness main loop: ${err.message}`);
  process.exit(1);
});
