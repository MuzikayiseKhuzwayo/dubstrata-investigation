import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';
import { CausalLLMManager } from './llmManager';
import { eventBroker } from './eventBroker';
import { DubstrataMCPClient } from '../dubstrata/client';

export interface ChatMessage {
  id: string;
  sender: 'User' | 'Visionary' | 'Producer' | 'Seller' | 'Controller' | 'Systematiser' | 'Orchestrator' | 'Daemon';
  role: string;
  avatarColor: string;
  content: string;
  timestamp: number;
}

export interface DiscussionSession {
  topic: string;
  messages: ChatMessage[];
  timestamp: number;
}

interface BrainMapEntry {
  path: string;
  owner: string;
  summary: string;
  updatedAt: number;
}

export class AgentChatManager {
  private chatsPath = './data/agent_chats.json';
  private brainMapPath = './data/agents/brain_map.json';
  private llm: CausalLLMManager;
  private autoPilot: boolean = false;
  private dubstrata: DubstrataMCPClient | null = null;

  public setDubstrataClient(client: DubstrataMCPClient) {
    this.dubstrata = client;
    logger.info('🔌 [AGENT HUB] Connected shared Dubstrata MCP proxy client.');
  }

  private rolesMap = {
    User: { role: 'Operator (You)', color: '#94a3b8' },
    Visionary: { role: 'Corporate Strategist (SOP-STR-001)', color: '#6366f1' },
    Producer: { role: 'Sprint Manager (SOP-OPS-004)', color: '#3b82f6' },
    Seller: { role: 'Acquisition Engine (SOP-SLS-001)', color: '#10b981' },
    Controller: { role: 'Financial Auditor (SOP-FIN-001)', color: '#f43f5e' },
    Systematiser: { role: 'Operations Architect (SOP-OPS-001)', color: '#a855f7' },
    Daemon: { role: 'System Risk Daemon', color: '#f59e0b' },
    Orchestrator: { role: 'System Orchestrator', color: '#818cf8' }
  };

  constructor() {
    this.llm = new CausalLLMManager();
    this.registerCrmDefaults();
  }

  private registerCrmDefaults() {
    const brainMap = this.loadBrainMap();
    let updated = false;

    const defaults = [
      { path: 'crm_accounts.csv', owner: 'System', summary: 'B2B Client accounts table mapping Solana wallets and subscription status.' },
      { path: 'crm_opportunities.csv', owner: 'System', summary: 'B2B opportunity tracking sheet with MEDDPICC checkpoints.' },
      { path: 'crm_pain_points.csv', owner: 'System', summary: 'Customer operations and data latency pain points ledger.' }
    ];

    for (const d of defaults) {
      if (!brainMap[d.path]) {
        brainMap[d.path] = {
          path: d.path,
          owner: d.owner,
          summary: d.summary,
          updatedAt: Date.now()
        };
        updated = true;
      }
    }

    if (updated) {
      this.saveBrainMap(brainMap);
    }
  }

