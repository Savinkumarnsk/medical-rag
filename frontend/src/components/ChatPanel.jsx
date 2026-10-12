import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, CheckCheck, RefreshCw, User, Bot, Sparkles, Send, ArrowUp } from 'lucide-react';
import AgentStepTracker from './AgentStepTracker';
import SourceDrawer from './SourceDrawer';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2 px-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="typing-dot-purple"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
      <span className="text-xs text-purple-300/70 ml-2 font-medium">
        Synthesizing clinical response…
      </span>
    </div>
  );
}

function CitationChips({ citations, onCitationClick }) {
  if (!citations?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3.5 pt-2 border-t border-purple-500/15">
      {citations.map((c, i) => (
        <button
          key={i}
          onClick={() => onCitationClick(c)}
          className="citation-chip-liquid"
          aria-label={`View source: ${c.source}, page ${c.page}`}
        >
          <span>📎</span>
          <span>{c.source}</span>
          <span className="text-purple-300 font-mono text-[10px] px-1 py-0.5 rounded bg-purple-900/40">
            p.{c.page}
          </span>
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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${
          isUser
            ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-600 shadow-purple-600/30 ring-1 ring-white/20'
            : 'bg-gradient-to-tr from-purple-800 via-violet-700 to-indigo-900 shadow-purple-900/40 ring-1 ring-purple-400/30'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-purple-200" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-2xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        {isUser ? (
          <div
            className="px-5 py-3 rounded-2xl rounded-tr-sm text-sm font-medium shadow-lg shadow-purple-900/30 text-white"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #c026d3 100%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxWidth: '90%',
            }}
          >
            {msg.content}
          </div>
        ) : (
          <div className="liquid-glass-card p-5 rounded-2xl rounded-tl-sm w-full select-text">
            {msg.isError ? (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-sm">
                {msg.content}
              </div>
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
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-purple-500/15">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs btn-ghost-purple rounded-xl cursor-pointer"
                    aria-label="Copy answer"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span className="text-fuchsia-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-purple-300" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  {isLast && onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="flex items-center gap-1.5 text-xs btn-ghost-purple rounded-xl cursor-pointer"
                      aria-label="Regenerate answer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
                      <span>Regenerate</span>
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
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleStarter = (q) => {
    if (!isLoading) onSend(q);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State — Liquid Glass Hero */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto py-8"
          >
            {/* Glowing Orb Hero */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 p-1 shadow-2xl shadow-purple-600/40 animate-float">
                <div className="w-full h-full bg-[#0d0724] rounded-[22px] flex items-center justify-center">
                  <span className="text-4xl">🧬</span>
                </div>
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-3xl blur-xl opacity-30 -z-10 animate-pulse-glow" />
            </div>

            <h2 className="text-2xl font-bold font-heading mb-2.5 neon-text-gradient">
              Clinical Intelligence Suite
            </h2>
            <p className="text-sm leading-relaxed mb-8 text-purple-200/70 max-w-md">
              Ask deep medical and pharmacology questions. Every assertion is cross-graded against your local document corpus with strict source citations.
            </p>

            {/* Quick Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {STARTER_QUESTIONS.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => handleStarter(q)}
                  className="liquid-glass-card text-left p-3.5 text-xs font-medium text-purple-200/90 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{q}</span>
                  </div>
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

            {/* Streaming Agent State */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3.5"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-800 via-violet-700 to-indigo-900 flex items-center justify-center shadow-lg shadow-purple-900/40 ring-1 ring-purple-400/30">
                  <Bot className="w-4 h-4 text-purple-200" />
                </div>
                <div className="flex-1 max-w-2xl">
                  <div className="liquid-glass-card p-5 rounded-2xl rounded-tl-sm w-full">
                    {currentStep && (
                      <div className="mb-3.5 pb-2.5 border-b border-purple-500/15">
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

      {/* Liquid Glass Input Bar */}
      <div
        className="p-4 border-t backdrop-blur-2xl z-20"
        style={{
          borderColor: 'rgba(168, 85, 247, 0.16)',
          background: 'rgba(9, 5, 24, 0.72)',
        }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2.5 items-end max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              id="chat-input"
              className="liquid-glass-input resize-none w-full text-sm leading-relaxed text-purple-100"
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a medical or pharmacological question…"
              disabled={isLoading}
              aria-label="Chat input"
              style={{ minHeight: '48px', maxHeight: '130px' }}
            />
          </div>
          <button
            type="submit"
            id="send-button"
            disabled={isLoading || !input.trim()}
            className="btn-liquid-purple flex-shrink-0 h-12 px-6 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            aria-label="Send question"
          >
            <span className="text-sm font-semibold tracking-wide">Ask AI</span>
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* Grounded Source Drawer */}
      <SourceDrawer
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
