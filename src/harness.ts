import { DubstrataMCPClient } from './dubstrata/client';
import { AuditLogger } from './dubstrata/auditLogger';
import { ContentComplianceVerifier } from './content/complianceVerifier';
import { ContentEvaluator, ContentAsset } from './content/evaluator';
import { CURRENT_STRATEGY } from './content/strategy';
import { logger } from './utils/logger';
import { CausalLLMManager } from './utils/llmManager';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class TradingAgentHarness {
  public dubstrata: DubstrataMCPClient;
  public auditLogger: AuditLogger;
  public llm: CausalLLMManager;
  private isConnected = false;
  private assetsPath = './data/content_assets.json';

  constructor() {
    this.dubstrata = new DubstrataMCPClient();
    this.auditLogger = new AuditLogger();
    this.llm = new CausalLLMManager();
  }

  public async initialize(): Promise<boolean> {
    logger.info('Initializing Dubstrata-MCP Causal Content Engine Harness...');
    this.isConnected = await this.dubstrata.connect();
    return this.isConnected;
  }

  public async shutdown() {
    logger.info('Shutting down content engine harness...');
    await this.dubstrata.disconnect();
  }

  /**
   * Helper to load all stored content assets
   */
  private loadAssets(): ContentAsset[] {
    try {
      if (!fs.existsSync(this.assetsPath)) {
        return [];
      }
      return JSON.parse(fs.readFileSync(this.assetsPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  /**
   * Helper to save content assets
   */
  private saveAssets(assets: ContentAsset[]) {
    const dir = path.dirname(this.assetsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.assetsPath, JSON.stringify(assets, null, 2), 'utf-8');
  }

  /**
   * Run JIT causal research queries on a company/topic using the Dubstrata MCP server
   */
  public async researchTopic(topic: string, company?: string): Promise<string> {
    logger.info(`🧠 Inquiring Dubstrata Causal Graph for topic: "${topic}"...`);
    const searchTarget = company || topic;
    
    let combinedContext = '';
    try {
      const graphContext = await this.dubstrata.queryGraph(`What are the downstream causal impacts or architecture performance facts related to ${searchTarget}? Focus on latency, database traversal efficiency, and state validation.`);
      combinedContext += `--- Graph Query Context ---\n${graphContext}\n\n`;
    } catch (err: any) {
      logger.warn(`Dubstrata graph inquiry failed: ${err.message}`);
    }

    try {
      const facts = await this.dubstrata.getAllFacts(searchTarget);
      combinedContext += `--- Primary Facts ---\n${facts}\n\n`;
    } catch (err: any) {
      logger.warn(`Dubstrata get_all_facts failed: ${err.message}`);
    }

    try {
      const conflicts = await this.dubstrata.findConflicts(searchTarget);
      combinedContext += `--- Conflict Analysis ---\n${conflicts}\n\n`;
    } catch (err: any) {
      logger.warn(`Dubstrata find_conflicts failed: ${err.message}`);
    }

    return combinedContext || 'No causal graph context retrieved.';
  }

  /**
   * Generates a Strategic Geopolitical Decision Brief
   */
  public async generateXPulseContent(topic: string): Promise<ContentAsset> {
    logger.info(`⚡ [CONTENT HARNESS] Planning Strategic Decision Brief for topic: "${topic}"...`);
    
    // 1. Research topic using Dubstrata MCP
    const researchContext = await this.researchTopic(topic);

    // 2. Build system instructions incorporating strategy rules
    const systemInstruction = `
You are the Strata Geopolitical Strategy Director. Your goal is to write a highly analytical Strategic Decision and Risk Brief based on geopolitical alt-data.
Follow these structural guidelines:
1. Pacing constraint: Evaluate SVAR impact loops and transaction settlement delays.
2. Visceral verbs to prioritize: hedge, validate, leverage, audit, decouple.
3. Subvert standard market assumptions with a pattern interrupt.
4. Focus on the causal explanation. Provide a forward-looking risk prediction or key indicator to watch.

--- ALGORITHMIC CONSTRAINTS ---
- DO NOT use banned words: delve, tapestry, testament, beacon, fosters, nuanced, myriad, orchestrate, synergize, elevate.
- Short, logical points are mandatory for quantitative desks.
- Focus on causal graph connections, compliance verifications, and target allocations.
`;

    const prompt = `
Generate a Strategic Geopolitical Decision Brief for topic: "${topic}".
Real Causal Context from Dubstrata Graph:
"${researchContext}"

Draft the brief immediately. Do not include markdown code wrappers or chatty preambles.
`;

    const generatedText = await this.llm.queryModel(prompt, systemInstruction, false);

    // 3. Verify compliance
    const compliance = ContentComplianceVerifier.verify(generatedText);
    const assetId = `asset-${crypto.randomBytes(4).toString('hex')}`;

    const asset: ContentAsset = {
      id: assetId,
      type: 'GEOPOLITICAL',
      topic,
      title: `STRATEGIC BRIEF: ${topic}`,
      content: generatedText,
      status: 'PENDING_APPROVAL',
      timestamp: Date.now(),
      intervals: {}
    };

    // Save asset to database
    const assets = this.loadAssets();
    assets.push(asset);
    this.saveAssets(assets);

    // Append cryptographic audit
    const intent = {
      assetId,
      topic,
      type: 'GEOPOLITICAL' as const,
      promptUsed: systemInstruction,
      causalFactScraped: researchContext.slice(0, 1000),
      generatedText,
      timestamp: Date.now()
    };

    const complianceHash = crypto.createHash('sha256').update(JSON.stringify(compliance)).digest('hex');
    this.auditLogger.logAudit(intent, compliance.allowed ? 'PUBLISH' : 'REJECT', complianceHash, 'SIMULATED');

    return asset;
  }

  /**
   * Generates a short-form B2B outreach pitch (Outreach Email format)
   */
  public async generateB2BOutreach(companyName: string, detail: string): Promise<ContentAsset> {
    logger.info(`📧 [CONTENT HARNESS] Planning Outreach pitch for ${companyName} (${detail})...`);

    const researchContext = await this.researchTopic(companyName);

    const systemInstruction = `
You are a senior fund manager and technical sales engineer at Dubstrata. Write a B2B cold outreach email to the engineering team of "${companyName}".
Follow these guidelines:
1. Pacing constraint: ${CURRENT_STRATEGY.pacingRule}
2. Visceral verbs: ${CURRENT_STRATEGY.priorityVerbs.join(', ')}
3. Theme: ${CURRENT_STRATEGY.outreachPromptAddition}

--- CONSTRAINTS ---
- DO NOT use banned words: delve, tapestry, testament, beacon, fosters, nuanced, myriad, orchestrate, synergize, elevate.
- Return a subject line and the email body text.
`;

    const prompt = `
Generate personalization for company "${companyName}" on topic "${detail}".
Causal Context:
"${researchContext}"
`;

    const generatedText = await this.llm.queryModel(prompt, systemInstruction, false);
    const compliance = ContentComplianceVerifier.verify(generatedText);
    const assetId = `asset-${crypto.randomBytes(4).toString('hex')}`;

    const asset: ContentAsset = {
      id: assetId,
      type: 'OUTREACH',
      topic: `${companyName} outreach`,
      title: `Outreach to ${companyName}`,
      content: generatedText,
      status: 'PENDING_APPROVAL',
      timestamp: Date.now(),
      intervals: {}
    };

    const assets = this.loadAssets();
    assets.push(asset);
    this.saveAssets(assets);

    const intent = {
      assetId,
      topic: companyName,
      type: 'OUTREACH' as const,
      promptUsed: systemInstruction,
      causalFactScraped: researchContext.slice(0, 1000),
      generatedText,
      timestamp: Date.now()
    };
    const complianceHash = crypto.createHash('sha256').update(JSON.stringify(compliance)).digest('hex');
    this.auditLogger.logAudit(intent, compliance.allowed ? 'PUBLISH' : 'REJECT', complianceHash, 'SIMULATED');

    return asset;
  }

  /**
   * Generates a 7-step analytical video script beat sheet
   */
  public async generateVideoScript(topic: string, context: string): Promise<ContentAsset> {
    logger.info(`🎬 [CONTENT HARNESS] Synthesizing video script on: "${topic}"...`);

    const systemInstruction = `
You are an elite business/tech video essayist. Write a continuous spoken script for a video.
Follow these guidelines:
1. Pacing: Alternate sentence lengths. No chatty intros or outros.
2. Structure: ${CURRENT_STRATEGY.videoPromptAddition}

--- CONSTRAINTS ---
- DO NOT use banned words: delve, tapestry, testament, beacon, fosters, nuanced, myriad, orchestrate, synergize, elevate.
`;

    const prompt = `
Create a video script for topic "${topic}".
Background Context:
"${context}"
`;

    const generatedText = await this.llm.queryModel(prompt, systemInstruction, false);
    const compliance = ContentComplianceVerifier.verify(generatedText);
    const assetId = `asset-${crypto.randomBytes(4).toString('hex')}`;

    const asset: ContentAsset = {
      id: assetId,
      type: 'VIDEO',
      topic,
      title: `Video script: ${topic}`,
      content: generatedText,
      status: 'PENDING_APPROVAL',
      timestamp: Date.now(),
      intervals: {}
    };

    const assets = this.loadAssets();
    assets.push(asset);
    this.saveAssets(assets);

    const intent = {
      assetId,
      topic,
      type: 'VIDEO' as const,
      promptUsed: systemInstruction,
      causalFactScraped: context.slice(0, 1000),
      generatedText,
      timestamp: Date.now()
    };
    const complianceHash = crypto.createHash('sha256').update(JSON.stringify(compliance)).digest('hex');
    this.auditLogger.logAudit(intent, compliance.allowed ? 'PUBLISH' : 'REJECT', complianceHash, 'SIMULATED');

    return asset;
  }
}