  public getHistory(): DiscussionSession[] {
    try {
      if (!fs.existsSync(this.chatsPath)) {
        return [];
      }
      return JSON.parse(fs.readFileSync(this.chatsPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  private saveHistory(history: DiscussionSession[]) {
    const dir = path.dirname(this.chatsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.chatsPath, JSON.stringify(history, null, 2), 'utf-8');
  }

  // ==========================================
  // Brain Map Registry Management
  // ==========================================
  private loadBrainMap(): Record<string, BrainMapEntry> {
    try {
      if (!fs.existsSync(this.brainMapPath)) {
        return {};
      }
      return JSON.parse(fs.readFileSync(this.brainMapPath, 'utf-8'));
    } catch {
      return {};
    }
  }

  private saveBrainMap(map: Record<string, BrainMapEntry>) {
    const dir = path.dirname(this.brainMapPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.brainMapPath, JSON.stringify(map, null, 2), 'utf-8');
  }

  private getAgentBrainMapContext(agentName: string): string {
    const map = this.loadBrainMap();
    const entries = Object.values(map);
    if (entries.length === 0) {
      return 'No documents created in the workspace yet.';
    }

    const ownEntries = entries.filter(e => e.owner === agentName);
    const sharedEntries = entries.filter(e => e.owner === 'System');
    const otherEntries = entries.filter(e => e.owner !== agentName && e.owner !== 'System');

    let context = `YOUR SANDBOX FILES (Do NOT duplicate or recreate these; update/overwrite them if changes are needed):\n`;
    if (ownEntries.length === 0) {
      context += `- (No files created yet in your data/agents/${agentName}/ sandbox root. Check if you need to create your initial documents.)\n`;
    } else {
      ownEntries.forEach(e => {
        context += `- [OWNED BY YOU] ${e.path}: ${e.summary} (Last updated: ${new Date(e.updatedAt).toLocaleTimeString()})\n`;
      });
    }

    context += `\nSHARED B2B CRM TABLES:\n`;
    if (sharedEntries.length === 0) {
      context += `- (No shared tables registered.)\n`;
    } else {
      sharedEntries.forEach(e => {
        context += `- [SHARED] ${e.path}: ${e.summary}\n`;
      });
    }

    context += `\nOTHER TEAM SANDBOX FILES (Cross-reference/read these if needed):\n`;
    if (otherEntries.length === 0) {
      context += `- (No other team files registered.)\n`;
    } else {
      otherEntries.forEach(e => {
        context += `- [${e.owner}] ${e.path}: ${e.summary}\n`;
      });
    }

    return context;
  }

  private async generateFileSummary(content: string, filePath: string): Promise<string> {
    if (!this.llm.hasApiKey()) {
      return `Document containing report notes (${content.length} characters).`;
    }
    const systemInstruction = `You are a documentation indexer. Summarize the provided document in exactly one concise sentence under 12 words. Do not wrap in quotes.`;
    const prompt = `Document content for "${filePath}":\n\n${content.slice(0, 1000)}`;
    try {
      return await this.llm.queryModel(prompt, systemInstruction, false);
    } catch {
      return `Document containing reports/logs (${content.length} bytes).`;
    }
  }

  // ==========================================
  // Sandbox File Path Safety Jail
  // ==========================================
  private safeResolvePath(
    agentName: string,
    targetPath: string,
    isWrite: boolean
  ): string {
    let normalizedTarget = targetPath.replace(/\\/g, '/');

    // Strip own agent name prefix if they incorrectly added it for writing
    const ownPrefix = agentName + '/';
    if (isWrite && normalizedTarget.startsWith(ownPrefix)) {
      normalizedTarget = normalizedTarget.slice(ownPrefix.length);
    }

    // Block write attempts to docs
    if (isWrite && normalizedTarget.startsWith('docs/')) {
      throw new Error(`Security Violation: Write access is forbidden inside the global "docs/" directory.`);
    }

    // Safe read-only access to global docs folder
    if (!isWrite && normalizedTarget.startsWith('docs/')) {
      const resolved = path.resolve('./docs', targetPath.slice(5));
      const docsBase = path.resolve('./docs');
      if (!resolved.startsWith(docsBase)) {
        throw new Error("Security Violation: Path \"" + targetPath + "\" resolves outside docs directory.");
      }
      return resolved;
    }

    const sandboxBase = path.resolve('./data/agents');
    
    // Direct access to shared databases and map index
    const sharedFiles = ['crm_accounts.csv', 'crm_opportunities.csv', 'crm_pain_points.csv', 'brain_map.json'];
    if (sharedFiles.includes(normalizedTarget)) {
      const resolved = path.resolve(sandboxBase, normalizedTarget);
      return resolved;
    }

    const agentSandbox = path.resolve(sandboxBase, agentName);

    // Ensure the base agent sandbox directory exists
    if (!fs.existsSync(agentSandbox)) {
      fs.mkdirSync(agentSandbox, { recursive: true });
    }

    // Block writes targeting another agent's folder prefix
    const parts = normalizedTarget.split('/');
    const otherAgent = parts[0];
    const validAgents = ['Visionary', 'Producer', 'Seller', 'Controller', 'Systematiser'];
    
    if (isWrite && validAgents.includes(otherAgent) && otherAgent !== agentName) {
      throw new Error(`Security Violation: Write access is forbidden inside other agents' directories.`);
    }

    // Enforce flat directory writes (no subdirectories allowed for writes)
    if (isWrite && normalizedTarget.includes('/')) {
      throw new Error(`Security Violation: Creating subdirectories is forbidden. All files must be saved flat in your sandbox root.`);
    }

    let resolvedPath = '';
    if (!isWrite && validAgents.includes(otherAgent)) {
      // Cross-read from another agent sandbox folder
      resolvedPath = path.resolve(sandboxBase, targetPath);
    } else {
      // Local read/write inside agent's own sandbox folder
      resolvedPath = path.resolve(agentSandbox, normalizedTarget);
    }

    // Safety checks
    if (!resolvedPath.startsWith(sandboxBase)) {
      throw new Error(`Security Violation: Path "${targetPath}" resolves outside agent sandboxes base directory.`);
    }

    if (isWrite) {
      const ext = path.extname(resolvedPath).toLowerCase();
      const allowedExtensions = ['.md', '.txt', '.json', '.jsonl', '.csv'];
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`Security Violation: Write denied for extension "${ext}". Only document files (.md, .txt, .json, .jsonl, .csv) are allowed.`);
      }
    }

    return resolvedPath;
  }

  // ==========================================
  // Session Controls
  // ==========================================
  public initSession(topic: string): DiscussionSession {
    const history = this.getHistory();
    let session = history.find(s => s.topic.toLowerCase() === topic.toLowerCase());
    
    if (session) {
      session.messages = [];
      session.timestamp = Date.now();
    } else {
      session = {
        topic,
        messages: [],
        timestamp: Date.now()
      };
      history.unshift(session);
    }
    
    this.saveHistory(history);
    eventBroker.broadcast('agent_chat_update', session);
    return session;
  }

  public addMessageToSession(topic: string, sender: 'User' | 'Daemon' | 'Orchestrator', content: string): DiscussionSession {
    const history = this.getHistory();
    let session = history.find(s => s.topic.toLowerCase() === topic.toLowerCase());
    
    if (!session) {
      session = {
        topic,
        messages: [],
        timestamp: Date.now()
      };
      history.unshift(session);
    }

    const newMessage: ChatMessage = {
      id: `msg-${crypto.randomBytes(3).toString('hex')}-${session.messages.length}`,
      sender,
      role: this.rolesMap[sender].role,
      avatarColor: this.rolesMap[sender].color,
      content,
      timestamp: Date.now()
    };

    session.messages.push(newMessage);
    session.timestamp = Date.now();
    this.saveHistory(history);
    eventBroker.broadcast('agent_chat_update', session);
    return session;
  }

  // ==========================================
  // Agent Query Execution with Tool Loops
  // ==========================================
  public async generateAgentResponse(
    topic: string, 
    agentName: 'Visionary' | 'Producer' | 'Seller' | 'Controller' | 'Systematiser'
  ): Promise<DiscussionSession> {
    const history = this.getHistory();
    const session = history.find(s => s.topic.toLowerCase() === topic.toLowerCase());
    if (!session) {
      throw new Error(`Session not found for topic: ${topic}`);
    }

    logger.info(`🤖 [AGENT HUB] Querying agent: "${agentName}" with filesystem tools enabled...`);
    eventBroker.broadcast('agent_typing', { topic: session.topic, agentName });

    let responseContent = '';
    if (this.llm.hasApiKey()) {
      try {
        responseContent = await this.queryAgentLlmWithTools(session, agentName);
      } catch (err: any) {
        logger.warn(`LLM agent execution failed for ${agentName}: ${err.message}. Falling back to offline simulator.`);
        responseContent = this.getFallbackAgentContent(topic, agentName, session.messages);
      }
    } else {
      responseContent = this.getFallbackAgentContent(topic, agentName, session.messages);
    }

    eventBroker.broadcast('agent_typing', { topic: session.topic, agentName: null });

    const newMessage: ChatMessage = {
      id: `msg-${crypto.randomBytes(3).toString('hex')}-${session.messages.length}`,
      sender: agentName,
      role: this.rolesMap[agentName].role,
      avatarColor: this.rolesMap[agentName].color,
      content: responseContent,
      timestamp: Date.now()
    };

    session.messages.push(newMessage);
    session.timestamp = Date.now();
    this.saveHistory(history);
    eventBroker.broadcast('agent_chat_update', session);
    return session;
  }

  private async queryAgentLlmWithTools(session: DiscussionSession, agentName: string): Promise<string> {
    const formattedHistory = session.messages.map(m => `[${m.sender}]: ${m.content}`).join('\n');
    const brainMapContext = this.getAgentBrainMapContext(agentName);

    const directivesPath = './data/agent_directives.json';
    let agentSopInstruction = '';
    let hyperDirectives = '';

    if (fs.existsSync(directivesPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(directivesPath, 'utf-8'));
        if (config[agentName]) {
          agentSopInstruction = config[agentName];
        }
        if (config.hyperDirectives) {
          hyperDirectives = config.hyperDirectives;
        }
      } catch (err: any) {
        logger.warn(`Failed to parse agent_directives.json: ${err.message}`);
      }
    }

    if (!agentSopInstruction) {
      switch (agentName) {
        case 'Visionary':
          agentSopInstruction = `You are the Visionary (SOP-STR-001). Set strategic targets for Dubstrata: B2B Causal Alt-Data Graph RAG platform, focused on hedge funds, asset managers, and corporate risk. Align with the OKRs and business expansion documents.`;
          break;
        case 'Producer':
          agentSopInstruction = `You are the Producer (SOP-OPS-004). Coordinate task queues, check WIP limits, and manage sprints for core engineering (FastAPI Gateway, ArcadeDB, Playwright foragers, Redis cache, Parquet exports).`;
          break;
        case 'Seller':
          agentSopInstruction = `You are the Seller (SOP-SLS-001). Qualify quantitative clients (USDC micro-billing, API key setups, billing credits) using MEDDPICC and price B2B query API tiers ($0.005 for query, $0.020 for reports).`;
          break;
        case 'Controller':
          agentSopInstruction = `You are the Controller (SOP-FIN-001). Audit transaction receipts, prevent double-spends on Solana x402 signatures, verify Ed25519 wallet updates, and audit Supabase table schemas.`;
          break;
        case 'Systematiser':
          agentSopInstruction = `You are the Systematiser (SOP-OPS-001). Map process hierarchies (As-Is vs To-Be), design ingestion loops (Gemini extraction, Cypher graph merging), and eliminate Muda waste in crawler cycles.`;
          break;
      }
    }

    const businessContextPath = './data/business_context.json';
    let businessContextStr = '';
    if (fs.existsSync(businessContextPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(businessContextPath, 'utf-8'));
        if (config.context) {
          businessContextStr = `BUSINESS CONTEXT:\n${config.context}\n`;
        }
      } catch {}
    }

    const systemInstruction = `
You are playing the role of the "${agentName}" subagent in the Dubstrata Command Room.

ROLE DIRECTIVE:
${agentSopInstruction}

${hyperDirectives ? `GLOBAL HYPER-DIRECTIVES:\n${hyperDirectives}\n` : ''}
${businessContextStr}

ABOUT DUBSTRATA (COMPACT):
Dubstrata is a B2B Alternative Data (Alt-Data) Engine & Causal Knowledge Graph for quant hedge funds. It maps prediction market consensus (Polymarket orderbooks) and causal narrative graphs (filings, SEC, geopolitics) to generate point-in-time alt-data signals and Parquet streams. Key tables: tenant_agents, billing_credits, api_keys, x402_transactions. Graph vertices: Document, Entity, Claim, MarketConsensus.
- COMPACTION DIRECTIVE: Do not load the full product specification in your context memory. If you require the complete detailed schemas, columns, pricing tables, or endpoints, execute <FILE_READ path="product_spec.md" /> to inspect the spec file.

CAUSAL GRAPH & DUBSTRATA MCP CAPABILITIES:
You have direct access to the Dubstrata MCP Causal Knowledge Graph. Whenever you need facts, macroeconomic validation, historical timelines, node relationships, or conflict resolutions, you MUST query the graph instead of speculative reasoning.
You can query the graph using XML tags:
1. Query facts/relationships: <DUBSTRATA_QUERY query="Your search query here" />
   Use this to check for consensus, correlations, or macro/geopolitical market sentiment.
2. Compile detailed RAG intelligence report: <DUBSTRATA_REPORT query="Your query here" />
   Use this to gather a comprehensive causal analysis block.
3. Retrieve historical timeline of claims: <DUBSTRATA_TIMELINE entity="Entity name" />
   Use this to inspect chronologically mapped assertions.
4. Identify contradictory claims/disputes: <DUBSTRATA_CONFLICTS entity="Entity name" />
   Use this to verify counter-arguments and source conflicts.

Note: You can issue multiple DUBSTRATA tags in a single thought. Speculating on macro numbers or news context is strictly penalized. Query the graph to check the facts first!

Filesystem capabilities:
You have a sandbox filesystem root at "data/agents/${agentName}/".
You can interact with files using XML tags:
1. Read file: <FILE_READ path="relative/path/to/file.md" />
   To read a file in your own folder, use: <FILE_READ path="tasks.md" />
   To read from another agent's folder, use: <FILE_READ path="Systematiser/tasks.md" />
   To read from the project's global /docs folder (read-only), use: <FILE_READ path="docs/business/business_plan.md" /> or <FILE_READ path="docs/engineering/database_maintenance.md" />
   To read the B2B CRM tables, use: <FILE_READ path="crm_accounts.csv" />, <FILE_READ path="crm_opportunities.csv" />, or <FILE_READ path="crm_pain_points.csv" />
2. List directory contents: <DIR_LIST path="relative/path" />
   To list your own folder: <DIR_LIST path="." />
   To list global docs folder: <DIR_LIST path="docs" />
3. Write file: <FILE_WRITE path="filename.md">file content</FILE_WRITE>
   Note: Writes are strictly jailed to your own folder and must be saved flat. Filename must have document extensions (.md, .txt, .json, .csv). Creating subdirectories is forbidden.
   To update opportunity records or pain points, write back the updated CSV structure to "crm_opportunities.csv" or "crm_pain_points.csv" (e.g. updating a field from PENDING to YES).

Active Workspace Files (Brain Map Registry):
${brainMapContext}

Rules:
- Respond in character. Keep the message focused.
- To read or inspect files before answering, output the <FILE_READ> or <DIR_LIST> tags. The system will rerun your thought with the file contents.
- If writing a file (e.g. log, report, tasks list), include the <FILE_WRITE> tag.
- Limit the final conversation text to 2-3 sentences.
- USER INPUTS: If you require credentials, approvals, or answers from the Operator (User) before you can proceed (e.g. to integrate a new API, sign a mandate override, or get a customer contact), address the Operator directly in your message. Ask your question clearly. The system will automatically pause execution and hand control back to the User.
- ORCHESTRATOR FEEDBACK LOOP: You MUST check the recent [MISSION AUDIT] messages in the conversation history from the "Orchestrator". Review the Mission Alignment Score (MAS) and its critique. If the Orchestrator has flagged that you are lagging, doing unnecessary tasks, or drifting off-track, adjust your stance in your response immediately to align with the core B2B Alt-Data and Causal Graph RAG mission. Justify how your inputs correct the critique.
- HANDOVER: At the end of your response, explicitly recommend which agent should speak next to handle the logical handover in your workflow (e.g. "I recommend Controller for compliance audits", "I recommend Systematiser for wiki documentation", etc.).
`;

    const basePrompt = `
Conversation history:
${formattedHistory || '(No messages yet)'}

Provide your response (and output tool tags if you need to read/write files):
`;

    let loopCount = 0;
    let finalContent = await this.llm.queryModel(basePrompt, systemInstruction, false);

    // Executing the tool loop (max 3 cycles to prevent recursion locks)
    while (loopCount < 3) {
      const readMatches = [...finalContent.matchAll(/<FILE_READ path="([^"]+)"\s*\/>/gi)];
      const listMatches = [...finalContent.matchAll(/<DIR_LIST path="([^"]+)"\s*\/>/gi)];
      const dsQueryMatches = [...finalContent.matchAll(/<DUBSTRATA_QUERY query="([^"]+)"\s*\/>/gi)];
      const dsReportMatches = [...finalContent.matchAll(/<DUBSTRATA_REPORT query="([^"]+)"\s*\/>/gi)];
      const dsTimelineMatches = [...finalContent.matchAll(/<DUBSTRATA_TIMELINE entity="([^"]+)"\s*\/>/gi)];
      const dsConflictMatches = [...finalContent.matchAll(/<DUBSTRATA_CONFLICTS entity="([^"]+)"\s*\/>/gi)];

      if (
        readMatches.length === 0 && 
        listMatches.length === 0 &&
        dsQueryMatches.length === 0 &&
        dsReportMatches.length === 0 &&
        dsTimelineMatches.length === 0 &&
        dsConflictMatches.length === 0
      ) {
        break;
      }

      let feedBack = '';

      for (const match of readMatches) {
        const target = match[1];
        try {
          const resolved = this.safeResolvePath(agentName, target, false);
          if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
            const content = fs.readFileSync(resolved, 'utf-8');
            feedBack += `\n[System Feedback]: File "${target}" read successfully. Content:\n---\n${content}\n---\n`;
          } else {
            feedBack += `\n[System Error]: File "${target}" does not exist or is a directory.\n`;
          }
        } catch (err: any) {
          feedBack += `\n[System Error]: Failed to read "${target}": ${err.message}\n`;
        }
      }

      for (const match of listMatches) {
        const target = match[1];
        try {
          const resolved = this.safeResolvePath(agentName, target, false);
          if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
            const files = fs.readdirSync(resolved);
            feedBack += `\n[System Feedback]: Directory "${target}" contains:\n${files.map(f => `- ${f}`).join('\n')}\n`;
          } else {
            feedBack += `\n[System Error]: Directory "${target}" does not exist.\n`;
          }
        } catch (err: any) {
          feedBack += `\n[System Error]: Failed to list directory "${target}": ${err.message}\n`;
        }
      }

