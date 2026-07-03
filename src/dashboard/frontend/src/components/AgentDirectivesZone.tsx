import React, { useState, useEffect } from 'react';
import { ShieldAlert, Save, RefreshCw, Cpu } from 'lucide-react';

interface DirectivesMap {
  Visionary: string;
  Producer: string;
  Seller: string;
  Controller: string;
  Systematiser: string;
  hyperDirectives: string;
}

export const AgentDirectivesZone: React.FC = () => {
  const [directives, setDirectives] = useState<DirectivesMap>({
    Visionary: '',
    Producer: '',
    Seller: '',
    Controller: '',
    Systematiser: '',
    hyperDirectives: ''
  });
  const [selectedAgent, setSelectedAgent] = useState<'Visionary' | 'Producer' | 'Seller' | 'Controller' | 'Systematiser'>('Visionary');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // MCP Config State
  const [mcpKey, setMcpKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [mcpSaving, setMcpSaving] = useState(false);

  const fetchDirectives = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents/directives');
      if (res.ok) {
        const data = await res.json();
        setDirectives(data);
      }
    } catch (err) {
      console.error('Failed to fetch directives', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMcpConfig = async () => {
    try {
      const res = await fetch('/api/mcp/config');
      if (res.ok) {
        const data = await res.json();
        setMcpKey(data.apiKey || '');
        setIsConnected(data.isConnected || false);
      }
    } catch (err) {
      console.error('Failed to fetch MCP config', err);
    }
  };

  useEffect(() => {
    fetchDirectives();
    fetchMcpConfig();
  }, []);

  const handleSaveDirectives = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/agents/directives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directives)
      });
      if (res.ok) {
        alert('✅ Directives and prompts saved successfully!');
      } else {
        alert('❌ Error: Failed to save directives.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Connection error saving directives.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMcpConfig = async () => {
    setMcpSaving(true);
    try {
      const res = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: mcpKey })
      });
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.isConnected);
        alert(data.isConnected 
          ? '✅ Dubstrata API key saved and MCP connection established successfully!' 
          : '⚠️ Dubstrata API key saved but MCP failed to connect. Running in Simulation Mode.'
        );
      } else {
        alert('❌ Error: Failed to save MCP config.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Connection error saving MCP config.');
    } finally {
      setMcpSaving(false);
    }
  };

  const handleTextChange = (field: keyof DirectivesMap, value: string) => {
    setDirectives(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const agentsList: ('Visionary' | 'Producer' | 'Seller' | 'Controller' | 'Systematiser')[] = [
    'Visionary',
    'Producer',
    'Seller',
    'Controller',
    'Systematiser'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '1.5rem' }}>
      
      {/* Dubstrata MCP Settings */}
      <div className="dashboard-card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={18} style={{ color: 'var(--accent-indigo)' }} />
          Dubstrata Causal Alt-Data Graph Engine Configuration
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
          Connect your workspace directly to the Dubstrata MCP cloud endpoint. This configures the EIP-712 compliance verifiers and maps Polymarket orderbooks to causal facts.
        </p>

        {/* Warning Alert if not set */}
        {!mcpKey && (
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.08)', 
            border: '1px solid rgba(245, 158, 11, 0.25)', 
            padding: '0.85rem', 
            borderRadius: '8px', 
            marginBottom: '1rem', 
            fontSize: '0.78rem', 
            color: '#fbbf24', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem',
            lineHeight: 1.4
          }}>
            <ShieldAlert size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <div>
              <strong>⚠️ CAPABILITIES RESTRICTED:</strong> <a href="https://dubstrata.com/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#fbbf24', textDecoration: 'underline', fontWeight: 600 }}>Get the latest financially causal data through agentic search</a> to inform your agents. Connect to the Dubstrata MCP by entering an API key.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flexGrow: 1, position: 'relative' }}>
            <input
              type="password"
              placeholder="Enter your DUBSTRATA_API_KEY..."
              value={mcpKey}
              onChange={(e) => setMcpKey(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                paddingRight: '8.5rem',
                background: '#0e0e11',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: '#f4f4f5',
                fontSize: '0.78rem',
                fontFamily: 'monospace'
              }}
            />
            <span style={{ 
              position: 'absolute', 
              right: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              fontSize: '0.7rem', 
              fontWeight: 600, 
              color: isConnected ? 'var(--success-color)' : '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: isConnected ? 'var(--success-color)' : '#fbbf24' 
              }} />
              {isConnected ? 'CONNECTED' : 'MOCK / SIMULATED'}
            </span>
          </div>

          <button
            className="btn-primary"
            onClick={handleSaveMcpConfig}
            disabled={mcpSaving}
            style={{ padding: '0.6rem 1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            <Save size={14} />
            {mcpSaving ? 'Connecting...' : 'Save & Connect'}
          </button>
        </div>
      </div>

      {/* Hyper-Directives Global Bar */}
      <div className="dashboard-card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={18} style={{ color: 'var(--danger-color)' }} />
          Global Business Hyper-Directives
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
          These high-priority rules are appended to all agents' working memories. Use this to enforce guardrails, mandate compliance, and lock business strategies.
        </p>
        <textarea
          style={{
            width: '100%',
            height: '100px',
            background: '#0e0e11',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: '#f4f4f5',
            fontSize: '0.78rem',
            padding: '0.6rem',
            fontFamily: 'monospace',
            resize: 'vertical'
          }}
          placeholder="e.g. Always check clobClient virtual order book constraints. Halt immediately on database connectivity errors."
          value={directives.hyperDirectives}
          onChange={(e) => handleTextChange('hyperDirectives', e.target.value)}
        />
      </div>

      {/* Split Agent Prompts Editor */}
      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem' }}>
        {/* Agent Picker Menu */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>
            System Personas
          </h4>
          {agentsList.map(agent => (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              style={{
                textAlign: 'left',
                padding: '0.6rem 0.85rem',
                fontSize: '0.78rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                background: selectedAgent === agent ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                borderColor: selectedAgent === agent ? 'var(--accent-indigo)' : 'transparent',
                color: selectedAgent === agent ? '#fff' : 'var(--text-secondary)',
                fontWeight: selectedAgent === agent ? 600 : 400,
                transition: 'all 0.15s ease'
              }}
            >
              {agent} SOP Profile
            </button>
          ))}
          
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              style={{ flexGrow: 1, padding: '0.45rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              onClick={fetchDirectives}
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Reset
            </button>
            <button
              className="btn-primary"
              style={{ flexGrow: 1, padding: '0.45rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              onClick={handleSaveDirectives}
              disabled={saving}
            >
              <Save size={12} />
              Save
            </button>
          </div>
        </div>

        {/* Prompt Text Editor */}
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Cpu size={16} style={{ color: 'var(--accent-indigo)' }} />
            Edit {selectedAgent} System SOP Instruction
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
            Modify the foundational code-persona and operational instructions of the {selectedAgent} agent.
          </p>

          <textarea
            style={{
              flexGrow: 1,
              width: '100%',
              minHeight: '280px',
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
            value={directives[selectedAgent]}
            onChange={(e) => handleTextChange(selectedAgent, e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
