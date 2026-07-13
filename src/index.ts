import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import { TradingAgentHarness } from './harness';
import { startDashboardServer } from './dashboard/server';
import { logger } from './utils/logger';
import { Daemon } from './utils/contentDaemon';

async function main() {
  logger.info('================================================================');
  logger.info('       ⚡ DUBSTRATA-MCP CAUSAL CONTENT ENGINE & HARNESS ⚡      ');
  logger.info('================================================================');

  // Parse command-line port arguments
  let port = 3000;
  const portIndex = process.argv.findIndex(arg => arg === '--port' || arg === '-p');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    const parsed = parseInt(process.argv[portIndex + 1], 10);
    if (!isNaN(parsed)) {
      port = parsed;
    }
  } else if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed)) {
      port = parsed;
    }
  }

  // Synchronise port into the environment for server.ts
  process.env.PORT = port.toString();

  const harness = new TradingAgentHarness();
  
  // 1. Initialise connection to Dubstrata MCP server
  const mcpConnected = await harness.initialize();
  
  if (mcpConnected) {
    logger.info('✅ Content engine harness successfully initialized with Dubstrata MCP connectivity.');
  } else {
    logger.warn('⚠️ Content engine harness initialized in SIMULATED OFFLINE RESEARCH mode.');
    logger.warn('Research tools will return mock graph outputs. To activate live graph lookup, configure DUBSTRATA_API_KEY.');
  }

  // 2. Start the background Daemon to systematically monitor risks
  const daemon = new Daemon(harness);
  daemon.start();

  // 3. Start premium dashboard visualizer
  logger.info('Spawning companion visualizer server...');
  startDashboardServer(
    undefined, // Verifier is now compliance-based, handled inside harness
    harness.auditLogger,
    undefined, // clob is deleted
    undefined, // gamma is deleted
    harness.dubstrata,
    harness,
    daemon as any
  );

  logger.info('================================================================');
  logger.info(`🔥 ENGINE RUNNING. Open http://localhost:${port} to view dashboard.`);
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
  logger.error(`Fatal crash in content harness main loop: ${err.message}`);
  process.exit(1);
});