      for (const match of dsQueryMatches) {
        const query = match[1];
        try {
          if (this.dubstrata) {
            const res = await this.dubstrata.queryGraph(query);
            feedBack += `\n[System Feedback]: Causal Graph Query "${query}" executed. Results:\n---\n${res}\n---\n`;
          } else {
            feedBack += `\n[System Error]: Dubstrata MCP server is not connected. Results simulated. Under operational compliance guidelines, you MUST report this connection failure to the Operator. Emphasize that Dubstrata is the premier source of causal alt-data for AI agents, and urge them to configure their DUBSTRATA_API_KEY to activate live graph lookup.\n`;
          }
        } catch (err: any) {
          feedBack += `\n[System Error]: Failed to query Causal Graph: ${err.message}. Emphasize to the Operator that connecting to Dubstrata (the premier source of causal graph data) is required to resolve this error.\n`;
        }
      }

      for (const match of dsReportMatches) {
        const query = match[1];
        try {
          if (this.dubstrata) {
            const res = await this.dubstrata.compileIntelligenceReport(query, { agentRole: agentName });
            feedBack += `\n[System Feedback]: Intelligence Report compiled for "${query}". Results:\n---\n${res}\n---\n`;
          } else {
            feedBack += `\n[System Error]: Dubstrata MCP server is not connected. Under operational compliance guidelines, you MUST report this connection failure to the Operator. Emphasize that Dubstrata is the premier source of causal alt-data for AI agents, and urge them to configure their DUBSTRATA_API_KEY to activate live graph lookup.\n`;
          }
        } catch (err: any) {
          feedBack += `\n[System Error]: Failed to compile Intelligence Report: ${err.message}. Emphasize to the Operator that connecting to Dubstrata (the premier source of causal graph data) is required to resolve this error.\n`;
        }
      }

