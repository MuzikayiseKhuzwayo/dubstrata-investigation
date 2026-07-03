import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AuditEntry {
  id: string;
  intent: {
    marketId: string;
    marketQuestion: string;
    outcomeSelected: 'YES' | 'NO';
    probabilityImplied: number;
    probabilityLLM: number;
    reasoning: string;
    amountUSD: number;
    timestamp: number;
  };
  decision: 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED_BY_MANDATE';
  mandateHash: string;
  executionStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SIMULATED';
  timestamp: number;
  verificationHash: string;
  blockReason?: string;
  executionPrice?: number;
  sharesAcquired?: number;
  transactionHash?: string;
}

export interface PortfolioPosition {
  marketId: string;
  marketQuestion: string;
  outcome: 'YES' | 'NO';
  sharesOwned: number;
  avgCost: number;
  livePrice: number;
  liveValue: number;
  unrealizedPnL: number;
  timestamp: number;
}

export interface RealizedLog {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: 'YES' | 'NO';
  investment: number;
  payout: number;
  netProfit: number;
  status: 'WON' | 'LOST' | 'MANDATE_BLOCKED';
  resolvedAt: number;
}

export interface WeatherBracket {
  id: string;
  question: string;
  range: string;
  outcomePrices: string[];
  outcomes: string[];
  volume: string;
  liquidity?: string;
  clobTokenIds?: string[];
  endDate?: string;
  category?: string;
  description?: string;
  rules?: string;
}

export interface MarketGroup {
  type: 'grouped-weather' | 'single';
  key?: string;
  city?: string;
  date?: string;
  volume?: number;
  markets?: WeatherBracket[];
  
  // Single market fields
  id?: string;
  question?: string;
  category?: string;
  outcomes?: string[];
  outcomePrices?: string[];
  endDate?: string;
  description?: string;
  rules?: string;
}

export interface RSSFeedItem {
  id: string;
  title: string;
  source: string;
  type: 'MONEY' | 'PEOPLE' | 'GENERAL';
  time: string;
  snippet: string;
  summary?: string;
  sentimentScore?: number;
  extractedKeywords?: string[];
}

export interface Mandate {
  allowedCategories: string[];
  maxPositionSize: number;
  dailyLimit: number;
  allowedOutcomes: string[];
  signature: string;
  signer: string;
}

export interface EventStreamContextProps {
  connected: boolean;
  daemonRunning: boolean;
  daemonStatus: any;
  simBalance: number;
  openPositionsCount: number;
  auditCount: number;
  complianceSecure: boolean;
  portfolioList: PortfolioPosition[];
  realizedList: RealizedLog[];
  marketsList: MarketGroup[];
  rssList: RSSFeedItem[];
  mandatesList: Mandate[];
  logsList: AuditEntry[];
  loading: { [key: string]: boolean };
  refreshAll: () => Promise<void>;
  toggleDaemon: () => Promise<void>;
  settleTrades: () => Promise<void>;
  runOpportunitiesScanner: () => Promise<any[]>;
  analyzeTradeDirect: (marketId: string) => Promise<any>;
  submitFeedback: (logId: string, score: number, reason: string) => Promise<void>;
  compileDailyReport: () => Promise<string>;
  selectedChatTopic: string;
  setSelectedChatTopic: (topic: string) => void;
  activeAlert: { title: string; message: string; topic?: string } | null;
  dismissAlert: () => void;
}

const EventStreamContext = createContext<EventStreamContextProps | undefined>(undefined);

