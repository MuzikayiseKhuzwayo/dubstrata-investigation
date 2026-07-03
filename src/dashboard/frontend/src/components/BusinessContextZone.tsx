import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Briefcase, FileText } from 'lucide-react';

export const BusinessContextZone: React.FC = () => {
  const [context, setContext] = useState('');
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchContext = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business-context');
      if (res.ok) {
        const data = await res.json();
        setContext(data.context || '');
        setFilePath(data.filePath || '');
      }
    } catch (err) {
      console.error('Failed to fetch business context', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, []);

  const handleSaveContext = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/business-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, filePath })
      });
      if (res.ok) {
        alert('✅ Business context saved and local file synchronized successfully!');
      } else {
        alert('❌ Error: Failed to save business context.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Connection error saving business context.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
      <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} style={{ color: 'var(--accent-indigo)' }} />
            Business Context Configuration
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={fetchContext}
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Reset
            </button>
            <button
              className="btn-primary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={handleSaveContext}
              disabled={saving}
            >
              <Save size={12} />
              Save & Sync
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
          Provide the foundational B2B context for your business. The agents will reference these specifications dynamically during geopolitical news events and strategic decision cycles.
        </p>

        <textarea
          style={{
            width: '100%',
            height: '240px',
            background: '#070709',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '0.78rem',
            padding: '0.75rem',
            fontFamily: 'monospace',
            lineHeight: '1.4',
            resize: 'vertical'
          }}
          placeholder="e.g. Dubstrata is a B2B Alternative Data (Alt-Data) Engine & Causal Knowledge Graph custom-built for quantitative hedge funds and corporate risk officers. We monetize consensus indices, order flow toxicity, and SVAR impact ticks via Solana x402 compliance billing..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <h4 style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={14} style={{ color: 'var(--accent-green)' }} />
            Local System Synchronization Path
          </h4>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
            Specify a local system file path within the project workspace (e.g. <code>docs/data_dictionary.md</code> or <code>program.md</code>) to write this context text back directly to your main repository system file, preserving a single source of truth.
          </p>
          <input
            type="text"
            className="search-input"
            style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem' }}
            placeholder="e.g. docs/data_dictionary.md"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
