import { TradingAgentHarness } from '../harness';
import { logger } from './logger';
import { fetchLiveRSSFeeds } from './rssScraper';
import { eventBroker } from './eventBroker';
import { AgentChatManager } from './agentChatManager';

export class Daemon {
  private harness: TradingAgentHarness;
  private chatManager: AgentChatManager | null = null;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private intervalMs: number = 300000; // Check RSS feeds every 5 minutes
  private lastRunTime: number = 0;

  constructor(harness: TradingAgentHarness) {
    this.harness = harness;
  }

  public setChatManager(chatManager: AgentChatManager) {
    this.chatManager = chatManager;
  }

  public start() {
    if (this.isRunning) {
      logger.info('Daemon is already running.');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting Daemon background risk monitoring loop...');

    // Run first cycle immediately
    this.runCycle().catch((err) => {
      logger.error(`Error in Daemon startup cycle: ${err.message}`);
    });

    this.intervalId = setInterval(() => {
      this.runCycle().catch((err) => {
        logger.error(`Error in Daemon execution cycle: ${err.message}`);
      });
    }, this.intervalMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('⏹️ Stopped Daemon background risk monitoring.');
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      lastRunTime: this.lastRunTime
    };
  }

  private detectEconomicRisk(item: any): boolean {
    const riskKeywords = [
      'recession', 'collapse', 'inflation', 'bankruptcy', 'debt', 'crisis',
      'tariff', 'sanctions', 'default', 'suspend', 'shutdown', 'yield curve',
      'rate cut', 'rate hike', 'downgrade', 'liquidity', 'deficit', 'contagion',
      'bailout', 'insolvency', 'volatility', 'bear market', 'decline'
    ];
    const text = `${item.title} ${item.snippet} ${item.summary || ''}`.toLowerCase();
    return riskKeywords.some(kw => text.includes(kw));
  }

  private async runCycle() {
    this.lastRunTime = Date.now();
    logger.info('🤖 [DAEMON] Starting economic risk analysis cycle...');
    eventBroker.broadcast('daemon_cycle_start', { lastRunTime: this.lastRunTime });

    try {
      // 1. Fetch latest RSS items
      const feeds = await fetchLiveRSSFeeds(true);
      if (feeds.length === 0) {
        logger.warn('[DAEMON] No RSS items found. Skipping cycle.');
        return;
      }

      // 2. Search for critical economic risks
      const riskItems = feeds.filter(item => this.detectEconomicRisk(item));
      logger.info(`🔍 [DAEMON] Analyzed ${feeds.length} feed signals. Detected ${riskItems.length} economic risk events.`);

      if (riskItems.length === 0) {
        logger.info('[DAEMON] No critical economic risk profiles matching filters identified in this cycle.');
        return;
      }

      // 3. Process the most recent risk item that we haven't debated yet
      if (!this.chatManager) {
        logger.warn('[DAEMON] ChatManager reference is not configured. Cannot trigger strategic debates.');
        return;
      }

      const activeChats = this.chatManager.getHistory();
      let targetRiskItem = null;

      for (const item of riskItems) {
        const hasSession = activeChats.some(s => s.topic.toLowerCase() === item.title.toLowerCase());
        if (!hasSession) {
          targetRiskItem = item;
          break;
        }
      }

      if (!targetRiskItem) {
        logger.info('[DAEMON] All identified economic risks already have active conversation sessions. Standing by.');
        return;
      }

      logger.info(`🚨 [DAEMON] Critical economic risk detected: "${targetRiskItem.title}". Starting subagent debate...`);

      // Initialize session on behalf of the Operator
      this.chatManager.initSession(targetRiskItem.title);

      // Add System Ingestion message from the Daemon
      const alertMessage = `🚨 [SYSTEM ALERT: RISK INGESTION]\n\nEvent: "${targetRiskItem.title}"\nSource: ${targetRiskItem.source} (${targetRiskItem.time})\n\nDescription:\n${targetRiskItem.summary || targetRiskItem.snippet}\n\nVisionary, formulate an SVAR impact loop and strategic decoupling path. Controller, check Solana compliance verifiers for transaction locks.`;
      
      this.chatManager.addMessageToSession(targetRiskItem.title, 'Daemon', alertMessage);

      // Trigger the debate loop autonomously
      this.chatManager.generateAgentResponse(targetRiskItem.title, 'Visionary')
        .then(() => {
          if (this.chatManager) {
            this.chatManager.runAutopilotLoop(targetRiskItem.title).catch(err => {
              logger.error(`[DAEMON] Background Autopilot loop failed: ${err.message}`);
            });
          }
        })
        .catch(err => {
          logger.error(`[DAEMON] Initial debate response failed: ${err.message}`);
        });

      // Broadcast modal alert to dashboard frontend
      eventBroker.broadcast('alert', {
        title: 'Critical Economic Risk Detected',
        message: `System Alert: "${targetRiskItem.title}". The Daemon has autonomously started a strategic debate session in the Agent Hub.`,
        topic: targetRiskItem.title
      });

    } catch (err: any) {
      logger.error(`[DAEMON ERROR] Cycle execution failed: ${err.message}`);
    }

    eventBroker.broadcast('daemon_status', this.getStatus());
  }
}
