import React, { useState } from 'react';
import { useEventStream } from '../context/EventStreamContext';
import { RefreshCw, Terminal, Award } from 'lucide-react';

export const SignalZone: React.FC = () => {
  const { rssList, refreshAll, daemonRunning, daemonStatus, loading } = useEventStream();
  const [selectedRss, setSelectedRss] = useState<any>(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
      
      {/* LEFT COLUMN: RSS Signal Inbox */}
      <div className="glass-panel" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>📰 Signal Ingestion Feed</h3>
            <p>Real-time scouting list scanning production XML streams.</p>
          </div>
          <button onClick={refreshAll} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} disabled={loading.rss}>
            <RefreshCw size={12} className={loading.rss ? 'animate-spin' : ''} /> Refresh Feeds
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: '1rem', overflow: 'hidden', minHeight: 0 }}>
          {/* RSS Items List (Inbox Column) */}
          <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--border-color)', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rssList.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No signals currently ingested.</p>
            ) : (
              rssList.map((item) => (
                <div 
                  key={item.id} 
                  className={`market-card-scout clickable-row ${selectedRss?.id === item.id ? 'active' : ''}`}
                  onClick={() => setSelectedRss(item)}
                  style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    background: selectedRss?.id === item.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.01)',
                    borderLeft: selectedRss?.id === item.id ? '3px solid var(--accent-indigo)' : '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span style={{
                      color: item.type === 'MONEY' ? 'var(--accent-green)' : (item.type === 'PEOPLE' ? 'var(--accent-indigo)' : '#38bdf8'),
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>{item.type}</span>
                    <span>{item.time}</span>
                  </div>
                  <h4 style={{ fontSize: '0.85rem', color: '#fff', margin: '0.25rem 0' }}>{item.title}</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Source: {item.source}</span>
                </div>
              ))
            )}
          </div>

          {/* RSS Item Details (Reader Column) */}
          <div style={{ flex: 1.2, overflowY: 'auto', paddingLeft: '0.5rem' }}>
            {selectedRss ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{
                    fontSize: '0.65rem',
                    color: selectedRss.type === 'MONEY' ? 'var(--accent-green)' : (selectedRss.type === 'PEOPLE' ? 'var(--accent-indigo)' : '#38bdf8'),
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    border: '1px solid',
                    borderColor: selectedRss.type === 'MONEY' ? 'rgba(16, 185, 129, 0.2)' : (selectedRss.type === 'PEOPLE' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(56, 189, 248, 0.2)'),
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.01)'
                  }}>{selectedRss.type}</span>
                  <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '0.5rem 0' }}>
                    {selectedRss.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Source: {selectedRss.source}</span>
                    <span>Time: {selectedRss.time}</span>
                  </div>
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  fontSize: '0.825rem', 
                  color: 'var(--text-primary)', 
                  lineHeight: 1.5,
                  border: '1px solid var(--border-color)'
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-indigo)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Article Summary
                  </strong>
                  {selectedRss.summary || selectedRss.snippet}
                </div>

                {selectedRss.extractedKeywords && selectedRss.extractedKeywords.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Extracted Keywords:</strong>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                      {selectedRss.extractedKeywords.map((kw: string) => (
                        <span key={kw} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Select an item in the feed inbox to read signal details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Background Daemon Console logs */}
      <div className="glass-panel" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <h3>🤖 Content Scout Daemon</h3>
          <p>Autonomous crawler executing background JIT evaluations.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
          
          {/* Status block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Daemon Run Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                <span className="pulse-dot" style={{ backgroundColor: daemonRunning ? 'var(--success-color)' : 'var(--danger-color)' }}></span>
                <strong style={{ fontSize: '0.9rem', color: daemonRunning ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {daemonRunning ? 'ACTIVE RUNNING' : 'PAUSED'}
                </strong>
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Last Scrape Cycle</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--accent-color)' }}>
                {daemonStatus?.lastRunTime ? new Date(daemonStatus.lastRunTime).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>

          {/* Console Output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
              <Terminal size={12} /> Live Daemon Log Telemetry
            </span>
            <div style={{ 
              flex: 1, 
              background: 'rgba(5, 6, 8, 0.75)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '0.75rem', 
              fontFamily: 'monospace', 
              fontSize: '0.75rem', 
              color: '#34d399', 
              overflowY: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {`[DAEMON_MONITOR] Ingress client successfully listening on eventBroker.\n`}
              {daemonRunning 
                ? `[DAEMON_INFO] Daemon is active. Scraper cron targeting VC Funding, Tech Releases, and Hires.\n[DAEMON_INFO] Query cache size: 12 nodes.\n[DAEMON_CYCLE] Scouter standing by for next cycle trigger.\n`
                : `[DAEMON_WARN] Daemon currently paused. Waiting for manual resume command.\n`
              }
              {daemonStatus?.lastRunTime && `[DAEMON_CYCLE] Completed cycle at ${new Date(daemonStatus.lastRunTime).toLocaleString()}.\n[DAEMON_PERSIST] Loaded cached feeds: 200 items.`}
            </div>
          </div>

          {/* Strategic Framework alignment indicator */}
          <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Award size={18} style={{ color: 'var(--success-color)' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--success-color)', display: 'block' }}>SPCL Positioning Framework Active</strong>
              Scouting templates check for control indicators and third-party credential parameters before drafting.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
