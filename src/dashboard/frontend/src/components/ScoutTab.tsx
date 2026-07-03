import React, { useState, useEffect, useCallback } from 'react';
import { useEventStream } from '../context/EventStreamContext';
import { Sparkles, RefreshCw } from 'lucide-react';

interface ScoutTabProps {
  onOpenConsensusModal: (marketId: string) => void;
}

export const ScoutTab: React.FC<ScoutTabProps> = ({ onOpenConsensusModal }) => {
  const { marketsList, refreshAll, analyzeTradeDirect, loading } = useEventStream();
  const [scanning, setScanning] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [projections, setProjections] = useState<any[]>([]);
  const [loadingProjections, setLoadingProjections] = useState(false);
  const [evaluatingTrade, setEvaluatingTrade] = useState<{ [marketId: string]: boolean }>({});

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const fetchProjections = useCallback(async () => {
    setLoadingProjections(true);
    try {
      const res = await fetch('/api/portfolio/projections');
      if (res.ok) {
        const data = await res.json();
        setProjections(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch causal projections', err);
    } finally {
      setLoadingProjections(false);
    }
  }, []);

  useEffect(() => {
    fetchProjections();
  }, [fetchProjections]);

  const handleRunScanner = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scout/recommendations');
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data || []);
      }
    } catch (err) {
      console.error('Failed to run opportunities scanner', err);
    } finally {
      setScanning(false);
    }
  };

  const handleAnalyzeTrade = async (marketId: string) => {
    setEvaluatingTrade(prev => ({ ...prev, [marketId]: true }));
    try {
      const tradeRes = await analyzeTradeDirect(marketId);
      if (tradeRes.status === 'HOLD') {
        alert(`🚫 Causal Query Error on Live DB: Evaluated to HOLD to protect capital. Cryptographic ledger receipt committed.`);
      } else {
        alert(`✅ Dynamic Causal Position Executed!\n- Decision: BUY ${tradeRes.decision}\n- Size: $${tradeRes.betAmount}\n- Avg Cost: ${tradeRes.price}\n- TxHash: ${tradeRes.txHash.slice(0, 16)}...`);
      }
      fetchProjections();
    } catch (err: any) {
      alert(`Trade evaluation failed: ${err.message}`);
    } finally {
      setEvaluatingTrade(prev => ({ ...prev, [marketId]: false }));
    }
  };

  return (
    <div>
      {/* AI Recommended Opportunities Panel */}
      <div className="glass-panel" style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.15)', position: 'relative', overflow: 'hidden' }}>
        <div className="card-glow" style={{ background: 'radial-gradient(circle at top left, rgba(99, 102, 241, 0.12), transparent 60%)' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Sparkles size={20} style={{ color: 'var(--accent-color)' }} />
              Top 5 AI Recommended Opportunities
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0 }}>
              Automated neural scanner evaluating all active Polymarket contracts for discrepancies, sentiment skews, and high-yield possibilities.
            </p>
          </div>
          <button 
            onClick={handleRunScanner} 
            className="btn-primary" 
            disabled={scanning}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Sparkles size={16} />
            {scanning ? 'Scanning...' : 'Run AI Opportunities Scanner'}
          </button>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Click <strong>"Run AI Opportunities Scanner"</strong> above to crawl all active Polymarket scouted listings and evaluate the top 5 high-potential opportunities.
              </p>
            </div>
          ) : (
            <div className="markets-grid">
              {recommendations.map((rec: any) => {
                return (
                  <div key={rec.id} className="market-card-scout">
                    <div>
                      <div className="flex-between">
                        <span className="market-category">{rec.category || 'OPPORTUNITY'}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: '700' }}>
                          Edge: {Math.round(rec.edge * 100)}%
                        </span>
                      </div>
                      <h3 className="market-question" style={{ fontSize: '1rem' }}>{rec.question}</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
                        Rationale: {rec.scoutingContext || 'Optimal edge calculated.'}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => onOpenConsensusModal(rec.id)} 
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        👥 Consensus
                      </button>
                      <button 
                        onClick={() => handleAnalyzeTrade(rec.id)} 
                        className="btn-primary" 
                        disabled={evaluatingTrade[rec.id]}
                        style={{ flex: 2, padding: '0.45rem', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        {evaluatingTrade[rec.id] ? 'Evaluating...' : '⚡ Trade'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Markets Scout Listings */}
      <div className="glass-panel">
        <div className="panel-header">
          <div>
            <h2>Polymarket Active Scout</h2>
            <p>Live listings fetched from the Polymarket Gamma API, ready for causal analysis.</p>
          </div>
          <button 
            onClick={refreshAll} 
            className="btn-primary" 
            disabled={loading.markets}
            style={{ padding: '0.5rem 1.2rem' }}
          >
            <RefreshCw size={16} className={loading.markets ? 'animate-spin' : ''} />
            {loading.markets ? 'Fetching...' : 'Fetch Live Scout Listings'}
          </button>
        </div>

        <div className="markets-grid" style={{ marginBottom: '2.5rem' }}>
          {marketsList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No active markets fetched from Gamma API.</p>
            </div>
          ) : (
            marketsList.map((group) => {
              if (group.type === 'grouped-weather') {
                const vol = group.volume || 0;
                const volumeMillions = (vol / 1000000).toFixed(2);
                const markets = group.markets || [];

                return (
                  <div 
                    key={group.key} 
                    className="market-card-scout weather-grouped-card" 
                    style={{ gridColumn: '1 / -1', background: 'rgba(30, 30, 45, 0.25)', borderColor: 'rgba(99, 102, 241, 0.25)', padding: '1.5rem' }}
                  >
                    <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                      <div>
                        <span className="market-category" style={{ background: 'linear-gradient(135deg, #ec4899, #6366f1)', color: '#fff' }}>
                          🌡️ Weather Event Group
                        </span>
                        <h3 className="market-question" style={{ fontSize: '1.25rem', marginTop: '0.4rem', marginBottom: 0 }}>
                          {group.city} Temperature Ranges ({group.date})
                        </h3>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div>Total Vol: ${volumeMillions}M</div>
                        <div>Active Brackets: {markets.length}</div>
                      </div>
                    </div>

                    {/* Probability Curve */}
                    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                        📊 Implied Probability Distribution
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '100px', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {markets.map((m) => {
                          const pct = Math.round(parseFloat(m.outcomePrices[0] || '0.5') * 100);
                          return (
                            <div key={m.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
                              <span style={{ fontSize: '0.7rem', color: '#e0e0e0', fontWeight: '600' }}>{pct}%</span>
                              <div style={{ width: '100%', background: 'linear-gradient(to top, rgba(99, 102, 241, 0.85), rgba(236, 72, 153, 0.85))', height: `${Math.max(4, pct)}px`, borderRadius: '3px 3px 0 0', minHeight: '4px', boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)' }}></div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }} title={m.range}>
                                {m.range}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Brackets List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {markets.map((m) => {
                        const yesPrice = Math.round(parseFloat(m.outcomePrices[0] || '0.5') * 100);
                        const noPrice = Math.round(parseFloat(m.outcomePrices[1] || '0.5') * 100);
                        return (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ fontWeight: 600, color: '#e0e0e0', fontSize: '0.9rem', flex: 1 }}>{m.range}</div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 2, justifyContent: 'flex-end' }}>
                              <span className="odds-pill yes-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>YES {yesPrice}%</span>
                              <span className="odds-pill no-pill" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>NO {noPrice}%</span>
                              <button 
                                onClick={() => onOpenConsensusModal(m.id)} 
                                className="btn-secondary" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}
                              >
                                👥 Consensus
                              </button>
                              <button 
                                onClick={() => handleAnalyzeTrade(m.id)} 
                                className="btn-primary" 
                                disabled={evaluatingTrade[m.id]}
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', minWidth: '70px' }}
                              >
                                {evaluatingTrade[m.id] ? '...' : '⚡ Trade'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              } else {
                const volMillions = (parseInt(group.volume ? String(group.volume) : '0') / 1000000).toFixed(2);
                const mId = group.id || '';
                return (
                  <div key={mId} className="market-card-scout">
                    <div>
                      <span className="market-category">{group.category || 'OPPORTUNITY'}</span>
                      <h3 className="market-question">{group.question || 'N/A'}</h3>
                      {group.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={group.description}>
                          {group.description}
                        </p>
                      )}
                      <div className="odds-display">
                        <div className="odds-option yes-option">
                          <div className="odds-name">{(group.outcomes && group.outcomes[0]) || 'YES'}</div>
                          <div className="odds-percentage">{Math.round(parseFloat((group.outcomePrices && group.outcomePrices[0]) || '0.5') * 100)}%</div>
                        </div>
                        <div className="odds-option no-option">
                          <div className="odds-name">{(group.outcomes && group.outcomes[1]) || 'NO'}</div>
                          <div className="odds-percentage">{Math.round(parseFloat((group.outcomePrices && group.outcomePrices[1]) || '0.5') * 100)}%</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="market-stats">
                      <span>Vol: ${volMillions}M</span>
                      <span>Expires: {group.endDate ? new Date(group.endDate).toLocaleDateString() : 'N/A'}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => onOpenConsensusModal(mId)} 
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        👥 Consensus
                      </button>
                      <button 
                        onClick={() => handleAnalyzeTrade(mId)} 
                        className="btn-primary" 
                        disabled={evaluatingTrade[mId]}
                        style={{ flex: 2, padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        {evaluatingTrade[mId] ? 'Evaluating...' : '⚡ Analyze & Trade'}
                      </button>
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>

        {/* Live Causal Position Projections */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem' }}>
          <div className="panel-header">
            <div>
              <h2>Live Position Tracker &amp; Causal Projections</h2>
              <p>Real-time ground-truth weather forecasts and interest rate trend projections queried from the Dubstrata MCP causal graph.</p>
            </div>
            <button 
              onClick={fetchProjections} 
              className="btn-primary" 
              disabled={loadingProjections}
              style={{ padding: '0.5rem 1.2rem' }}
            >
              <RefreshCw size={16} className={loadingProjections ? 'animate-spin' : ''} />
              {loadingProjections ? 'Refreshing...' : 'Refresh Causal Projections'}
            </button>
          </div>

          <div className="markets-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            {projections.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  No active positions tracked yet. Execute BUY trades in the Scout tab or Portfolio tab to start tracing.
                </p>
              </div>
            ) : (
              projections.map((p: any) => {
                const trendClass = (p.trend || 'stable').toLowerCase();
                const trendLabel = (p.trend || 'stable').replace('_', ' ');
                const pctChance = Math.round((p.winProbability || 0) * 100);
                
                // Color mapping for trend status
                let trendColor = 'var(--text-secondary)';
                if (trendClass === 'on_track') trendColor = 'var(--success-color)';
                else if (trendClass === 'at_risk') trendColor = 'var(--danger-color)';

                return (
                  <div key={p.marketId} className="market-card-scout" style={{ padding: '1.5rem', gap: '1.25rem' }}>
                    <div>
                      <div className="flex-between">
                        <h3 className="market-question" style={{ fontSize: '1.15rem', margin: 0, flex: 1 }}>{p.marketQuestion}</h3>
                        <span className="engine-badge" style={{ borderColor: trendColor, color: trendColor }}>
                          <span className="pulse-dot" style={{ backgroundColor: trendColor }}></span>
                          {trendLabel}
                        </span>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.825rem', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                        📊 Ground-Truth: <strong>{p.observedCausalFact || 'Pending evaluation'}</strong>
                      </div>

                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Win Probability Projection: {pctChance}%
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pctChance}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-color), var(--success-color))' }}></div>
                      </div>

                      {/* Stats Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', marginTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>Position / Avg Cost</span>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            BUY <span className={`outcome-badge ${(p.outcome || 'YES').toLowerCase()}`} style={{ scale: '0.85' }}>{p.outcome || 'YES'}</span> @ {(p.averagePrice * 100).toFixed(1)}¢
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>Shares / Total Cost</span>
                          <strong>
                            {p.shares ? parseFloat(p.shares).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} ({formatUSD(p.currentCost || 0)})
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>Projected Payout</span>
                          <strong style={{ color: 'var(--success-color)' }}>{formatUSD(p.expectedPayout || 0)}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem' }}>Projected Net P&amp;L</span>
                          <strong style={{ color: (p.projectedNetProfit || 0) >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                            {(p.projectedNetProfit || 0) >= 0 ? '+' : ''}{formatUSD(p.projectedNetProfit || 0)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      <strong style={{ color: '#fff', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                        🧠 Agent Causal Projection Commentary
                      </strong>
                      {p.causalCommentary || 'Causal briefing compilation in progress.'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
