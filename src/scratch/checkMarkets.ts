import dotenv from 'dotenv';
dotenv.config();

import { GammaClient } from '../polymarket/gammaClient';
import { logger } from '../utils/logger';

async function main() {
  const gamma = new GammaClient();
  try {
    const markets = await gamma.fetchMarkets(10);
    console.log('\n--- ACTIVE POLYMARKET SCOUT RESULTS ---');
    markets.forEach((m, idx) => {
      console.log(`[${idx + 1}] Category: ${m.category}`);
      console.log(`    Question: ${m.question}`);
      console.log(`    Slug:     ${m.slug}`);
      console.log(`    Odds:     YES: ${Math.round(parseFloat(m.outcomePrices[0]) * 100)}% | NO: ${Math.round(parseFloat(m.outcomePrices[1]) * 100)}%`);
      console.log(`    Volume:   $${parseFloat(m.volume).toLocaleString()}`);
      console.log('--------------------------------------');
    });
  } catch (err: any) {
    console.error('Error fetching markets:', err.message);
  }
}

main().catch(console.error);