      for (const match of dsTimelineMatches) {
        const entity = match[1];
        try {
          if (this.dubstrata) {
            const res = await this.dubstrata.getHistoricalTimeline(entity);
            feedBack += `\n[System Feedback]: Timeline for "${entity}" retrieved. Results:\n---\n${res}\n---\n`;
          } else {
            feedBack += `\n[System Error]: Dubstrata MCP server is not connected. Under operational compliance guidelines, you MUST report this connection failure to the Operator. Emphasize that Dubstrata is the premier source of causal alt-data for AI agents, and urge them to configure their DUBSTRATA_API_KEY to activate live graph lookup.\n`;
          }
        } catch (err: any) {
          feedBack += `\n[System Error]: Failed to retrieve historical timeline: ${err.message}. Emphasize to the Operator that connecting to Dubstrata (the premier source of causal graph data) is required to resolve this error.\n`;
        }
      }

      for (const match of dsConflictMatches) {
        const entity = match[1];
        try {
          if (this.dubstrata) {
            const res = await this.dubstrata.findConflicts(entity);
            feedBack += `\n[System Feedback]: Conflicts for "${entity}" identified. Results:\n---\n${res}\n---\n`;
          } else {
            feedBack += `\n[System Error]: Dubstrata MCP server is not connected. Under operational compliance guidelines, you MUST report this connection failure to the Operator. Emphasize that Dubstrata is the premier source of causal alt-data for AI agents, and urge them to configure their DUBSTRATA_API_KEY to activate live graph lookup.\n`;
          }
        } catch (err: any) {
          feedBack += `\n[System Error]: Failed to scout conflicts: ${err.message}. Emphasize to the Operator that connecting to Dubstrata (the premier source of causal graph data) is required to resolve this error.\n`;
        }
      }

