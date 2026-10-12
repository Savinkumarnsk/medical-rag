import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, BookOpen, Hash, Sparkles, Copy, CheckCheck, Bookmark, AlignLeft, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

export default function SourceDrawer({ citations = [], activeIndex = 0, isOpen = false, onClose }) {
  const [copied, setCopied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(activeIndex);

  useEffect(() => {
    setCurrentIndex(activeIndex);
  }, [activeIndex, isOpen]);

  if (!isOpen || !citations.length) return null;

  const validIndex = Math.min(Math.max(currentIndex, 0), citations.length - 1);
  const currentCitation = citations[validIndex] || {};
  const fullText = currentCitation.content || currentCitation.snippet || '';

  const handleCopy = () => {
    if (fullText) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrev = () => {
    if (validIndex > 0) setCurrentIndex(validIndex - 1);
  };

  const handleNext = () => {
    if (validIndex < citations.length - 1) setCurrentIndex(validIndex + 1);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with Frosted Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-40"
            onClick={onClose}
          />

          {/* Liquid Glass Drawer — Wider & Multi-Chunk Navigation */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 shadow-2xl backdrop-blur-2xl border-l flex flex-col"
            style={{
              background: 'rgba(11, 5, 28, 0.96)',
              borderColor: 'rgba(168, 85, 247, 0.3)',
              boxShadow: '-16px 0 60px rgba(112, 26, 232, 0.35)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-5 border-b flex-shrink-0"
              style={{ borderColor: 'rgba(168, 85, 247, 0.18)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/35 flex items-center justify-center text-purple-300 shadow-md shadow-purple-900/30">
                  <FileText className="w-5 h-5 text-fuchsia-400" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-base text-purple-100 flex items-center gap-2">
                    Evidence Chunks Vault
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/20">
                      {validIndex + 1} of {citations.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-purple-300/70">
                    Exact Un-truncated Text Retrieved from Vector Store
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {fullText && (
                  <button
                    onClick={handleCopy}
                    className="btn-ghost-purple text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer"
                    aria-label="Copy full chunk"
                    title="Copy full text"
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
                )}

                <button
                  onClick={onClose}
                  aria-label="Close source drawer"
                  className="btn-ghost-purple p-2 rounded-xl text-purple-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chunk Navigator Tabs */}
            {citations.length > 1 && (
              <div className="px-5 py-3 border-b border-purple-500/15 flex items-center justify-between bg-purple-950/20 flex-shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-[80%]">
                  {citations.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer truncate max-w-[150px] ${
                        i === validIndex
                          ? 'bg-purple-600/40 text-white border border-fuchsia-400/50 shadow-sm'
                          : 'bg-purple-950/40 text-purple-300/70 hover:text-purple-200 border border-purple-500/15'
                      }`}
                    >
                      Chunk {i + 1}: {c.source?.slice(0, 15)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrev}
                    disabled={validIndex === 0}
                    className="p-1 rounded-lg border border-purple-500/20 text-purple-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-900/30 cursor-pointer"
                    aria-label="Previous chunk"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={validIndex === citations.length - 1}
                    className="p-1 rounded-lg border border-purple-500/20 text-purple-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-900/30 cursor-pointer"
                    aria-label="Next chunk"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Metadata Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20">
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span className="font-semibold">Document File</span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate" title={currentCitation.source}>
                    {currentCitation.source}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20">
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
                    <Hash className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span className="font-semibold">Page Locator</span>
                  </div>
                  <p className="text-xs font-semibold text-white">
                    Page {currentCitation.page || '1'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
                    <AlignLeft className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span className="font-semibold">Chunk Length</span>
                  </div>
                  <p className="text-xs font-semibold text-fuchsia-300 font-mono">
                    {fullText.length} characters
                  </p>
                </div>
              </div>

              {/* Section Header if available */}
              {currentCitation.section && (
                <div className="px-4 py-2.5 rounded-xl bg-violet-950/35 border border-violet-500/25 flex items-center gap-2 text-xs text-purple-200">
                  <Bookmark className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                  <span className="font-semibold text-purple-300">Section:</span>
                  <span className="font-medium">{currentCitation.section}</span>
                </div>
              )}

              {/* Full Chunk Text Panel */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                    Complete Extracted Text
                  </p>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/25 text-purple-200 font-mono">
                    Verbatim Passage
                  </span>
                </div>

                {fullText ? (
                  <div
                    className="p-5 rounded-2xl relative border shadow-inner"
                    style={{
                      background: 'rgba(21, 11, 48, 0.85)',
                      borderColor: 'rgba(168, 85, 247, 0.35)',
                      color: '#f8f7ff',
                      boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-500 via-purple-500 to-fuchsia-500 rounded-l-2xl" />
                    <div className="pl-3 select-text font-sans text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {fullText}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border border-dashed border-purple-500/25 text-center bg-purple-950/20">
                    <p className="text-xs italic text-purple-300/60">
                      No text content available for this citation.
                    </p>
                  </div>
                )}
              </div>

              {/* Clinical Verification Notice */}
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/25">
                <p className="text-xs leading-relaxed text-purple-200/80">
                  ⚕️ <strong>Evidence Grounding:</strong> The multi-agent pipeline retrieved this exact text passage from your local vector index and used it to formulate and cross-verify the answer.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
