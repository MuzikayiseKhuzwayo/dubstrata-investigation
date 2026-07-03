import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Users, Sparkles, RefreshCw, Send, Play, ToggleLeft, ToggleRight, Trash2, ChevronDown, ChevronUp, FileText, FolderOpen, FileCheck } from 'lucide-react';
import { useEventStream } from '../context/EventStreamContext';

interface ChatMessage {
  id: string;
  sender: 'User' | 'Visionary' | 'Producer' | 'Seller' | 'Controller' | 'Systematiser' | 'Orchestrator';
  role: string;
  avatarColor: string;
  content: string;
  timestamp: number;
}

interface DiscussionSession {
  topic: string;
  messages: ChatMessage[];
  timestamp: number;
}

interface ParsedContentBlock {
  type: 'text' | 'file_write' | 'file_read' | 'dir_list';
  path?: string;
  content?: string;
}

export const AgentHubZone: React.FC = () => {
  const { rssList, selectedChatTopic, setSelectedChatTopic } = useEventStream();
  const [sessions, setSessions] = useState<DiscussionSession[]>([]);
  const [activeSession, setActiveSession] = useState<DiscussionSession | null>(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [autoPilot, setAutoPilot] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const rolesMap = {
    User: { role: 'Operator (You)', color: '#94a3b8' },
    Visionary: { role: 'Corporate Strategist (SOP-STR-001)', color: '#6366f1' },
    Producer: { role: 'Sprint Manager (SOP-OPS-004)', color: '#3b82f6' },
    Seller: { role: 'Acquisition Engine (SOP-SLS-001)', color: '#10b981' },
    Controller: { role: 'Financial Auditor (SOP-FIN-001)', color: '#f43f5e' },
    Systematiser: { role: 'Operations Architect (SOP-OPS-001)', color: '#a855f7' }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, typingAgent]);

  // Load history
  const fetchChatsHistory = async (): Promise<DiscussionSession[] | null> => {
    try {
      const res = await fetch('/api/agents/chats');
      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch agent chats history', err);
    }
    return null;
  };

  // Sync autopilot settings from server on mount
  const fetchAutopilotState = async () => {
    try {
      const res = await fetch('/api/agents/autopilot');
      if (res.ok) {
        const data = await res.json();
        setAutoPilot(!!data.autoPilot);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChatsHistory().then(data => {
      if (data && data.length > 0) {
        setActiveSession(data[0]);
      }
    });
    fetchAutopilotState();
  }, []);

  // Handle alert modal redirection to active chat
  useEffect(() => {
    if (selectedChatTopic) {
      const foundSession = sessions.find(s => s.topic.toLowerCase() === selectedChatTopic.toLowerCase());
      if (foundSession) {
        setActiveSession(foundSession);
        setSelectedChatTopic('');
      } else {
        fetchChatsHistory().then(data => {
          if (data) {
            const found = data.find(s => s.topic.toLowerCase() === selectedChatTopic.toLowerCase());
            if (found) {
              setActiveSession(found);
              setSelectedChatTopic('');
            }
          }
        });
      }
    }
  }, [selectedChatTopic, sessions, setSelectedChatTopic]);

  // Sync default topic
  useEffect(() => {
    if (rssList && rssList.length > 0 && !selectedTopic) {
      setSelectedTopic(rssList[0].title);
    }
  }, [rssList, selectedTopic]);

  // Initialize session
  const handleCreateSession = async () => {
    const topicToDiscuss = customTopic.trim() || selectedTopic;
    if (!topicToDiscuss) return;

    setLoading(true);
    setTypingAgent('Visionary');
    try {
      const res = await fetch('/api/agents/chats/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicToDiscuss })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          setSessions(prev => {
            const exists = prev.some(s => s.topic.toLowerCase() === topicToDiscuss.toLowerCase());
            if (exists) {
              return prev.map(s => s.topic.toLowerCase() === topicToDiscuss.toLowerCase() ? data.session : s);
            }
            return [data.session, ...prev];
          });
          setActiveSession(data.session);
          setCustomTopic('');

          const resRespond = await fetch('/api/agents/chats/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topicToDiscuss, agentName: 'Visionary' })
          });
          if (resRespond.ok) {
            const dataRespond = await resRespond.json();
            if (dataRespond.success && dataRespond.session) {
              setSessions(prev => prev.map(s => s.topic.toLowerCase() === topicToDiscuss.toLowerCase() ? dataRespond.session : s));
              setActiveSession(dataRespond.session);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to initialize session', err);
    } finally {
      setTypingAgent(null);
      setLoading(false);
    }
  };

  // Post User message
  const handleSendMessage = async () => {
    if (!userInput.trim() || !activeSession || loading) return;
    const msg = userInput;
    setUserInput('');

    setLoading(true);
    try {
      const res = await fetch('/api/agents/chats/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeSession.topic, content: msg })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          setSessions(prev => prev.map(s => s.topic === activeSession.topic ? data.session : s));
          setActiveSession(data.session);
        }
      }
    } catch (err) {
      console.error('Failed to post message', err);
    } finally {
      setLoading(false);
    }
  };

  // Summon specific agent
  const handleSummonAgent = async (agentName: 'Visionary' | 'Producer' | 'Seller' | 'Controller' | 'Systematiser') => {
    if (!activeSession || loading) return;
    setTypingAgent(agentName);
    setLoading(true);
    try {
      const res = await fetch('/api/agents/chats/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeSession.topic, agentName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          setSessions(prev => prev.map(s => s.topic === activeSession.topic ? data.session : s));
          setActiveSession(data.session);
        }
      }
    } catch (err) {
      console.error(`Failed to summon agent: ${agentName}`, err);
    } finally {
      setTypingAgent(null);
      setLoading(false);
    }
  };

  const handleTriggerOrchestrate = async () => {
    if (!activeSession || loading) return;
    setLoading(true);
    setTypingAgent('Orchestrator');
    try {
      const res = await fetch('/api/agents/chats/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeSession.topic })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          setSessions(prev => prev.map(s => s.topic === activeSession.topic ? data.session : s));
          setActiveSession(data.session);
        }
      }
    } catch (err) {
      console.error('Failed to trigger orchestration', err);
    } finally {
      setTypingAgent(null);
      setLoading(false);
    }
  };

  // Listen for real-time agent updates and typing events over SSE
  useEffect(() => {
    const sseUrl = '/api/events';
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('agent_chat_update', (event: any) => {
      try {
        const data = JSON.parse(event.data) as DiscussionSession;
        setSessions(prev => {
          const exists = prev.some(s => s.topic.toLowerCase() === data.topic.toLowerCase());
          if (exists) {
            return prev.map(s => s.topic.toLowerCase() === data.topic.toLowerCase() ? data : s);
          } else {
            return [data, ...prev];
          }
        });
        
        setActiveSession(current => {
          if (current && current.topic.toLowerCase() === data.topic.toLowerCase()) {
            return data;
          }
          return current;
        });
      } catch (err) {
        console.error('Failed to parse agent_chat_update SSE event', err);
      }
    });

    eventSource.addEventListener('agent_typing', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setActiveSession(current => {
          if (current && current.topic.toLowerCase() === data.topic.toLowerCase()) {
            setTypingAgent(data.agentName);
          }
          return current;
        });
      } catch (err) {
        console.error('Failed to parse agent_typing SSE event', err);
      }
    });

  }, []);

  const handleToggleAutopilot = async () => {
    const newVal = !autoPilot;
    setAutoPilot(newVal);
    try {
      await fetch('/api/agents/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPilot: newVal })
      });
      if (newVal && activeSession) {
        await fetch('/api/agents/chats/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: activeSession.topic })
        });
      }
    } catch (err) {
      console.error('Failed to toggle autopilot on server', err);
    }
  };

  const handleClearSession = async () => {
    if (!activeSession || loading) return;
    if (!window.confirm('Clear all conversation messages in this session?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/agents/chats/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeSession.topic })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          setSessions(prev => prev.map(s => s.topic === activeSession.topic ? data.session : s));
          setActiveSession(data.session);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSopCode = (sender: string) => {
    switch (sender) {
      case 'Visionary': return 'SOP-STR-001';
      case 'Producer': return 'SOP-OPS-004';
      case 'Seller': return 'SOP-SLS-001';
      case 'Controller': return 'SOP-FIN-001';
      case 'Systematiser': return 'SOP-OPS-001';
      case 'Orchestrator': return 'AUDIT-001';
      default: return 'OPERATOR';
    }
  };

  const toggleExpandFile = (msgId: string, filePath: string) => {
    const key = `${msgId}-${filePath}`;
    setExpandedFiles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Parser helper to structure messages with XML tags
  const parseMessageContent = (text: string): ParsedContentBlock[] => {
    const blocks: ParsedContentBlock[] = [];
    const fileWriteRegex = /<FILE_WRITE path="([^"]+)">([\s\S]*?)<\/FILE_WRITE>/gi;
    const fileReadRegex = /<FILE_READ path="([^"]+)"\s*\/>/gi;
    const dirListRegex = /<DIR_LIST path="([^"]+)"\s*\/>/gi;
    
    const matches: { index: number; length: number; block: ParsedContentBlock }[] = [];
    
    let match;
    fileWriteRegex.lastIndex = 0;
    while ((match = fileWriteRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        block: { type: 'file_write', path: match[1], content: match[2] }
      });
    }
    
    fileReadRegex.lastIndex = 0;
    while ((match = fileReadRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        block: { type: 'file_read', path: match[1] }
      });
    }
    
    dirListRegex.lastIndex = 0;
    while ((match = dirListRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        block: { type: 'dir_list', path: match[1] }
      });
    }
    
    matches.sort((a, b) => a.index - b.index);
    
    let currentIdx = 0;
    for (const m of matches) {
      if (m.index > currentIdx) {
        blocks.push({
          type: 'text',
          content: text.slice(currentIdx, m.index)
        });
      }
      blocks.push(m.block);
      currentIdx = m.index + m.length;
    }
    
    if (currentIdx < text.length) {
      blocks.push({
        type: 'text',
        content: text.slice(currentIdx)
      });
    }
    
    if (blocks.length === 0) {
      blocks.push({ type: 'text', content: text });
    }
    
    return blocks;
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const blocks = parseMessageContent(msg.content);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {blocks.map((block, bIdx) => {
          if (block.type === 'text') {
            return (
              <div key={bIdx} style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                {block.content}
              </div>
            );
          }
          
          if (block.type === 'file_write') {
            const fileKey = `${msg.id}-${block.path}`;
            const isExpanded = !!expandedFiles[fileKey];
            
            return (
              <div key={bIdx} style={{
                marginTop: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.65rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#e2e8f0' }}>
                    <FileCheck size={14} style={{ color: 'var(--accent-green)' }} />
                    <span style={{ fontWeight: 600 }}>Written Sandbox File:</span>
                    <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{block.path}</span>
                  </div>
                  <button 
                    onClick={() => toggleExpandFile(msg.id, block.path || '')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-indigo)',
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.15rem'
                    }}
                  >
                    {isExpanded ? 'Hide' : 'Inspect Document'}
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
                {isExpanded && (
                  <pre style={{
                    margin: 0,
                    padding: '0.65rem',
                    background: '#030304',
                    fontSize: '0.7rem',
                    color: '#a7f3d0',
                    fontFamily: 'monospace',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {block.content}
                  </pre>
                )}
              </div>
            );
          }
          
          if (block.type === 'file_read') {
            return (
              <div key={bIdx} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.68rem',
                color: '#a5b4fc',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                padding: '0.2rem 0.5rem',
                borderRadius: '5px',
                marginTop: '0.3rem'
              }}>
                <FileText size={12} style={{ color: '#818cf8' }} />
                <span>Inspected File:</span>
                <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{block.path}</span>
              </div>
            );
          }
          
          if (block.type === 'dir_list') {
            return (
              <div key={bIdx} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.68rem',
                color: '#6ee7b7',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                padding: '0.2rem 0.5rem',
                borderRadius: '5px',
                marginTop: '0.3rem'
              }}>
                <FolderOpen size={12} style={{ color: '#34d399' }} />
                <span>Listed Sandbox Directory:</span>
                <span style={{ fontFamily: 'monospace', color: '#6ee7b7' }}>{block.path}</span>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', height: '100%', overflow: 'hidden' }}>
      {/* Left Sidebar */}
      <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Users size={18} style={{ color: 'var(--accent-indigo)' }} />
            Agent Hub Room
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
            Orchestrate interactive group debates between the 5 operations subagents.
          </p>
        </div>

        {/* Start Session Panel */}
        <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={12} style={{ color: 'var(--accent-green)' }} />
            Create Strategic Chat Session
          </h4>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Select RSS Trend</label>
            <select
              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: '#0e0e11', border: '1px solid var(--border-color)', color: '#f4f4f5', fontSize: '0.75rem' }}
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={loading}
            >
              {rssList.map((rss) => (
                <option key={rss.id} value={rss.title}>
                  {rss.title.length > 35 ? rss.title.slice(0, 35) + '...' : rss.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>— or —</div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Custom Topic</label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}
              placeholder="e.g. Jet Fuel Price Impacts on Airfares"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              disabled={loading}
            />
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            onClick={handleCreateSession}
            disabled={loading || (!customTopic.trim() && !selectedTopic)}
          >
            {loading && typingAgent === 'Visionary' ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Play size={14} />
                Start Chat Session
              </>
            )}
          </button>
        </div>

        {/* History List */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
            Active Sessions ({sessions.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flexGrow: 1 }}>
            {sessions.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No active chat sessions.</div>
            ) : (
              sessions.map((session, idx) => (
                <div 
                  key={idx}
                  onClick={() => { if (!loading) setActiveSession(session); }}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: activeSession?.topic === session.topic ? 'var(--accent-indigo)' : 'var(--border-color)',
                    background: activeSession?.topic === session.topic ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.01)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.topic}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{session.messages.length} messages</span>
                    <span>{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Area - Chat Room */}
      <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0 }}>
        {activeSession ? (
          <>
            {/* Session Header */}
            <div style={{ borderBottom: '1px solid var(--border-color)', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.005)' }}>
              <div>
                <span style={{ fontSize: '0.625rem', color: 'var(--accent-indigo)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Geopolitical & Operations Room</span>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>{activeSession.topic}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Auto-Pilot Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.3rem 0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: autoPilot ? 'var(--accent-green)' : 'var(--text-secondary)', fontWeight: 600 }}>Auto-Pilot</span>
                  <button 
                    onClick={handleToggleAutopilot} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: autoPilot ? 'var(--accent-green)' : 'var(--text-secondary)' }}
                  >
                    {autoPilot ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>

                <button 
                  className="btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem', fontSize: '0.7rem', borderColor: 'rgba(244, 63, 94, 0.2)', color: 'var(--danger-color)' }}
                  onClick={handleClearSession}
                  disabled={loading}
                >
                  <Trash2 size={13} />
                  Clear Chat
                </button>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: '#070709' }}>
              {activeSession.messages.length === 0 ? (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Awaiting first message. Type below or summon an agent to speak.
                </div>
              ) : (
                activeSession.messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: msg.sender === 'User' ? 'flex-end' : 'flex-start',
                      width: 'fit-content',
                      maxWidth: '85%',
                      border: '1px solid',
                      borderRadius: '12px',
                      background: msg.sender === 'User' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.01)',
                      borderColor: msg.sender === 'User' ? 'rgba(99, 102, 241, 0.2)' : msg.avatarColor + '30',
                      padding: '0.6rem 0.85rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem', fontSize: '0.68rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: msg.avatarColor }} />
                        <strong style={{ color: '#e2e8f0' }}>{msg.sender}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.625rem' }}>({msg.role})</span>
                      </div>
                      <span style={{ color: msg.avatarColor, fontFamily: 'monospace', fontSize: '0.6rem', marginLeft: 'auto', background: msg.avatarColor + '10', padding: '0.05rem 0.25rem', borderRadius: '3px' }}>
                        {getSopCode(msg.sender)}
                      </span>
                    </div>
                    
                    {/* Render Rich Message Content */}
                    {renderMessageContent(msg)}
                  </div>
                ))
              )}

              {/* Typing Indicator */}
              {typingAgent && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: 'flex-start',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.015)',
                  padding: '0.6rem 0.85rem',
                  maxWidth: '75%',
                  opacity: 0.7
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem', fontSize: '0.68rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: typingAgent === 'Orchestrator' ? 'var(--accent-indigo)' : (rolesMap[typingAgent as keyof typeof rolesMap]?.color || '#94a3b8') }} />
                    <strong style={{ color: '#94a3b8' }}>{typingAgent}</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.6' }}>
                      {typingAgent === 'Orchestrator' ? 'is selecting next speaker...' : 'is typing...'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.2rem', padding: '0.2rem 0' }}>
                    <span className="dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
                    <span className="dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'pulse 1.2s infinite', animationDelay: '0.2s' }} />
                    <span className="dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'pulse 1.2s infinite', animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Manual Summoning Actions Toolbar */}
            <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.005)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginRight: '0.25rem' }}>Summon Agent:</span>
              
              <button 
                className="btn-secondary" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '4px', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleSummonAgent('Visionary')}
                disabled={loading}
              >
                Visionary (SOP-STR)
              </button>
              
              <button 
                className="btn-secondary" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '4px', borderColor: 'rgba(168, 85, 247, 0.3)', color: '#d8b4fe', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleSummonAgent('Systematiser')}
                disabled={loading}
              >
                Systematiser (SOP-OPS)
              </button>

              <button 
                className="btn-secondary" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '4px', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleSummonAgent('Seller')}
                disabled={loading}
              >
                Seller (SOP-SLS)
              </button>

              <button 
                className="btn-secondary" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '4px', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleSummonAgent('Producer')}
                disabled={loading}
              >
                Producer (SOP-OPS)
              </button>

              <button 
                className="btn-secondary" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '4px', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fda4af', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleSummonAgent('Controller')}
                disabled={loading}
              >
                Controller (SOP-FIN)
              </button>

              <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

              <button 
                className="btn-primary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={handleTriggerOrchestrate}
                disabled={loading}
              >
                Auto-Orchestrate Next
              </button>
            </div>

            {/* Chat Input Box */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', background: '#09090c' }}>
              <textarea
                className="premium-textarea"
                style={{ flexGrow: 1, height: '42px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', resize: 'none', background: '#040406' }}
                placeholder="Type your message, query, or strategic directive here..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={loading}
              />
              <button 
                className="btn-primary" 
                style={{ width: '50px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={handleSendMessage}
                disabled={loading || !userInput.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <MessageSquare size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>No Active Chat Session</h3>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', textAlign: 'center', maxWidth: '300px' }}>
              Select a trend topic on the left or type a custom topic to open or start an interactive chat session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
