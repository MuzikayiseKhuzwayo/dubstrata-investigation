import axios from 'axios';
import { logger } from './logger';

export class MarkovPolymarketSystem {
  private nStates: number;
  private bankroll: number;
  private CALIBRATION: { [key: number]: number } = {
    0.01: 0.0043,
    0.05: 0.0418,
    0.10: 0.087,
    0.20: 0.181,
    0.30: 0.285,
    0.50: 0.500, // Midpoint is roughly fair
    0.70: 0.715,
    0.80: 0.819,
    0.90: 0.913,
    0.95: 0.958,
  };

  constructor(nStates = 10, bankroll = 10000) {
    this.nStates = nStates;
    this.bankroll = bankroll;
  }

  /**
   * Fetch real price history from Polymarket CLOB API
   * GET https://clob.polymarket.com/prices-history
   */
  public async fetchPriceHistory(clobTokenId: string): Promise<number[]> {
    try {
      const url = 'https://clob.polymarket.com/prices-history';
      
      // Clean and sanitize the token ID from brackets or quotes
      let decimalTokenId = clobTokenId.trim().replace(/['"\[\]]/g, '');
      if (!decimalTokenId) {
        logger.warn(`⚠️ Empty or invalid token ID provided: "${clobTokenId}"`);
        return [];
      }

      // Convert hex (0x...) to base-10 decimal string representation
      if (decimalTokenId.startsWith('0x')) {
        try {
          const originalHex = decimalTokenId;
          decimalTokenId = BigInt(decimalTokenId).toString(10);
          logger.info(`🔄 Converted hex token ID ${originalHex} to decimal: ${decimalTokenId}`);
        } catch (e: any) {
          logger.error(`❌ Failed to convert hex token ID ${clobTokenId} to BigInt: ${e.message}`);
          return [];
        }
      }

      logger.info(`🌐 Fetching real historical prices from Polymarket CLOB for token: ${decimalTokenId}`);
      const response = await axios.get(url, {
        params: {
          market: decimalTokenId,
          fidelity: 60, // Granularity in minutes (60 = 1 hour candles)
          interval: 'max' // Maximum depth
        },
        timeout: 8000
      });

      const history = response.data && (Array.isArray(response.data.history) ? response.data.history : (Array.isArray(response.data) ? response.data : []));

      if (history.length > 0) {
        const prices = history
          .map((point: any) => {
            const p = point.p !== undefined ? point.p : (point.price !== undefined ? point.price : point.close);
            return typeof p === 'string' ? parseFloat(p) : p;
          })
          .filter((p: any) => typeof p === 'number' && !isNaN(p) && p >= 0 && p <= 1.0);

        if (prices.length >= 20) {
          logger.info(`📈 Successfully retrieved ${prices.length} real historical price points from Polymarket CLOB.`);
          return prices;
        }
      }

      logger.warn(`⚠️ Polymarket CLOB price history returned empty or insufficient points for ${decimalTokenId}.`);
      return [];
    } catch (err: any) {
      logger.error(`❌ Failed to fetch historical prices from Polymarket CLOB API: ${err.message}`);
      return [];
    }
  }

  /**
   * Build transition matrix from price history
   */
  public buildTransitionMatrix(prices: number[]): number[][] {
    const T = Array(this.nStates).fill(null).map(() => Array(this.nStates).fill(0));
    
    // Discretize each price into a state (0 to nStates - 1)
    const states = prices.map(p => Math.min(Math.floor(p * this.nStates), this.nStates - 1));

    // Count transitions
    for (let i = 0; i < states.length - 1; i++) {
      T[states[i]][states[i + 1]] += 1;
    }

    // Normalize each row
    for (let i = 0; i < this.nStates; i++) {
      const rowSum = T[i].reduce((sum, val) => sum + val, 0);
      if (rowSum > 0) {
        T[i] = T[i].map(val => val / rowSum);
      } else {
        // Fallback flat probability if state was never visited
        T[i] = Array(this.nStates).fill(1 / this.nStates);
      }
    }

    return T;
  }

  /**
   * Run Monte Carlo Simulation walks until expiry
   */
  public monteCarlo(T: number[][], startState: number, days = 30, nSims = 10000): number {
    // 1 hour fidelity means we need 24 steps per day
    const totalSteps = days * 24;
    let yesCount = 0;

    for (let s = 0; s < nSims; s++) {
      let state = startState;
      for (let step = 0; step < totalSteps; step++) {
        const probabilities = T[state];
        const r = Math.random();
        let cumulative = 0;
        let nextState = this.nStates - 1;

        for (let j = 0; j < this.nStates; j++) {
          cumulative += probabilities[j];
          if (r <= cumulative) {
            nextState = j;
            break;
          }
        }
        state = nextState;
      }
      
      // mid-point discretization cutoff
      if (state >= Math.floor(this.nStates / 2)) {
        yesCount++;
      }
    }

    return yesCount / nSims;
  }

  /**
   * Calibrate naive probability against longshot bias
   */
  public calibrate(rawProb: number): number {
    const keys = Object.keys(this.CALIBRATION)
      .map(Number)
      .sort((a, b) => a - b);

    if (rawProb <= keys[0]) return this.CALIBRATION[keys[0]];
    if (rawProb >= keys[keys.length - 1]) return this.CALIBRATION[keys[keys.length - 1]];

    for (let i = 0; i < keys.length - 1; i++) {
      const lo = keys[i];
      const hi = keys[i + 1];
      if (rawProb >= lo && rawProb <= hi) {
        const frac = (rawProb - lo) / (hi - lo);
        return this.CALIBRATION[lo] + frac * (this.CALIBRATION[hi] - this.CALIBRATION[lo]);
      }
    }

    return rawProb;
  }

  /**
   * Optimal Kelly bet fraction for binary market
   */
  public kellyFraction(pWin: number, priceCents: number): number {
    const cost = priceCents / 100;
    if (cost >= 1.0 || cost <= 0) return 0;
    
    const b = (1.0 - cost) / cost; // net odds
    const p = pWin;
    const q = 1.0 - pWin;
    
    const f = (b * p - q) / b;
    return Math.max(0, f);
  }

  /**
   * Calculate position sizing using Quarter Kelly (0.25x)
   */
  public getPositionSizing(pWin: number, priceCents: number, bankroll: number, multiplier = 0.25) {
    const f = this.kellyFraction(pWin, priceCents);
    const fAdjusted = f * multiplier;
    const dollars = bankroll * fAdjusted;
    const shares = dollars / (priceCents / 100);

    return {
      fullKellyPct: f,
      adjustedKellyPct: fAdjusted,
      dollars: parseFloat(dollars.toFixed(2)),
      shares: Math.floor(shares)
    };
  }
}
