import axios from 'axios';
import { logger } from '../utils/logger';

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  category: string;
  outcomes: string[]; // e.g., ["YES", "NO"]
  outcomePrices: string[]; // e.g., ["0.55", "0.45"] (implied probabilities)
  volume: string;
  liquidity: string;
  resolved: boolean;
  resolutionSource?: string;
  endDate: string;
  clobTokenIds?: string[];
}

export class GammaClient {
  private apiUrl: string;

  constructor(apiUrl: string = process.env.POLYMARKET_GAMMA_API_URL || 'https://gamma-api.polymarket.com') {
    this.apiUrl = apiUrl;
  }

  private cache = new Map<string, { data: PolymarketMarket[]; timestamp: number }>();
  private cacheTTL = 120000; // 2 minutes cache TTL

  public async fetchMarkets(limit = 10, query?: string): Promise<PolymarketMarket[]> {
    const cacheKey = `${limit}:${query || ''}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);

    if (cached && now - cached.timestamp < this.cacheTTL) {
      logger.info(`Returning cached active markets for key: ${cacheKey}`);
      return cached.data;
    }

    try {
      logger.info(`Fetching active markets from Polymarket Gamma API${query ? ` for search query "${query}"` : ''} (high-volume sample, sorted locally by closest end date)...`);
      const params: any = {
        active: true,
        closed: false,
        limit: 100, // Pull a large sample of high-volume active markets
        order: 'volume',
        ascending: false
      };
      if (query) {
        params.query = query;
      }
      const response = await axios.get(`${this.apiUrl}/markets`, {
        params,
        timeout: 8000
      });

      if (Array.isArray(response.data)) {
        const parsed = response.data.map(m => this.mapMarket(m));
        
        // Filter active future events and sort ascending (closest end date first)
        const sortedMarkets = parsed
          .filter(m => {
            if (m.resolved) return false;
            const time = new Date(m.endDate).getTime();
            return !isNaN(time) && time > now;
          })
          .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

        const result = sortedMarkets.slice(0, limit);
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      logger.warn('Gamma API response format was unexpected. Falling back to cached or mock active markets.');
      if (cached) {
        logger.info(`Using expired cache as fallback for key: ${cacheKey}`);
        return cached.data;
      }
      return this.getMockMarkets();
    } catch (err: any) {
      logger.error(`Failed to fetch active Polymarket markets: ${err.message}. Falling back to cached or mock active markets.`);
      if (cached) {
        logger.info(`Using expired cache as fallback for key: ${cacheKey}`);
        return cached.data;
      }
      return this.getMockMarkets();
    }
  }

  private mapMarket(m: any): PolymarketMarket {
    let clobTokenIds: string[] = [];
    try {
      if (m.clobTokenIds) {
        if (typeof m.clobTokenIds === 'string') {
          clobTokenIds = JSON.parse(m.clobTokenIds);
        } else if (Array.isArray(m.clobTokenIds)) {
          clobTokenIds = m.clobTokenIds.map((id: any) => String(id));
        }
      }
    } catch {
      if (typeof m.clobTokenIds === 'string' && m.clobTokenIds.length > 0) {
        clobTokenIds = [m.clobTokenIds];
      }
    }

    let prices = ['0.50', '0.50'];
    try {
      if (m.outcomePrices) {
        prices = JSON.parse(m.outcomePrices);
      } else if (clobTokenIds.length > 0) {
        // Fallback or parsing based on other fields
        prices = [m.yesBid || '0.50', m.noBid || '0.50'];
      }
    } catch {
      // Ignored
    }

    let outcomes = ['YES', 'NO'];
    try {
      if (m.outcomes) {
        outcomes = JSON.parse(m.outcomes);
      }
    } catch {
      // Ignored
    }

    return {
      id: m.id || clobTokenIds[0] || 'mock-id',
      question: m.question || 'Unknown question',
      slug: m.slug || '',
      category: m.category || 'General',
      outcomes,
      outcomePrices: prices,
      volume: m.volume || '0',
      liquidity: m.liquidity || '0',
      resolved: !!m.resolved,
      resolutionSource: m.resolutionSource || '',
      endDate: m.endDate || new Date().toISOString(),
      clobTokenIds
    };
  }

  public getMockMarkets(): PolymarketMarket[] {
    const mockList = [
      {
        id: 'pm-market-us-election-2024',
        question: 'Will Donald Trump win the 2024 US Presidential Election?',
        slug: 'will-trump-win-2024-election',
        category: 'Politics',
        outcomes: ['YES', 'NO'],
        outcomePrices: ['0.52', '0.48'],
        volume: '450201000',
        liquidity: '12400500',
        resolved: false,
        endDate: '2026-11-03T23:59:59Z'
      },
      {
        id: 'pm-market-fed-september-cut',
        question: 'Will the Federal Reserve cut interest rates in September 2026?',
        slug: 'will-fed-cut-rates-sept-2026',
        category: 'Finance',
        outcomes: ['YES', 'NO'],
        outcomePrices: ['0.85', '0.15'],
        volume: '87500300',
        liquidity: '3400200',
        resolved: false,
        endDate: '2026-09-17T18:00:00Z'
      },
      {
        id: 'pm-market-ai-gpt5-release',
        question: 'Will OpenAI release GPT-5 before December 31, 2026?',
        slug: 'gpt5-release-before-dec-2026',
        category: 'Technology',
        outcomes: ['YES', 'NO'],
        outcomePrices: ['0.60', '0.40'],
        volume: '34100200',
        liquidity: '1800500',
        resolved: false,
        endDate: '2026-12-31T23:59:59Z'
      },
      {
        id: 'pm-market-spacex-starship',
        question: 'Will SpaceX Starship successfully complete an orbital catch in 2026?',
        slug: 'spacex-starship-orbital-catch-2026',
        category: 'Science',
        outcomes: ['YES', 'NO'],
        outcomePrices: ['0.40', '0.60'],
        volume: '15400200',
        liquidity: '900200',
        resolved: false,
        endDate: '2026-12-31T23:59:59Z'
      }
    ];

    // Sort mock markets so that closest end date comes first for quick validation
    return mockList.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  }
}