export const EventStreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [daemonRunning, setDaemonRunning] = useState(false);
  const [daemonStatus, setDaemonStatus] = useState<any>({});
  
  // Dashboard states
  const [simBalance, setSimBalance] = useState(0);
  const [openPositionsCount, setOpenPositionsCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);
  const [complianceSecure, setComplianceSecure] = useState(true);
  const [portfolioList, setPortfolioList] = useState<PortfolioPosition[]>([]);
  const [realizedList, setRealizedList] = useState<RealizedLog[]>([]);
  const [marketsList] = useState<MarketGroup[]>([]);
  const [rssList, setRssList] = useState<RSSFeedItem[]>([]);
  const [mandatesList] = useState<Mandate[]>([]);
  const [logsList, setLogsList] = useState<AuditEntry[]>([]);
  const [activeAlert, setActiveAlert] = useState<{ title: string; message: string; topic?: string } | null>(null);
  const dismissAlert = () => setActiveAlert(null);
  const [selectedChatTopic, setSelectedChatTopic] = useState<string>('');

  // Loading states
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    status: false,
    markets: false,
    rss: false,
    mandates: false,
  });

  // Base fetch helper
  const fetchJSON = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Request failed with status ${res.status}`);
    }
    return res.json();
  };

  // State fetchers
  const fetchStatus = useCallback(async () => {
    setLoading(prev => ({ ...prev, status: true }));
    try {
      const data = await fetchJSON('/api/status');
      setSimBalance(data.simulatedBalance || 0);
      setOpenPositionsCount(data.openPositionsCount || 0);
      setAuditCount(data.auditCount || 0);
      setComplianceSecure(data.complianceStatus === 'SECURE');
      setPortfolioList(data.portfolio?.positions ? Object.values(data.portfolio.positions) : []);
      setRealizedList(data.realizedProfitLedger || []);
      setDaemonStatus(data.daemon || {});
      setDaemonRunning(data.daemon?.isRunning || false);
      setLogsList(data.auditLogs || []);
    } catch (err) {
      console.error('Failed to fetch dashboard status', err);
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  }, []);

  const fetchRSS = useCallback(async () => {
    setLoading(prev => ({ ...prev, rss: true }));
    try {
      const data = await fetchJSON('/api/content/rss-feeds');
      setRssList(data || []);
    } catch (err) {
      console.error('Failed to fetch RSS feeds', err);
    } finally {
      setLoading(prev => ({ ...prev, rss: false }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchRSS()]);
  }, [fetchStatus, fetchRSS]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Server-Sent Events listener
  useEffect(() => {
    const sseUrl = '/api/events';
    let eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      setConnected(true);
      console.log('🔌 Connected to visualizer SSE stream.');
    };

    eventSource.onerror = (e) => {
      setConnected(false);
      console.warn('⚠️ SSE stream disconnected. Retrying connection...', e);
      eventSource.close();
      
      // Reconnect after 3 seconds
      setTimeout(() => {
        eventSource = new EventSource(sseUrl);
      }, 3000);
    };

    eventSource.addEventListener('status', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setDaemonRunning(data.daemonRunning);
      } catch (err) {
        console.error('Failed to parse status event', err);
      }
    });

    eventSource.addEventListener('daemon_status', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setDaemonStatus(data);
        setDaemonRunning(data.isRunning);
      } catch (err) {
        console.error('Failed to parse daemon_status event', err);
      }
    });

    eventSource.addEventListener('daemon_cycle_start', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setDaemonStatus((prev: any) => ({ ...prev, lastRunTime: data.lastRunTime }));
      } catch (err) {
        console.error('Failed to parse daemon_cycle_start event', err);
      }
    });

    eventSource.addEventListener('audit_logged', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setLogsList(prev => [data, ...prev].slice(0, 100)); // Cap local list
        setAuditCount(prev => prev + 1);
        
        // Dynamic re-valuation on logs
        fetchStatus();
      } catch (err) {
        console.error('Failed to parse audit_logged event', err);
      }
    });

    eventSource.addEventListener('alert', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setActiveAlert(data);
      } catch (err) {
        console.error('Failed to parse alert event', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [fetchStatus]);

  // User trigger bindings
  const toggleDaemon = async () => {
    try {
      const res = await fetchJSON('/api/daemon/toggle', { method: 'POST' });
      setDaemonRunning(res.isRunning);
      setDaemonStatus(res);
    } catch (err: any) {
      alert(`Failed to toggle daemon: ${err.message}`);
    }
  };

  const settleTrades = async () => {
    try {
      await fetchJSON('/api/portfolio/settle', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      alert(`Settlement failed: ${err.message}`);
    }
  };

  const runOpportunitiesScanner = async (): Promise<any[]> => {
    return fetchJSON('/api/scout/recommendations');
  };

  const analyzeTradeDirect = async (marketId: string) => {
    const res = await fetchJSON('/api/scout/analyze-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId })
    });
    await fetchStatus();
    return res;
  };

  const submitFeedback = async (logId: string, score: number, reason: string) => {
    await fetchJSON('/api/content/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, score, reason })
    });
  };

  const compileDailyReport = async (): Promise<string> => {
    const report = await fetchJSON('/api/portfolio/compile-report', { method: 'POST' });
    return report.markdownContent || '';
  };

  return (
    <EventStreamContext.Provider value={{
      connected,
      daemonRunning,
      daemonStatus,
      simBalance,
      openPositionsCount,
      auditCount,
      complianceSecure,
      portfolioList,
      realizedList,
      marketsList,
      rssList,
      mandatesList,
      logsList,
      loading,
      refreshAll,
      toggleDaemon,
      settleTrades,
      runOpportunitiesScanner,
      analyzeTradeDirect,
      submitFeedback,
      compileDailyReport,
      selectedChatTopic,
      setSelectedChatTopic,
      activeAlert,
      dismissAlert
    }}>
      {children}
    </EventStreamContext.Provider>
  );
};

export const useEventStream = () => {
  const context = useContext(EventStreamContext);
  if (context === undefined) {
    throw new Error('useEventStream must be used within an EventStreamProvider');
  }
  return context;
};
