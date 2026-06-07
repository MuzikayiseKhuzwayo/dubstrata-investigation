import dotenv from 'dotenv';
dotenv.config();

import { GammaClient } from '../polymarket/gammaClient';
import { logger } from '../utils/logger';

async function main() {
  logger.info('================================================================');
  logger.info('🔍 SCOUTING ACTIVE SHORT-TERM POLYMARKET LISTINGS...');
  logger.info('================================================================');

  const gamma = new GammaClient();
  
  // Fetch up to 30 active markets to find soonest-closing ones
  const activeMarkets = await gamma.fetchMarkets(15);

  if (activeMarkets.length === 0) {
    logger.warn('No active markets could be scouted.');
    return;
  }

  logger.info(`Successfully scouted ${activeMarkets.length} active listings, sorted by closest expiration date:\n`);
  
  activeMarkets.forEach((m, idx) => {
    const timeRemaining = new Date(m.endDate).getTime() - Date.now();
    const daysRemaining = (timeRemaining / (1000 * 60 * 60 * 24)).toFixed(2);
    
    console.log(`${idx + 1}. [${m.category}] ${m.question}`);
    console.log(`   - ID:           ${m.id}`);
    console.log(`   - Slug:         ${m.slug}`);
    console.log(`   - Outcome Odds: YES: ${Math.round(parseFloat(m.outcomePrices[0] || '0.5') * 100)}% | NO: ${Math.round(parseFloat(m.outcomePrices[1] || '0.5') * 100)}%`);
    console.log(`   - Volume:       $${parseFloat(m.volume).toLocaleString()}`);
    console.log(`   - Expires:      ${new Date(m.endDate).toLocaleString()} (In ${daysRemaining} days)`);
    console.log('----------------------------------------------------------------');
  });
}

main().catch(console.error);