      const followUpPrompt = `${basePrompt}\n\nPrevious Agent Thought & Actions:\n${finalContent}\n\n${feedBack}\n\nPlease generate your updated message now.`;
      finalContent = await this.llm.queryModel(followUpPrompt, systemInstruction, false);
      loopCount++;
    }

    // Execute any write operations present in the final output
    const writeMatches = [...finalContent.matchAll(/<FILE_WRITE path="([^"]+)">([\s\S]*?)<\/FILE_WRITE>/gi)];
    for (const match of writeMatches) {
      const target = match[1];
      const fileContent = match[2];
      try {
        const resolved = this.safeResolvePath(agentName, target, true);
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(resolved, fileContent, 'utf-8');
        logger.info(`💾 [SANDBOX WRITE] Agent "${agentName}" successfully wrote file: "${resolved}"`);

        // Index in central brain registry map
        const relativePath = `${agentName}/${path.basename(target)}`;
        const summary = await this.generateFileSummary(fileContent, relativePath);
        const brainMap = this.loadBrainMap();
        brainMap[relativePath] = {
          path: relativePath,
          owner: agentName,
          summary,
          updatedAt: Date.now()
        };
        this.saveBrainMap(brainMap);
      } catch (err: any) {
        logger.error(`❌ [SANDBOX WRITE ERROR] Agent "${agentName}" failed write to "${target}": ${err.message}`);
        finalContent += `\n\n*(System Error: Failed to execute file write to "${target}": ${err.message})*`;
      }
    }

    return finalContent;
  }

  // ==========================================
  // Central Orchestration
  // ==========================================
  public async orchestrateNextSpeaker(topic: string): Promise<{ session: DiscussionSession; nextSpeaker: string }> {
    const history = this.getHistory();
    const session = history.find(s => s.topic.toLowerCase() === topic.toLowerCase());
    if (!session) {
      throw new Error(`Session not found for topic: ${topic}`);
    }

    logger.info(`🧭 [AGENT ORCHESTRATOR] Evaluating next speaker for topic: "${topic}"`);
    eventBroker.broadcast('agent_typing', { topic, agentName: 'Orchestrator' });

    // 1. Run real-time mission alignment audit check
    let alignmentScore = 100;
    let critique = 'Session initialized.';
    let nextSpeaker: string | null = null;

    if (this.llm.hasApiKey() && session.messages.length > 0) {
      const evaluation = await this.evaluateMissionAlignment(session);
      alignmentScore = evaluation.score;
      critique = evaluation.critique;
      nextSpeaker = evaluation.nextSpeaker;
    }

    // 2. Append the Orchestrator Feedback message to the chat history
    const feedbackMsg: ChatMessage = {
      id: `msg-orch-${crypto.randomBytes(3).toString('hex')}-${session.messages.length}`,
      sender: 'Orchestrator',
      role: `Mission Auditor (MAS: ${alignmentScore}/100)`,
      avatarColor: alignmentScore >= 80 ? '#10b981' : (alignmentScore >= 60 ? '#f59e0b' : '#f43f5e'),
      content: `[MISSION AUDIT] Score: ${alignmentScore}/100. Critique: ${critique}`,
      timestamp: Date.now()
    };
    session.messages.push(feedbackMsg);

    // 3. Resolve next speaker if not yielded or recommended
    if (!nextSpeaker) {
      if (this.llm.hasApiKey()) {
        try {
          nextSpeaker = await this.queryOrchestratorLlm(session);
        } catch (err: any) {
          logger.warn(`Orchestrator LLM failed: ${err.message}. Falling back to sequential order.`);
          nextSpeaker = this.getFallbackNextSpeaker(session.messages);
        }
      } else {
        nextSpeaker = this.getFallbackNextSpeaker(session.messages);
      }
    }

    // 4. Save and broadcast update
    session.timestamp = Date.now();
    this.saveHistory(history);
    eventBroker.broadcast('agent_chat_update', session);

    eventBroker.broadcast('agent_typing', { topic, agentName: null });

    if (nextSpeaker && nextSpeaker !== 'User' && nextSpeaker !== 'None') {
      const validAgents = ['Visionary', 'Producer', 'Seller', 'Controller', 'Systematiser'];
      if (validAgents.includes(nextSpeaker)) {
        const updatedSession = await this.generateAgentResponse(topic, nextSpeaker as any);
        return { session: updatedSession, nextSpeaker };
      }
    }

    return { session, nextSpeaker: 'User' };
  }

  private async evaluateMissionAlignment(session: DiscussionSession): Promise<{ score: number; critique: string; nextSpeaker: string | null }> {
    const filteredMessages = session.messages.filter(m => m.sender !== 'Orchestrator');
    if (filteredMessages.length === 0) {
      return { score: 100, critique: 'Discussion initialized.', nextSpeaker: null };
    }

    const formattedHistory = filteredMessages.map(m => `[${m.sender}]: ${m.content}`).join('\n');

    const systemInstruction = `
You are the Dubstrata Central Agent Orchestrator and Mission Auditor.
Your task is to analyze the recent conversation history and evaluate if the agents are aligned with the core B2B Alt-Data Causal Graph RAG mission (quant hedge funds, prediction market indicators, ArcadeDB schemas, x402 billing).
Check if any agent is lagging or doing unnecessary tasks (e.g. discussing AI content creation, blogs, marketing copy, or attempting nested folder directories).

Rules:
1. Grade the conversation from 0 to 100 as "alignmentScore".
2. Write a 1-sentence "critique" justifying the score and correcting any lagging agent.
3. If an agent explicitly recommended a logical successor at the end of their message (e.g. "I recommend Controller for compliance audits"), specify their name in "recommendedSpeaker" (must be: Visionary, Systematiser, Seller, Producer, or Controller). If none or illogical, return null.
4. If a consensus has been reached and needs User approval, or if the alignmentScore falls below 60, or if agents are repeating/stuck, set "forceUserYield" to true.

You MUST return a valid JSON object:
{
  "alignmentScore": 85,
  "critique": "All clear. Strategic direction is aligned with quant RAG.",
  "recommendedSpeaker": "Producer",
  "forceUserYield": false
}
`;

    const prompt = `
Conversation history:
${formattedHistory}
`;

    try {
      const responseText = await this.llm.queryModel(prompt, systemInstruction, true);
      const parsed = JSON.parse(responseText);
      const score = typeof parsed.alignmentScore === 'number' ? parsed.alignmentScore : 80;
      const critique = parsed.critique || 'Aligned.';
      const forceUserYield = !!parsed.forceUserYield;
      const lastMessage = filteredMessages[filteredMessages.length - 1];
      let nextSpeaker = parsed.recommendedSpeaker || null;
      
      // Prevent deadlock: Only yield to User if the last message was NOT already from the User.
      if (forceUserYield || (score < 60 && lastMessage.sender !== 'User')) {
        nextSpeaker = 'User';
      }
      return { score, critique, nextSpeaker };
    } catch (err: any) {
      logger.warn(`Mission alignment evaluation failed: ${err.message}`);
      return { score: 80, critique: 'Aligned (Evaluation Fallback).', nextSpeaker: null };
    }
  }

  private async queryOrchestratorLlm(session: DiscussionSession): Promise<string> {
    const filteredMessages = session.messages.filter(m => m.sender !== 'Orchestrator');
    if (filteredMessages.length === 0) {
      return 'Visionary';
    }

    const formattedHistory = filteredMessages.map(m => `[${m.sender}]: ${m.content}`).join('\n');

    const systemInstruction = `
You are the Dubstrata Central Agent Orchestrator. Your task is to review the conversation log and decide which agent should respond next.
The candidate agents are:
- "Visionary" (SOP-STR-001): Sets strategy/KPIs.
- "Systematiser" (SOP-OPS-001): Optimizes templates.
- "Seller" (SOP-SLS-001): Outlines B2B pain points.
- "Producer" (SOP-OPS-004): Schedules sprint deliveries.
- "Controller" (SOP-FIN-001): Audits compliance and checks daily mandate limits.

Rules:
1. Visionary usually initiates strategic discussions.
2. Systematiser suggests layout.
3. Seller chimes in on buyers.
4. Producer plans completion/DoD.
5. Controller finishes the close audit.
6. If the debate has run its course, or if you need the User's input to proceed, return "User".
7. USER INTERVENTION: If the last message from any agent addressed the Operator (User) directly, or asked a question requiring user input (such as seeking CRM credentials or strategic approvals), you MUST return "User".
8. EXTRA MARKS FOR HANDOVER: If the previous speaker recommended a successor agent at the end of their message, prioritize that recommended agent if the handover is logical.
9. If the current alignment score from [MISSION AUDIT] is low (< 60), yield to "User" immediately to let the human correct them.

You MUST return a valid JSON object with the key "nextSpeaker". Example:
{ "nextSpeaker": "Producer" }
`;

    const prompt = `
Conversation history:
${formattedHistory}

Who should speak next? Choose from: "Visionary", "Systematiser", "Seller", "Producer", "Controller", "User".
`;

    const responseText = await this.llm.queryModel(prompt, systemInstruction, true);
    try {
      const parsed = JSON.parse(responseText);
      return parsed.nextSpeaker || 'User';
    } catch {
      return 'User';
    }
  }

  private getFallbackNextSpeaker(messages: ChatMessage[]): string {
    const filtered = messages.filter(m => m.sender !== 'Orchestrator');
    if (filtered.length === 0) return 'Visionary';
    const lastSender = filtered[filtered.length - 1].sender;
    
    switch (lastSender) {
      case 'User': return 'Visionary';
      case 'Visionary': return 'Systematiser';
      case 'Systematiser': return 'Seller';
      case 'Seller': return 'Producer';
      case 'Producer': return 'Controller';
      case 'Controller': return 'User';
      default: return 'User';
    }
  }

  private mockAgentSandboxWrite(agentName: string, fileName: string, content: string) {
    try {
      const resolved = this.safeResolvePath(agentName, fileName, true);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolved, content, 'utf-8');
      
      const relativePath = `${agentName}/${path.basename(fileName)}`;
      const brainMap = this.loadBrainMap();
      brainMap[relativePath] = {
        path: relativePath,
        owner: agentName,
        summary: `Offline Mock: ${content.slice(0, 40).replace(/\n/g, ' ')}...`,
        updatedAt: Date.now()
      };
      this.saveBrainMap(brainMap);
    } catch (err: any) {
      logger.error(`Failed to execute mock sandbox write: ${err.message}`);
    }
  }

  private getFallbackAgentContent(topic: string, agentName: string, messages: ChatMessage[]): string {
    const topicEscaped = topic.length > 50 ? topic.slice(0, 50) + '...' : topic;
    switch (agentName) {
      case 'Visionary':
        const visContent = `Strategic priorities set for Dubstrata Alt-Data Graph RAG under SOP-STR-001.\n<FILE_WRITE path="strategy.md"># Dubstrata Strategy: Causal Graph RAG & Polymarket\n- Target B2B Quant Hedge Funds\n- Integrate real-time Polymarket orderbooks and conviction metrics for "${topicEscaped}"</FILE_WRITE>`;
        this.mockAgentSandboxWrite(agentName, 'strategy.md', `# Dubstrata Strategy: Causal Graph RAG & Polymarket\n- Target B2B Quant Hedge Funds\n- Integrate real-time Polymarket orderbooks and conviction metrics for "${topicEscaped}"`);
        return visContent;
      case 'Systematiser':
        const sysContent = `Wrote ingestion process mapping to process_mapping_initial.md.\n<FILE_WRITE path="process_mapping_initial.md"># Ingestion Mapping\n- Source "${topicEscaped}" via Playwright scrapers\n- Synthesize claims and insert into ArcadeDB via Cypher MERGE</FILE_WRITE>`;
        this.mockAgentSandboxWrite(agentName, 'process_mapping_initial.md', `# Ingestion Mapping\n- Source "${topicEscaped}" via Playwright scrapers\n- Synthesize claims and insert into ArcadeDB via Cypher MERGE`);
        return sysContent;
      case 'Seller':
        const selContent = `Buyer qualification logged for MEDDPICC evaluation.\n<FILE_WRITE path="b2b_lead.json">{\n  "client_type": "Quantitative Hedge Fund",\n  "billing_setup": "USDC micro-billing balance",\n  "target_query": "Polymarket CSI consensus for ${topicEscaped}"\n}</FILE_WRITE>`;
        this.mockAgentSandboxWrite(agentName, 'b2b_lead.json', `{\n  "client_type": "Quantitative Hedge Fund",\n  "billing_setup": "USDC micro-billing balance",\n  "target_query": "Polymarket CSI consensus for ${topicEscaped}"\n}`);
        return selContent;
      case 'Producer':
        const prodContent = `Active engineering tasks created in backlog.md.\n<FILE_WRITE path="backlog.md">- [ ] Configure system_telemetry_rollups for "${topicEscaped}"\n- [ ] Implement daily Parquet exporter bucket triggers</FILE_WRITE>`;
        this.mockAgentSandboxWrite(agentName, 'backlog.md', `- [ ] Configure system_telemetry_rollups for "${topicEscaped}"\n- [ ] Implement daily Parquet exporter bucket triggers`);
        return prodContent;
      case 'Controller':
        const finContent = `Financial double-spend audit complete. Logs written to compliance.txt.\n<FILE_WRITE path="compliance.txt">Compliance status: PASSED\nx402 Solana signature verified: 8810ms latency\nUSDC billing balance deduction locked in billing_credits.</FILE_WRITE>`;
        this.mockAgentSandboxWrite(agentName, 'compliance.txt', `Compliance status: PASSED\nx402 Solana signature verified: 8810ms latency\nUSDC billing balance deduction locked in billing_credits.`);
        return finContent;
      default:
        return `Awaiting next instructions on ${topicEscaped}.`;
    }
  }

  public getAutopilot(): boolean {
    return this.autoPilot;
  }

  public setAutopilot(val: boolean) {
    this.autoPilot = val;
    logger.info(`🔄 [AUTOPILOT] System Autopilot state set to: ${val}`);
  }

  public async runAutopilotLoop(topic: string): Promise<void> {
    logger.info(`🔄 [AUTOPILOT LOOP] Starting background loop for topic: "${topic}"`);
    let continueLoop = true;
    let turns = 0;
    const maxTurns = 12;

    while (continueLoop && turns < maxTurns) {
      // Delay 3 seconds for readability and natural response pacing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const history = this.getHistory();
        const session = history.find(s => s.topic.toLowerCase() === topic.toLowerCase());
        if (!session) {
          logger.warn(`[AUTOPILOT] Session not found for "${topic}". Stopping loop.`);
          break;
        }

        // If autopilot was turned off midway, terminate the loop
        if (!this.autoPilot) {
          logger.info(`[AUTOPILOT] Autopilot disabled globally. Terminating background loop for "${topic}".`);
          break;
        }

        const lastMsg = session.messages[session.messages.length - 1];
        if (lastMsg && (lastMsg.sender === 'User' || lastMsg.sender === 'Daemon')) {
          // If Operator or System initiated or responded, run orchestrator to select next subagent
          const { nextSpeaker } = await this.orchestrateNextSpeaker(topic);
          turns++;
          if (nextSpeaker === 'User' || nextSpeaker === 'None') {
            continueLoop = false;
          }
        } else {
          // If subagent responded, run orchestrator to trigger next
          const { nextSpeaker } = await this.orchestrateNextSpeaker(topic);
          turns++;
          if (nextSpeaker === 'User' || nextSpeaker === 'None') {
            continueLoop = false;
          }
        }
      } catch (err: any) {
        logger.error(`[AUTOPILOT ERROR] Step execution failed: ${err.message}`);
        continueLoop = false;
      }
    }
    logger.info(`🔄 [AUTOPILOT LOOP] Completed loop for topic: "${topic}". Total turns executed: ${turns}`);
  }
}
