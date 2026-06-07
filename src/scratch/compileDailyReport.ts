import { DailyReporter } from '../utils/dailyReporter';
import { logger } from '../utils/logger';

async function main() {
  try {
    const reporter = new DailyReporter();
    const stats = await reporter.compile();

    console.log('\n================================================================');
    console.log('📊 DUBSTRATA DAILY TRADING HARNESS PERFORMANCE REPORT');
    console.log('================================================================');
    console.log(`- Date Generated:       ${stats.reportDate}`);
    console.log(`- Cryptographic Audit:   ${stats.isChainValid ? '🛡️  PASSED (Chain Intact)' : '❌ CORRUPTED (Integrity Fault)'}`);
    console.log(`- Total Audit Blocks:    ${stats.totalAuditBlocks}`);
    console.log(`- Simulated Net Worth:   $${stats.netWorthUSD.toFixed(2)}`);
    console.log(`- Cash Balance:          $${stats.simulatedBalanceUSD.toFixed(2)}`);
    console.log(`- Open Positions Value:  $${stats.openValuationUSD.toFixed(2)}`);
    console.log(`- Open Unrealized P&L:   $${stats.unrealizedPnLUSD.toFixed(2)}`);
    console.log('----------------------------------------------------------------');
    console.log(`- Settled Trades:        ${stats.totalSettledTrades}`);
    console.log(`- Wins / Losses:         ${stats.winsCount} WON / ${stats.lossesCount} LOST`);
    console.log(`- Win Rate (%):          ${stats.winRate}%`);
    console.log(`- Total USDC Invested:   $${stats.totalUSDCInvested.toFixed(2)}`);
    console.log(`- Total USDC Payout:     $${stats.totalUSDCPayout.toFixed(2)}`);
    console.log(`- Net Realized Profit:   $${stats.netRealizedProfitUSD.toFixed(2)}`);
    console.log(`- Realized ROI (%):      ${stats.realizedROI}%`);
    console.log('----------------------------------------------------------------');
    console.log(`- Budget Consumed Today: $${stats.dailySpentUSD.toFixed(2)} / $${stats.dailyLimitUSD.toFixed(2)} (${((stats.dailySpentUSD / stats.dailyLimitUSD) * 100).toFixed(1)}%)`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error(`❌ Failed to compile daily report: ${err.message}`);
    process.exit(1);
  }
}

main();
