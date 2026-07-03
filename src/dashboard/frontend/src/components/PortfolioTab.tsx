import React, { useState } from 'react';
import { useEventStream } from '../context/EventStreamContext';
import { FileText, RefreshCw } from 'lucide-react';

interface PortfolioTabProps {
  onOpenReportModal: (markdown: string) => void;
  onOpenRealizedModal: (marketId: string) => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({ onOpenReportModal, onOpenRealizedModal }) => {
  const { portfolioList, realizedList, settleTrades, compileDailyReport } = useEventStream();
  const [compiling, setCompiling] = useState(false);
  const [settling, setSettling] = useState(false);

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const handleCompileReport = async () => {
    setCompiling(true);
    try {
      const markdown = await compileDailyReport();
      onOpenReportModal(markdown);
    } catch (err: any) {
      alert(`Report compilation failed: ${err.message}`);
    } finally {
      setCompiling(false);
    }
  };

  const handleSettleTrades = async () => {
    setSettling(true);
    try {
      await settleTrades();
    } catch (err: any) {
      alert(`Settle trades failed: ${err.message}`);
    } finally {
      setSettling(false);
    }
  };

  return (
    <div>
      {/* Open Portfolio Holdings Section */}
      <div className="glass-panel">
        <div className="panel-header">
          <div>
            <h2>Your Simulated Portfolio</h2>
            <p>Active positions acquired by the Fund Manager agent with live valuations.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={handleCompileReport} 
              className="btn-secondary" 
              disabled={compiling}
            >
              <FileText size={16} />
              {compiling ? 'Compiling...' : 'Compile Daily Report'}
            </button>
            <button 
              onClick={handleSettleTrades} 
              className="btn-primary" 
              disabled={settling}
            >
              <RefreshCw size={16} className={settling ? 'animate-spin' : ''} />
              {settling ? 'Settling...' : 'Refresh & Settle Trades'}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Market Question</th>
                <th>Outcome</th>
                <th>Shares Owned</th>
                <th>Avg Cost</th>
                <th>Live Price</th>
                <th>Live Value</th>
                <th>Unrealized P&amp;L</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {portfolioList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem' }}>
                    No positions currently held. Scout markets to evaluate and execute trades.
                  </td>
                </tr>
              ) : (
                portfolioList.map((pos) => {
                  const pnlColor = pos.unrealizedPnL >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
                  const pnlPrefix = pos.unrealizedPnL >= 0 ? '+' : '';
                  return (
                    <tr key={`${pos.marketId}-${pos.outcome}`}>
                      <td><strong>{pos.marketQuestion}</strong></td>
                      <td>
                        <span className={`outcome-badge ${pos.outcome.toLowerCase()}`}>
                          {pos.outcome}
                        </span>
                      </td>
                      <td>{pos.sharesOwned.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>{(pos.avgCost * 100).toFixed(1)}¢</td>
                      <td>{(pos.livePrice * 100).toFixed(1)}¢</td>
                      <td>{formatUSD(pos.liveValue)}</td>
                      <td style={{ color: pnlColor, fontWeight: '700' }}>
                        {pnlPrefix}{formatUSD(pos.unrealizedPnL)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {new Date(pos.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Realized Ledger Section */}
      <div className="glass-panel">
        <div className="panel-header">
          <div>
            <h2>Realized Profit Ledger</h2>
            <p>Immutable ledger of settled causal predictions resolved to USDC payouts. Click any row to view lifecycle audit chain.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Resolved Market Question</th>
                <th>Outcome</th>
                <th>Investment</th>
                <th>USDC Payout</th>
                <th>Net Profit</th>
                <th>Result</th>
                <th>Date Settled</th>
              </tr>
            </thead>
            <tbody>
              {realizedList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem' }}>
                    No settled trade records available. Expirations will automatically settle here.
                  </td>
                </tr>
              ) : (
                realizedList.map((entry) => {
                  const pnlColor = entry.netProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
                  const pnlPrefix = entry.netProfit >= 0 ? '+' : '';
                  
                  return (
                    <tr 
                      key={entry.id} 
                      className="clickable-row"
                      onClick={() => onOpenRealizedModal(entry.marketId)}
                      title="Click to view full decision and audit trail log"
                    >
                      <td><strong>{entry.marketQuestion}</strong></td>
                      <td>
                        <span className={`outcome-badge ${entry.outcome.toLowerCase()}`}>
                          {entry.outcome}
                        </span>
                      </td>
                      <td>{formatUSD(entry.investment)}</td>
                      <td>{formatUSD(entry.payout)}</td>
                      <td style={{ color: pnlColor, fontWeight: '700' }}>
                        {pnlPrefix}{formatUSD(entry.netProfit)}
                      </td>
                      <td>
                        <span className={`outcome-badge ${entry.status.toLowerCase()}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {new Date(entry.resolvedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
