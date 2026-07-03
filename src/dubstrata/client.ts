import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export class DubstrataMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private queryCache = new Map<string, { result: string; timestamp: number }>();
  private inFlightQueries = new Map<string, Promise<string>>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute cache TTL

  constructor() {
    // Lazy initialisation
  }



  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public async connect(): Promise<boolean> {
    let apiKey = process.env.DUBSTRATA_API_KEY;
    const configPath = './data/mcp_config.json';
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.apiKey) {
          apiKey = config.apiKey;
        }
      } catch (err: any) {
        logger.warn(`Failed to read mcp_config.json: ${err.message}`);
      }
    }

    const commandStr = process.env.DUBSTRATA_MCP_SERVER_COMMAND || 'npx dubstrata-mcp';

    if (!apiKey) {
      logger.warn('⚠️ DUBSTRATA_API_KEY is not defined in environment or mcp_config.json.');
      logger.warn('The harness will run Dubstrata research tools in Simulation/Local Mock mode.');
      return false;
    }

    try {
      logger.info(`Starting Dubstrata MCP server process: "${commandStr}"`);
      const tokens = commandStr.split(' ');
      const command = tokens[0];
      const args = tokens.slice(1);

      // Sanitize the spawned environment to avoid terminal DUBSTRATA_API_URL contamination
      const cleanEnv: Record<string, string> = {};
      for (const [key, val] of Object.entries(process.env)) {
        if (val !== undefined) {
          cleanEnv[key] = val;
        }
      }

      // Check if DUBSTRATA_API_URL was explicitly set in the local workspace .env file
      let hasExplicitUrl = false;
      try {
        if (fs.existsSync('.env')) {
          const content = fs.readFileSync('.env', 'utf-8');
          hasExplicitUrl = content.split('\n').some(line => line.trim().startsWith('DUBSTRATA_API_URL='));
        }
      } catch {
        // Ignored
      }

      if (!hasExplicitUrl) {
        logger.info('Overriding DUBSTRATA_API_URL to production cloud API (https://api.dubstrata.com) to prevent shell contamination.');
        cleanEnv.DUBSTRATA_API_URL = 'https://api.dubstrata.com';
      } else {
        logger.info(`Using workspace configured DUBSTRATA_API_URL: "${process.env.DUBSTRATA_API_URL}"`);
      }

      this.transport = new StdioClientTransport({
        command,
        args,
        env: {
          ...cleanEnv,
          DUBSTRATA_API_KEY: apiKey
        } as any
      });

      this.client = new Client(
        {
          name: 'dubstrata-trading-harness',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      await this.client.connect(this.transport);
      this.isConnected = true;
      logger.info('⚡ Successfully connected to Dubstrata MCP proxy server!');
      return true;
    } catch (err: any) {
      logger.error(`❌ Failed to connect to Dubstrata MCP server: ${err.message}`);
      logger.warn('Falling back to local simulated Dubstrata results.');
      this.client = null;
      this.transport = null;
      this.isConnected = false;
      return false;
    }
  }

  public async disconnect() {
    try {
      if (this.transport) {
        await this.transport.close();
      }
    } catch (err: any) {
      logger.error(`Error closing transport during disconnect: ${err.message}`);
    } finally {
      this.transport = null;
      this.client = null;
      this.isConnected = false;
      logger.info('🔌 [DUBSTRATA MCP] Disconnected from Dubstrata MCP server.');
    }
  }

  private async callTool(name: string, args: any): Promise<string> {
    const startTime = Date.now();
    let resultText = '';

    if (!this.isConnected || !this.client) {
      const err = new Error(`Dubstrata MCP server is not connected. API_URL: ${process.env.DUBSTRATA_API_URL || 'https://api.dubstrata.com'}`);
      logger.error(`❌ MCP connection failure: ${err.message}`);
      throw err;
    }

    let retries = 0;
    const maxRetries = 4;
    const baseDelayMs = 20000; // 20 seconds base wait as recommended by the user

    while (retries < maxRetries) {
      try {
        logger.debug(`Calling Dubstrata tool: ${name} with args: ${JSON.stringify(args)}`);
        const result = await this.client.callTool({
          name,
          arguments: args
        }) as any;

        if (result.isError) {
          throw new Error(result.content?.[0]?.text || 'Unknown MCP tool error');
        }

        resultText = result.content?.[0]?.text || '';
        
        const isPending = this.isPendingResponse(resultText);

        if (isPending && retries < maxRetries - 1) {
          retries++;
          const currentDelayMs = baseDelayMs * Math.pow(2, retries - 1);
          logger.warn(`⏳ [DUBSTRATA CLOUD PROXY] Tool "${name}" response is currently PENDING (JIT crawling in progress). Retrying in ${currentDelayMs / 1000} seconds... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, currentDelayMs));
        } else {
          const latencyMs = Date.now() - startTime;
          this.recordInteraction(name, args, resultText, latencyMs, false);
          return resultText;
        }

      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        logger.error(`❌ Error calling tool '${name}': ${err.message}`);
        this.recordInteraction(name, args, `Error calling tool '${name}': ${err.message}`, latencyMs, false);
        throw err;
      }
    }

    return resultText;
  }

  private recordInteraction(
    toolName: string,
    inputs: any,
    outputs: string,
    latencyMs: number,
    isMock: boolean
  ) {
    try {
      const inputStr = JSON.stringify(inputs);
      const inputCharCount = inputStr.length;
      const outputCharCount = outputs.length;

      // Rule-of-thumb: ~4 characters per token
      const inputTokens = Math.ceil(inputCharCount / 4);
      const outputTokens = Math.ceil(outputCharCount / 4);

      // Try to parse compression ratio if present in output text
      let compressionRatio = 1.0;
      if (outputs.includes('Compression Ratio:')) {
        const match = outputs.match(/Compression Ratio:\s*([0-9.]+)/);
        if (match && match[1]) {
          compressionRatio = parseFloat(match[1]);
        }
      } else if (outputs.includes('tokens_saved')) {
        try {
          const parsed = JSON.parse(outputs);
          if (parsed.tokens_saved) {
            compressionRatio = parseFloat((parsed.tokens_saved / (outputTokens || 1)).toFixed(2));
          }
        } catch {
          // Ignored
        }
      }

      const logEntry = {
        timestamp: Date.now(),
        toolName,
        isMock,
        latencyMs,
        inputMetrics: {
          characters: inputCharCount,
          estimatedTokens: inputTokens
        },
        outputMetrics: {
          characters: outputCharCount,
          estimatedTokens: outputTokens
        },
        compressionRatio,
        payload: {
          inputs,
          outputs: outputs.length > 5000 ? outputs.slice(0, 5000) + '... [TRUNCATED]' : outputs
        }
      };

      const logDir = './data';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(
        path.join(logDir, 'mcp_interactions.jsonl'),
        JSON.stringify(logEntry) + '\n'
      );

      logger.info(`
================================================================
🔌 DUBSTRATA MCP TOOL TRANSACTION: [${toolName}]
----------------------------------------------------------------
- Latency:          ${latencyMs}ms
- Execution State:  ${isMock ? 'SIMULATED LOCAL FALLBACK' : 'LIVE PRODUCTION API'}
- Token Volume:     In: ~${inputTokens} | Out: ~${outputTokens} | Total: ~${inputTokens + outputTokens} (Est.)
- Input Parameters: ${JSON.stringify(inputs, null, 2)}
- Output Response:
${outputs.length > 800 ? outputs.slice(0, 800) + '\n... [TRUNCATED FOR CONSOLE BREVITY]' : outputs}
================================================================
`);
    } catch (err: any) {
      logger.error(`Failed to record MCP interaction logs: ${err.message}`);
    }
  }

  // Surgical wrappers
  private isPendingResponse(response: string): boolean {
    if (!response) return false;
    try {
      const parsed = JSON.parse(response);
      const status = (parsed.status || '').toLowerCase();
      const code = (parsed.structured_result?.code || '').toLowerCase();
      const resultText = (parsed.result || '').toLowerCase();
      return (
        status === 'harvesting' ||
        status === 'pending' ||
        code === 'harvesting' ||
        code === 'pending' ||
        resultText.includes('harvesting') ||
        resultText.includes('pending')
      );
    } catch {
      const normalized = response.toLowerCase();
      return (
        /\bpending\b/i.test(response) ||
        /\bharvesting\b/i.test(response) ||
        normalized.includes('ingestion in progress') ||
        normalized.includes('scraping') ||
        normalized.includes('please wait') ||
        normalized.includes('dispatched')
      );
    }
  }

  public async ingestKnowledge(text: string, url?: string, isPrivate = false): Promise<string> {
    return this.callTool('ingest_knowledge', { text, url, is_private: isPrivate });
  }

  public async queryGraph(query: string, isPrivate = false): Promise<string> {
    const cacheKey = `${query}_private:${isPrivate}`;

    // 1. Memory Cache lookup (5-minute short-lived TTL)
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      logger.debug(`💾 [CACHE HIT] Returning cached causal graph context for: "${query}"`);
      return cached.result;
    }

    // 2. In-Flight Query promise sharing (Deduplication)
    if (this.inFlightQueries.has(cacheKey)) {
      logger.debug(`🔗 [DEDUPLICATION] Sharing in-flight query promise for: "${query}"`);
      return this.inFlightQueries.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        const result = await this.queryGraphInternal(query, isPrivate);
        
        // Cache successful results that are NOT pending
        const isPending = this.isPendingResponse(result);

        if (!isPending) {
          this.queryCache.set(cacheKey, { result, timestamp: Date.now() });
          logger.debug(`💾 [CACHE SAVE] Cached successful query: "${query}"`);
        }

        return result;
      } finally {
        this.inFlightQueries.delete(cacheKey);
      }
    })();

    this.inFlightQueries.set(cacheKey, promise);
    return promise;
  }

  private async queryGraphInternal(query: string, isPrivate = false): Promise<string> {
    return this.callTool('query_graph', { query, is_private: isPrivate });
  }

  public async checkSourceTrust(domain: string): Promise<string> {
    return this.callTool('check_source_trust', { domain });
  }

  public async getAllFacts(entityName: string): Promise<string> {
    return this.callTool('get_all_facts', { entity_name: entityName });
  }

  public async getHistoricalTimeline(entityName: string): Promise<string> {
    return this.callTool('get_historical_timeline', { entity_name: entityName });
  }

  public async getInteractionHooks(url: string): Promise<string> {
    return this.callTool('get_interaction_hooks', { url });
  }

  public async findConflicts(entityName: string): Promise<string> {
    return this.callTool('find_conflicts', { entity_name: entityName });
  }

  public async getEntitiesByCategory(category: string, nameFilter?: string): Promise<string> {
    return this.callTool('get_entities_by_category', { category, name_filter: nameFilter });
  }

  public async submitFeedback(logId: string, score: number, reason?: string): Promise<string> {
    return this.callTool('submit_feedback', { log_id: logId, score, reason });
  }

  public async compileIntelligenceReport(
    query: string,
    options?: {
      isPrivate?: boolean;
      agentRole?: string;
      domain?: string;
      relationTypes?: string[];
      targetDate?: string;
    }
  ): Promise<string> {
    return this.callTool('compile_intelligence_report', {
      query,
      is_private: options?.isPrivate ?? false,
      agent_role: options?.agentRole,
      domain: options?.domain,
      relation_types: options?.relationTypes,
      target_date: options?.targetDate
    });
  }
}


