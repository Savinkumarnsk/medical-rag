import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import { useChat } from './hooks/useChat';
import { Sparkles, Activity, Trash2 } from 'lucide-react';

function DisclaimerFooter() {
  return (
    <div
      className="flex-shrink-0 py-2.5 px-6 flex items-center justify-between border-t z-10 backdrop-blur-2xl"
      style={{
        borderColor: 'rgba(168, 85, 247, 0.14)',
        background: 'rgba(7, 3, 20, 0.42)',
      }}
    >
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="text-purple-400">⚕️</span>
        <span>
          <strong>Clinical Verification Notice:</strong> For informational & research reference only. Always consult a qualified medical professional.
        </span>
      </div>
      <div className="hidden md:flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5 font-medium text-purple-300/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          System Online
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);

  const sessionId = useState(() => `session-${Date.now()}`)[0];
  const { messages, isLoading, currentStep, streamingTokens, sendMessage, clearMessages } = useChat(sessionId);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden relative select-none" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Dynamic Ambient Liquid Plasma Aurora Orbs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-28 w-[580px] h-[580px] rounded-full bg-violet-600/35 blur-[120px] animate-aurora-1" />
        <div className="absolute top-1/4 -right-24 w-[620px] h-[620px] rounded-full bg-fuchsia-600/30 blur-[130px] animate-aurora-2" />
        <div className="absolute -bottom-28 left-1/4 w-[660px] h-[660px] rounded-full bg-purple-700/30 blur-[140px] animate-aurora-3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/20 blur-[110px] animate-pulse-glow" />
        <div className="absolute bottom-10 right-1/3 w-[380px] h-[380px] rounded-full bg-violet-400/15 blur-[125px] animate-aurora-2" />
      </div>

      {/* ── Liquid Glass Sidebar ── */}
      <Sidebar darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />

      {/* ── Main Workspace ── */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Liquid Glass Header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b backdrop-blur-2xl"
          style={{
            borderColor: 'rgba(168, 85, 247, 0.16)',
            background: 'rgba(10, 4, 25, 0.42)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-500 to-fuchsia-500 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0d0724] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight font-heading neon-text-gradient">
                  MedDoc Intelligence
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-200">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  Gemini 3.5 Flash Lite
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Multi-Agent Clinical Intelligence · Evidence-Based Grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="btn-ghost-purple text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer"
                aria-label="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5 text-purple-300" />
                Clear Chat
              </button>
            )}
          </div>
        </header>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            currentStep={currentStep}
            streamingTokens={streamingTokens}
            onSend={sendMessage}
            onRegenerate={handleRegenerate}
          />
        </div>

        {/* Disclaimer Footer */}
        <DisclaimerFooter />
      </main>
    </div>
  );
}
