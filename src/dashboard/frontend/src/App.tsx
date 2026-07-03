import React, { useState } from 'react';
import { EventStreamProvider, useEventStream } from './context/EventStreamContext';
import { SignalZone } from './components/SignalZone';
import { AgentHubZone } from './components/AgentHubZone';
import { AgentDirectivesZone } from './components/AgentDirectivesZone';
import { BusinessContextZone } from './components/BusinessContextZone';
import { 
  MessageSquare, Radio, Play, Pause, RefreshCw, 
  Settings, Briefcase, AlertTriangle
} from 'lucide-react';

type TabId = 'agents' | 'signal' | 'management' | 'context';

const DashboardApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('agents');
  const { connected, daemonRunning, toggleDaemon, refreshAll, loading, activeAlert, dismissAlert, setSelectedChatTopic } = useEventStream();

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070709', color: '#f4f4f5' }}>
      
      {/* Background visual components */}
      <div className="stars-bg"></div>
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>

      {/* STATIC LEFT SIDEBAR */}
      <aside 
        style={{
          width: '260px',
          flexShrink: 0,
          height: '100%',
          background: 'rgba(15, 15, 20, 0.7)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          position: 'relative',
          padding: '1.25rem 0.75rem'
        }}
      >
        {/* Logo Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', overflow: 'hidden', paddingLeft: '0.25rem' }}>
          <img 
            src="/logo.png" 
            alt="Strata Logo" 
            style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em', lineHeight: 1.2 }}>Strata</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Situation Monitor</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
          <button 
            onClick={() => setActiveTab('agents')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'agents' ? 600 : 400,
              background: activeTab === 'agents' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              color: activeTab === 'agents' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={16} style={{ color: activeTab === 'agents' ? 'var(--accent-indigo)' : 'inherit', flexShrink: 0 }} />
            <span>Agent Hub (Chat)</span>
          </button>

          <button 
            onClick={() => setActiveTab('signal')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'signal' ? 600 : 400,
              background: activeTab === 'signal' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              color: activeTab === 'signal' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <Radio size={16} style={{ color: activeTab === 'signal' ? 'var(--accent-indigo)' : 'inherit', flexShrink: 0 }} />
            <span>Signal Center</span>
          </button>

          <button 
            onClick={() => setActiveTab('management')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'management' ? 600 : 400,
              background: activeTab === 'management' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              color: activeTab === 'management' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings size={16} style={{ color: activeTab === 'management' ? 'var(--accent-indigo)' : 'inherit', flexShrink: 0 }} />
            <span>Agent Management</span>
          </button>

          <button 
            onClick={() => setActiveTab('context')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'context' ? 600 : 400,
              background: activeTab === 'context' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              color: activeTab === 'context' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <Briefcase size={16} style={{ color: activeTab === 'context' ? 'var(--accent-indigo)' : 'inherit', flexShrink: 0 }} />
            <span>Business Context</span>
          </button>
        </nav>

        {/* BOTTOM METRICS PANEL */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          
          {/* Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', paddingLeft: '0.25rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: connected ? 'var(--success-color)' : 'var(--danger-color)', display: 'inline-block' }} />
            <span style={{ fontWeight: 600, color: connected ? 'var(--success-color)' : 'var(--danger-color)' }}>
              {connected ? 'SSE LINK ONLINE' : 'SSE LINK OFFLINE'}
            </span>
          </div>

          {/* Daemon Status */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem 0.6rem', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Daemon</span>
            <span style={{ fontWeight: 'bold', color: daemonRunning ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
              {daemonRunning ? 'SCANNING ACTIVE' : 'PAUSED'}
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button 
              onClick={toggleDaemon} 
              className="btn-secondary" 
              style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.72rem', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              {daemonRunning ? <Pause size={12} /> : <Play size={12} />}
              <span style={{ marginLeft: '0.25rem' }}>{daemonRunning ? 'Pause' : 'Start'}</span>
            </button>

            <button 
              onClick={refreshAll} 
              className="btn-primary" 
              disabled={Object.values(loading).some(Boolean)}
              style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.72rem', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <RefreshCw size={12} className={Object.values(loading).some(Boolean) ? 'animate-spin' : ''} />
              <span style={{ marginLeft: '0.25rem' }}>Sync</span>
            </button>
          </div>
        </div>

      </aside>

      {/* MAIN VIEW AREA */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', padding: '1.25rem', position: 'relative', zIndex: 10 }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {activeTab === 'agents' && <AgentHubZone />}
          {activeTab === 'signal' && <SignalZone />}
          {activeTab === 'management' && <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '0.25rem' }}><AgentDirectivesZone /></div>}
          {activeTab === 'context' && <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '0.25rem' }}><BusinessContextZone /></div>}
        </div>
      </div>

      {/* DYNAMIC ALERT MODAL POPUP */}
      {activeAlert && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '450px', padding: '1.5rem', borderLeft: '3px solid var(--danger-color)', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#0b0b0f', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}>
            <h3 style={{ margin: 0, color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>
              <AlertTriangle size={18} />
              🚨 {activeAlert.title}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#e4e4e7', lineHeight: 1.45, margin: 0 }}>
              {activeAlert.message}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} 
                onClick={dismissAlert}
              >
                Dismiss
              </button>
              {activeAlert.topic && (
                <button 
                  className="btn-primary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'var(--accent-indigo)', borderColor: 'var(--accent-indigo)' }} 
                  onClick={() => {
                    setSelectedChatTopic(activeAlert.topic || '');
                    setActiveTab('agents');
                    dismissAlert();
                  }}
                >
                  Go to Hub Debate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const App: React.FC = () => {
  return (
    <EventStreamProvider>
      <DashboardApp />
    </EventStreamProvider>
  );
};

export default App;
