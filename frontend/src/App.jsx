import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import { useChat } from './hooks/useChat';

function DisclaimerFooter() {
  return (
    <div className="flex-shrink-0 border-t py-2 px-4 flex items-center justify-center gap-2"
         style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        ⚕️ <strong>For informational purposes only.</strong> Not medical advice.
        Always consult a qualified healthcare professional.
      </span>
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('darkMode') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch { return false; }
  });

  const sessionId = useState(() => `session-${Date.now()}`)[0];
  const { messages, isLoading, currentStep, streamingTokens, sendMessage, clearMessages } = useChat(sessionId);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', background: 'var(--sidebar-bg)' }}>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Medical Document Q&A
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Multi-agent RAG · LangGraph · FAISS · OpenRouter
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-xs btn-ghost rounded-lg"
              aria-label="Clear conversation"
            >
              Clear chat
            </button>
          )}
        </header>

        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            currentStep={currentStep}
            streamingTokens={streamingTokens}
            onSend={sendMessage}
            onRegenerate={handleRegenerate}
          />
        </div>

        {/* Disclaimer */}
        <DisclaimerFooter />
      </main>
    </div>
  );
}
