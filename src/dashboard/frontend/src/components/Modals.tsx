import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const BaseModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="premium-modal">
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div 
            className="modal-wrapper"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="modal-header">
              <h3>{title}</h3>
              <button className="modal-close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// 1. Consensus Weight Analysis Modal
// ==========================================
interface ConsensusModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string | null;
}

export const ConsensusModal: React.FC<ConsensusModalProps> = ({ isOpen, onClose, marketId }) => {
  const [consensus, setConsensus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && marketId) {
      setLoading(true);
      setConsensus(null);
      fetch(`/api/markets/consensus/${marketId}`)
        .then((res) => res.json())
        .then((data) => {
          setConsensus(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, marketId]);

  if (!isOpen) return null;

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={consensus ? `👥 Consensus: ${consensus.marketQuestion}` : '👥 Loading Consensus...'}
    >
      {loading && <div className="spinner" style={{ margin: '4rem auto' }}></div>}
      
      {!loading && !consensus && (
        <p style={{ color: 'var(--danger-color)', textAlign: 'center' }}>
          Failed to load consensus metrics for this market.
        </p>
      )}

      {!loading && consensus && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Sentiment index */}
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
                Consensus Sentiment Index
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: consensus.sentimentScore >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {consensus.sentimentScore > 0 ? '+' : ''}{consensus.sentimentScore}
              </div>
              <strong style={{ fontSize: '0.9rem', color: consensus.sentimentScore >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {consensus.stance?.replace('_', ' ')}
              </strong>
            </div>

            {/* Spread */}
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
                CLOB Order Book Spread
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>
                {(consensus.spread * 100).toFixed(2)}¢
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Spread: ${consensus.spread} USDC
              </span>
            </div>

            {/* Depth */}
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
                Order Book Depth
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>
                {formatUSD(consensus.totalBidsVolume + consensus.totalAsksVolume)}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Bids: {formatUSD(consensus.totalBidsVolume)} | Asks: {formatUSD(consensus.totalAsksVolume)}
              </span>
            </div>
          </div>

          {/* Imbalance gauge */}
          {(() => {
            const bidsPercent = Math.round(consensus.bidAskImbalance * 100);
            const asksPercent = 100 - bidsPercent;
            return (
              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--success-color)' }}>🟢 Buy Bid Depth ({bidsPercent}%)</span>
                  <span style={{ color: 'var(--text-secondary)' }}>CLOB Book Imbalance</span>
                  <span style={{ color: 'var(--danger-color)' }}>🔴 Sell Ask Depth ({asksPercent}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: 'rgba(244, 63, 94, 0.2)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${bidsPercent}%`, height: '100%', background: 'var(--success-color)', transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.4 }}>
                  An imbalance favoring Buy Bid Depth indicates strong buying support and upward price pressure.
                </div>
              </div>
            );
          })()}

          {/* Leaderboard table */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--accent-color)' }} />
              Top Active Traders &amp; Conviction Weights
            </h3>
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                    <th>Address</th>
                    <th>Nickname</th>
                    <th>Trader Role</th>
                    <th>Portfolio Size</th>
                    <th>Accuracy (Win Rate)</th>
                    <th>Stance Shares</th>
                    <th>Stance</th>
                    <th style={{ textAlign: 'right', color: 'var(--accent-color)' }}>Conviction Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {consensus.traders?.map((t: any, idx: number) => {
                    const badgeColor = t.role === 'Whale Elite' ? '#ec4899' : (t.role === 'Sharp Prophet' ? '#6366f1' : '#10b981');
                    return (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a5b4fc' }}>
                          {t.address.slice(0, 6)}...{t.address.slice(-4)}
                        </td>
                        <td style={{ fontWeight: 500 }}>{t.name}</td>
                        <td>
                          <span style={{ background: `rgba(${t.role === 'Whale Elite' ? '236,72,153' : (t.role === 'Sharp Prophet' ? '99,102,241' : '16,185,129')}, 0.15)`, color: badgeColor, padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {t.role}
                          </span>
                        </td>
                        <td>{formatUSD(t.balanceUSD)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontWeight: 600, color: t.winRate >= 0.6 ? 'var(--success-color)' : '#fff' }}>{Math.round(t.winRate * 100)}%</span>
                            <div style={{ width: '40px', background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px' }}>
                              <div style={{ background: 'var(--success-color)', height: '100%', width: `${t.winRate * 100}%`, borderRadius: '2px' }}></div>
                            </div>
                          </div>
                        </td>
                        <td>{t.shares.toLocaleString()}</td>
                        <td>
                          <span className={`outcome-badge ${t.outcome.toLowerCase()}`}>
                            {t.outcome}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-color)' }}>
                          {t.weight.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', lineHeight: 1.4 }}>
            <strong>Methodology Note:</strong> Conviction weights are computed using the digital verify index rule: 
            <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--accent-color)', marginLeft: '0.2rem' }}>Weight = (Portfolio Balance / 1,000) * (Win Rate)^2</code>. 
            This weights high-accuracy, large-capital Sharp and Whale participants disproportionately higher than retail swing traders to ensure institutional-grade consensus mapping.
          </div>
        </div>
      )}
    </BaseModal>
  );
};

// ==========================================
// 2. Daily Report Markdown Modal
// ==========================================
interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, markdown }) => {
  // A clean simple client-side markdown parsing function inside component
  const parseMarkdownToHTML = (md: string) => {
    let lines = md.split('\n');
    let htmlLines = [];
    let inList = false;
    let inTable = false;
    let tableHtml = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Table parsing
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHtml = '<table class="premium-table">';
        }
        if (line.includes('---|') || line.includes('--|')) {
          continue;
        }
        const isHeader = !tableHtml.includes('<th>');
        const cellTag = isHeader ? 'th' : 'td';
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        tableHtml += '<tr>';
        for (const cell of cells) {
          let cellParsed = cell
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
          tableHtml += `<${cellTag}>${cellParsed}</${cellTag}>`;
        }
        tableHtml += '</tr>';
        continue;
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</table>';
          htmlLines.push(tableHtml);
        }
      }

      if (!line) {
        if (inList) {
          inList = false;
          htmlLines.push('</ul>');
        }
        continue;
      }

      // Headers
      if (line.startsWith('###')) {
        htmlLines.push(`<h4 style="margin: 1.25rem 0 0.5rem 0; color: #fff; font-family: var(--font-display); font-size: 1.1rem; font-weight: 700;">${line.substring(3).trim()}</h4>`);
      } else if (line.startsWith('##')) {
        htmlLines.push(`<h3 style="margin: 1.75rem 0 0.75rem 0; color: var(--accent-color); font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">${line.substring(2).trim()}</h3>`);
      } else if (line.startsWith('#')) {
        htmlLines.push(`<h2 style="margin: 0 0 1rem 0; color: #fff; font-family: var(--font-display); font-size: 1.5rem; font-weight: 800;">${line.substring(1).trim()}</h2>`);
      }
      // Bullet lists
      else if (line.startsWith('-') || line.startsWith('*')) {
        if (!inList) {
          inList = true;
          htmlLines.push('<ul style="margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: square; color: var(--text-secondary);">');
        }
        let itemText = line.substring(1).trim()
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
        htmlLines.push(`<li style="margin-bottom: 0.35rem;">${itemText}</li>`);
      }
      // Standard paragraphs
      else {
        if (inList) {
          inList = false;
          htmlLines.push('</ul>');
        }
        let paraText = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
        htmlLines.push(`<p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">${paraText}</p>`);
      }
    }

    if (inList) htmlLines.push('</ul>');
    if (inTable) htmlLines.push('</table>');

    return htmlLines.join('');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="📊 Daily Performance &amp; Integrity Audit">
      <div 
        style={{ textAlign: 'left' }}
        dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(markdown) }}
      />
    </BaseModal>
  );
};

