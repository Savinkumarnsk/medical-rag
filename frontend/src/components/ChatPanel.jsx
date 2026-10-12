import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, CheckCheck, RefreshCw, User, Bot } from 'lucide-react';
import AgentStepTracker from './AgentStepTracker';
import SourceDrawer from './SourceDrawer';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-teal-500"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function CitationChips({ citations, onCitationClick }) {
  if (!citations?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {citations.map((c, i) => (
        <button
          key={i}
          onClick={() => onCitationClick(c)}
          className="citation-chip"
          aria-label={`View source: ${c.source}, page ${c.page}`}
        >
          📎 {c.source}, p.{c.page}
        </button>
      ))}
    </div>
  );
}

function MessageBubble({ msg, onCitationClick, onRegenerate, isLast }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
        isUser
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
          : 'bg-gradient-to-br from-teal-500 to-cyan-600'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-white" />
        }
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-2xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        {isUser ? (
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-sm"
               style={{ background: 'var(--accent)', color: '#fff', maxWidth: '90%' }}>
            {msg.content}
          </div>
        ) : (
          <div className="card p-4 rounded-2xl rounded-tl-sm">
            {msg.isError ? (
              <p className="text-sm text-red-500">{msg.content}</p>
            ) : (
              <div className="prose-medical">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}

            {!msg.isError && (
              <>
                <CitationChips citations={msg.citations} onCitationClick={onCitationClick} />

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t"
                     style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs btn-ghost rounded-md"
                    aria-label="Copy answer"
                  >
                    {copied
                      ? <><CheckCheck className="w-3.5 h-3.5 text-teal-500" /> Copied</>
                      : <><Copy className="w-3.5 h-3.5" /> Copy</>
                    }
                  </button>
                  {isLast && onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="flex items-center gap-1 text-xs btn-ghost rounded-md"
                      aria-label="Regenerate answer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatPanel({ messages, isLoading, currentStep, streamingTokens, onSend, onRegenerate }) {
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [input, setInput] = useState('');

  const STARTER_QUESTIONS = [
    "What are the diagnostic criteria for hypertension?",
    "Which drugs are contraindicated in pregnancy for hypertension?",
    "What lifestyle changes reduce blood pressure?",
    "What is a hypertensive emergency and how is it managed?",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleStarter = (q) => {
    onSend(q);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {messages.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center mb-5 shadow-lg">
              <span className="text-4xl">🏥</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Medical Document Assistant
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Ask questions about your indexed medical documents. Get grounded, cited answers from the multi-agent RAG pipeline.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full">
              {STARTER_QUESTIONS.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => handleStarter(q)}
                  className="text-left p-3 rounded-xl border text-sm transition-all duration-150 hover:shadow-md"
                  style={{
                    background: 'var(--card-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  💬 {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence>
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onCitationClick={setSelectedCitation}
                  onRegenerate={i === messages.length - 1 && msg.role === 'assistant' ? onRegenerate : null}
                  isLast={i === messages.length - 1}
                />
              ))}
            </AnimatePresence>

            {/* Streaming state */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 max-w-2xl">
                  <div className="card p-4 rounded-2xl rounded-tl-sm">
                    {currentStep && (
                      <div className="mb-3">
                        <AgentStepTracker currentStep={currentStep} />
                      </div>
                    )}
                    {streamingTokens ? (
                      <div className="prose-medical">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingTokens}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <TypingIndicator />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              id="chat-input"
              className="input-base resize-none pr-4"
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a question about your medical documents…"
              disabled={isLoading}
              aria-label="Chat input"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            id="send-button"
            disabled={isLoading || !input.trim()}
            className="btn-primary flex-shrink-0 h-11 px-5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <span className="text-sm">Send</span>
            <span>↑</span>
          </button>
        </form>
      </div>

      {/* Source Drawer */}
      <SourceDrawer
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
