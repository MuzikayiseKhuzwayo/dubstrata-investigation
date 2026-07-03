import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { AuditLogger } from '../dubstrata/auditLogger';
import { DubstrataMCPClient } from '../dubstrata/client';
import { TradingAgentHarness } from '../harness';
import { Daemon } from '../utils/contentDaemon';
import { fetchLiveRSSFeeds } from '../utils/rssScraper';
import { ContentEvaluator, ContentAsset } from '../content/evaluator';
import { eventBroker } from '../utils/eventBroker';
import { AgentChatManager } from '../utils/agentChatManager';

export function startDashboardServer(
  complianceVerifier: any, // Ignored, handled in harness
  auditLogger: AuditLogger,
  clobClient: any, // Ignored
  gammaClient: any, // Ignored
  dubstrata: DubstrataMCPClient,
  harness: TradingAgentHarness,
  daemon: Daemon
) {
  const app = express();
  const port = process.env.PORT || 3000;
  const chatManager = new AgentChatManager();

  if (dubstrata) {
    chatManager.setDubstrataClient(dubstrata);
  }

  if (daemon) {
    daemon.setChatManager(chatManager);
  }

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // SSE clients registry
  const sseClients = new Set<express.Response>();

  // Broadcaster
  const broadcastSSE = (eventType: string, data: any) => {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  };

  // Wire broker listener for live dashboard updates
  eventBroker.on('event', ({ eventType, data }) => {
    broadcastSSE(eventType, data);
  });

  app.post('/api/log-error', (req, res) => {
    logger.error(`BROWSER_LOG_ERROR: ${JSON.stringify(req.body)}`);
    res.json({ ok: true });
  });

  // GET /api/events - SSE streaming
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    sseClients.add(res);
    logger.debug(`🔌 New visualizer SSE client connected. Connections: ${sseClients.size}`);

    req.on('close', () => {
      sseClients.delete(res);
      logger.debug(`🔌 SSE client disconnected. Connections: ${sseClients.size}`);
    });
  });

  // GET /api/status - Expose active content metrics
  app.get('/api/status', async (req, res) => {
    try {
      const audits = auditLogger.readAuditLogs();
      const assets = loadContentAssets();
      const daemonStatus = daemon ? daemon.getStatus() : { isRunning: false };
      
      res.json({
        engineStatus: daemonStatus.isRunning ? 'ACTIVE_CONTENT_DAEMON' : 'ACTIVE_PAUSED',
        isSimulation: false,
        assetsCount: assets.length,
        recentAuditsCount: audits.length,
        daemon: daemonStatus
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/daemon/toggle - Toggle Content Scout daemon
  app.post('/api/daemon/toggle', (req, res) => {
    try {
      if (!daemon) {
        return res.status(400).json({ error: 'Daemon not initialized.' });
      }
      const status = daemon.getStatus();
      if (status.isRunning) {
        daemon.stop();
      } else {
        daemon.start();
      }
      res.json(daemon.getStatus());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/audit - Chained audit log retrieval
  app.get('/api/audit', (req, res) => {
    try {
      res.json(auditLogger.readAuditLogs());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // ==========================================
  // B2B CONTENT GENERATION ENGINE ENDPOINTS
  // ==========================================

  const ASSETS_PATH = './data/content_assets.json';

  // Helper to load assets
  function loadContentAssets(): ContentAsset[] {
    try {
      if (!fs.existsSync(ASSETS_PATH)) {
        return [];
      }
      return JSON.parse(fs.readFileSync(ASSETS_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }

  // Helper to save assets
  function saveContentAssets(assets: ContentAsset[]) {
    fs.writeFileSync(ASSETS_PATH, JSON.stringify(assets, null, 2), 'utf-8');
  }



  // GET /api/content/rss-feeds
  app.get('/api/content/rss-feeds', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const feeds = await fetchLiveRSSFeeds(false);
      res.json(feeds.slice(0, limit));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/content/investigate-manual
  app.post('/api/content/investigate-manual', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Missing text.' });

      logger.info(`🔬 Manual Lab Investigation: "${text.slice(0, 80)}..."`);
      
      // Generate X Thread draft and Outreach draft using the harness
      const xAsset = await harness.generateXPulseContent(text);
      const outreachAsset = await harness.generateB2BOutreach(text, 'Manual Lab Input');

      // Initialize interactive chat session and trigger first speaker
      try {
        chatManager.initSession(text);
        chatManager.generateAgentResponse(text, 'Visionary')
          .then(() => {
            if (chatManager.getAutopilot()) {
              chatManager.runAutopilotLoop(text).catch(err => logger.error(`Autopilot loop error: ${err.message}`));
            }
          })
          .catch(err => {
            logger.error(`Failed to trigger first speaker: ${err.message}`);
          });
      } catch (err: any) {
        logger.error(`Failed to init interactive chat session: ${err.message}`);
      }

      res.json({
        success: true,
        company: text,
        detail: 'Manual Lab Entry',
        type: 'GENERAL',
        causalFact: xAsset.topic,
        isPending: false,
        generatedAssets: [xAsset, outreachAsset]
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/content/generate-x
  app.post('/api/content/generate-x', async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) return res.status(400).json({ error: 'Missing topic.' });

      const asset = await harness.generateXPulseContent(topic);
      res.json({ success: true, asset, isPending: false });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/content/generate-video
  app.post('/api/content/generate-video', async (req, res) => {
    try {
      const { topic, context } = req.body;
      if (!topic || !context) return res.status(400).json({ error: 'Missing params.' });

      const asset = await harness.generateVideoScript(topic, context);
      res.json({ success: true, asset });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/content/generate-outreach
  app.post('/api/content/generate-outreach', async (req, res) => {
    try {
      const { companyName, detail } = req.body;
      if (!companyName || !detail) return res.status(400).json({ error: 'Missing params.' });

      const asset = await harness.generateB2BOutreach(companyName, detail);
      res.json({ success: true, asset });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/agents/directives - Retrieve agent prompts and hyper-directives
  app.get('/api/agents/directives', (req, res) => {
    const p = './data/agent_directives.json';
    if (fs.existsSync(p)) {
      try {
        return res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
      } catch {}
    }
    res.json({
      Visionary: "You are the Visionary (SOP-STR-001). Set strategic targets for Dubstrata: B2B Causal Alt-Data Graph RAG platform, focused on hedge funds, asset managers, and corporate risk. Align with the OKRs and business expansion documents.",
      Producer: "You are the Producer (SOP-OPS-004). Coordinate task queues, check WIP limits, and manage sprints for core engineering (FastAPI Gateway, ArcadeDB, Playwright foragers, Redis cache, Parquet exports).",
      Seller: "You are the Seller (SOP-SLS-001). Qualify quantitative clients (USDC micro-billing, API key setups, billing credits) using MEDDPICC and price B2B query API tiers ($0.005 for query, $0.020 for reports).",
      Controller: "You are the Controller (SOP-FIN-001). Audit transaction receipts, prevent double-spends on Solana x402 signatures, verify Ed25519 wallet updates, and audit Supabase table schemas.",
      Systematiser: "You are the Systematiser (SOP-OPS-001). Map process hierarchies (As-Is vs To-Be), design ingestion loops (Gemini extraction, Cypher graph merging), and eliminate Muda waste in crawler cycles.",
      hyperDirectives: ""
    });
  });

  // POST /api/agents/directives - Update agent prompts and hyper-directives
  app.post('/api/agents/directives', (req, res) => {
    try {
      const dir = './data';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync('./data/agent_directives.json', JSON.stringify(req.body, null, 2), 'utf-8');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/mcp/config - Retrieve Dubstrata MCP Configuration
  app.get('/api/mcp/config', (req, res) => {
    let apiKey = process.env.DUBSTRATA_API_KEY || '';
    const configPath = './data/mcp_config.json';
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.apiKey) {
          apiKey = config.apiKey;
        }
      } catch {}
    }
    const isConnected = dubstrata ? dubstrata.getIsConnected() : false;
    res.json({ apiKey, isConnected });
  });

  // POST /api/mcp/config - Save Dubstrata MCP Configuration and Hot-Reload Stdio Client
  app.post('/api/mcp/config', async (req, res) => {
    try {
      const { apiKey } = req.body;
      const dir = './data';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync('./data/mcp_config.json', JSON.stringify({ apiKey }, null, 2), 'utf-8');
      
      // Update local process environment variable to sync
      process.env.DUBSTRATA_API_KEY = apiKey;

      let isConnected = false;
      if (dubstrata) {
        logger.info('🔄 [DUBSTRATA MCP] API key updated from dashboard. Hot-reloading client connection...');
        await dubstrata.disconnect();
        isConnected = await dubstrata.connect();
      }

      res.json({ success: true, isConnected });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/business-context - Retrieve business context specs
  app.get('/api/business-context', (req, res) => {
    const p = './data/business_context.json';
    if (fs.existsSync(p)) {
      try {
        return res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
      } catch {}
    }
    res.json({ context: "", filePath: "" });
  });

  // POST /api/business-context - Save and sync business context specs
  app.post('/api/business-context', (req, res) => {
    try {
      const { context, filePath } = req.body;
      const dir = './data';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync('./data/business_context.json', JSON.stringify({ context, filePath }, null, 2), 'utf-8');

      if (filePath) {
        const absolutePath = path.resolve(filePath);
        // Ensure path is local and folder exists before writing to sync back to system
        if (fs.existsSync(path.dirname(absolutePath))) {
          fs.writeFileSync(absolutePath, context, 'utf-8');
          logger.info(`💾 [CONTEXT SYNC] Synchronized business context to local file: ${absolutePath}`);
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/agents/chats - Retrieve chat history
  app.get('/api/agents/chats', (req, res) => {
    try {
      res.json(chatManager.getHistory());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/agents/chats/session - Initialize a session
  app.post('/api/agents/chats/session', (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) return res.status(400).json({ error: 'Missing topic.' });
      const session = chatManager.initSession(topic);
      res.json({ success: true, session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/agents/chats/message - Post a user message
  app.post('/api/agents/chats/message', (req, res) => {
    try {
      const { topic, content } = req.body;
      if (!topic || !content) return res.status(400).json({ error: 'Missing topic or content.' });
      const session = chatManager.addMessageToSession(topic, 'User', content);

      if (chatManager.getAutopilot()) {
        chatManager.runAutopilotLoop(topic).catch(err => logger.error(`Autopilot loop error: ${err.message}`));
      }

      res.json({ success: true, session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/agents/chats/respond - Trigger specific agent response
  app.post('/api/agents/chats/respond', async (req, res) => {
    try {
      const { topic, agentName } = req.body;
      if (!topic || !agentName) return res.status(400).json({ error: 'Missing topic or agentName.' });
      const session = await chatManager.generateAgentResponse(topic, agentName);
      res.json({ success: true, session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/agents/chats/orchestrate - Trigger orchestrator choice
  app.post('/api/agents/chats/orchestrate', async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) return res.status(400).json({ error: 'Missing topic.' });
      const { session, nextSpeaker } = await chatManager.orchestrateNextSpeaker(topic);

      if (chatManager.getAutopilot()) {
        chatManager.runAutopilotLoop(topic).catch(err => logger.error(`Autopilot loop error: ${err.message}`));
      }

      res.json({ success: true, session, nextSpeaker });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/agents/autopilot - Retrieve global autopilot configuration
  app.get('/api/agents/autopilot', (req, res) => {
    res.json({ autoPilot: chatManager.getAutopilot() });
  });

  // POST /api/agents/autopilot - Toggle global autopilot configuration
  app.post('/api/agents/autopilot', (req, res) => {
    const { autoPilot } = req.body;
    chatManager.setAutopilot(!!autoPilot);
    res.json({ success: true, autoPilot: chatManager.getAutopilot() });
  });

  // Wildcard SPA route
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(port, () => {
    logger.info(`✨ Premium Content Visualizer listening at http://localhost:${port}`);
  });
}