// ==========================================
// 3. Asset Viewer Modal
// ==========================================
interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const AssetViewerModal: React.FC<AssetModalProps> = ({ isOpen, onClose, title, content }) => {
  const displayContent = Array.isArray(content) ? content.join('\n\n') : content;
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9rem', lineHeight: 1.5, fontFamily: 'monospace', color: '#e2e8f0', textAlign: 'left' }}>
          {displayContent}
        </pre>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
        <button className="btn-secondary" onClick={onClose}>
          Close Preview
        </button>
      </div>
    </BaseModal>
  );
};

// ==========================================
// 4. Realized Trade Audit Modal
// ==========================================
interface RealizedModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string | null;
}

export const RealizedTradeAuditModal: React.FC<RealizedModalProps> = ({ isOpen, onClose, marketId }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && marketId) {
      setLoading(true);
      setDetails(null);
      fetch(`/api/portfolio/realized/details/${marketId}`)
        .then((res) => res.json())
        .then((data) => {
          setDetails(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, marketId]);

  if (!isOpen) return null;

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const entry = details?.ledgerEntry;
  const logs = details?.auditLogs || [];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="📊 Realized Trade Lifecycle Audit">
      {loading && <div className="spinner" style={{ margin: '4rem auto' }}></div>}
      
      {!loading && !details && (
        <p style={{ color: 'var(--danger-color)', textAlign: 'center' }}>
          Failed to load audit logs for this transaction.
        </p>
      )}

      {!loading && entry && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '10px' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{entry.marketQuestion}</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', wordBreak: 'break-all' }}>
              <strong>Market ID:</strong> <code>{entry.marketId}</code>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Investment</span>
              <strong style={{ fontSize: '1.15rem' }}>{formatUSD(entry.investment)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Payout</span>
              <strong style={{ fontSize: '1.15rem' }}>{formatUSD(entry.payout)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Net Profit</span>
              <strong style={{ fontSize: '1.15rem', color: entry.netProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {entry.netProfit >= 0 ? '+' : ''}{formatUSD(entry.netProfit)}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Result Status</span>
              <span className={`outcome-badge ${entry.status.toLowerCase()}`}>{entry.status}</span>
            </div>
          </div>

          <h3 style={{ margin: '1rem 0 0.5rem 0', color: 'var(--accent-color)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⛓️ Chronological Trade Lifecycle &amp; Decision Logs
          </h3>

          <div className="timeline">
            {logs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center' }}>No audit blocks logged.</p>
            ) : (
              logs.map((log: any) => {
                const decisionClass = log.decision.toLowerCase();
                let badgeIcon = '📝';
                let decisionTitle = log.decision;

                if (log.decision === 'BUY') {
                  badgeIcon = '📥';
                  decisionTitle = 'Position Buy Executed';
                } else if (log.decision === 'SELL') {
                  badgeIcon = '📤';
                  decisionTitle = 'Position Resolved / Settled';
                } else if (log.decision === 'HOLD') {
                  badgeIcon = '⏳';
                  decisionTitle = 'Capital Protected / HOLD Order';
                } else if (log.decision === 'BLOCKED_BY_MANDATE') {
                  badgeIcon = '🚫';
                  decisionTitle = 'Order Blocked by Mandate Check';
                }

                return (
                  <div key={log.id} className={`timeline-event ${decisionClass}`}>
                    <div className="timeline-badge">{badgeIcon}</div>
                    <div className="timeline-content">
                      <div className="timeline-event-header">
                        <span className="timeline-event-title">{decisionTitle}</span>
                        <span className="timeline-event-time">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>

                      <div className="timeline-event-meta">
                        <div className="meta-field">
                          <span className="meta-label">Execution Status</span>
                          <span className="meta-value" style={{ color: log.executionStatus === 'SUCCESS' || log.executionStatus === 'SIMULATED' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                            {log.executionStatus}
                          </span>
                        </div>
                        <div className="meta-field">
                          <span className="meta-label">Price per Share</span>
                          <span className="meta-value">
                            {log.executionPrice ? `${formatUSD(log.executionPrice)}` : 'N/A'}
                          </span>
                        </div>
                        <div className="meta-field">
                          <span className="meta-label">Shares Exchanged</span>
                          <span className="meta-value">
                            {log.sharesAcquired ? log.sharesAcquired.toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {log.blockReason && (
                        <div style={{ marginTop: '0.5rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                          {log.blockReason}
                        </div>
                      )}

                      {log.intent.reasoning && (
                        <div className="timeline-event-reasoning">
                          <strong style={{ color: 'var(--accent-color)', fontSize: '0.7rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                            RAG reasoning
                          </strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: log.intent.reasoning }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </BaseModal>
  );
};
