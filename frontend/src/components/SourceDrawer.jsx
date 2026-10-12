import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, BookOpen, Hash, Sparkles, Copy, CheckCheck, Bookmark, AlignLeft } from 'lucide-react';

export default function SourceDrawer({ citation, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const fullText = citation.content || citation.snippet || '';

  const handleCopy = () => {
    if (fullText) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {citation && (
        <>
          {/* Backdrop with Frosted Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
            onClick={onClose}
          />

          {/* Liquid Glass Drawer — Wider & Scrollable */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl z-50 shadow-2xl backdrop-blur-2xl border-l flex flex-col"
            style={{
              background: 'rgba(12, 6, 32, 0.94)',
              borderColor: 'rgba(168, 85, 247, 0.28)',
              boxShadow: '-12px 0 60px rgba(112, 26, 232, 0.35)',
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
                  <h2 className="font-heading font-bold text-base text-purple-100">
                    Full Document Chunk
                  </h2>
                  <p className="text-[11px] text-purple-300/70">
                    Exact Vector Retrieval Context (FAISS)
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

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Metadata Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20">
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span className="font-semibold">Source</span>
                  </div>
                  <p className="text-xs font-medium text-white truncate" title={citation.source}>
                    {citation.source}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20">
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
                    <Hash className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span className="font-semibold">Page Locator</span>
                  </div>
                  <p className="text-xs font-medium text-white">
                    Page {citation.page || '1'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
                    <AlignLeft className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span className="font-semibold">Length</span>
                  </div>
                  <p className="text-xs font-medium text-white font-mono">
                    {fullText.length} chars
                  </p>
                </div>
              </div>

              {/* Section Header if available */}
              {citation.section && (
                <div className="px-3.5 py-2 rounded-xl bg-violet-950/30 border border-violet-500/25 flex items-center gap-2 text-xs text-purple-200">
                  <Bookmark className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0" />
                  <span className="font-semibold text-purple-300">Section:</span>
                  <span className="truncate font-medium">{citation.section}</span>
                </div>
              )}

              {/* Full Chunk Text Panel */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                    Full Un-truncated Text
                  </p>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/25 text-purple-200 font-mono">
                    Complete Chunk
                  </span>
                </div>

                {fullText ? (
                  <div
                    className="p-5 rounded-2xl relative border shadow-inner"
                    style={{
                      background: 'rgba(21, 11, 48, 0.75)',
                      borderColor: 'rgba(168, 85, 247, 0.3)',
                      color: '#f3e8ff',
                      boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.35)',
                    }}
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-500 via-purple-500 to-fuchsia-500 rounded-l-2xl" />
                    <div className="pl-3 select-text font-sans text-xs leading-relaxed whitespace-pre-wrap break-words">
                      {fullText}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-purple-500/25 text-center">
                    <p className="text-xs italic text-purple-300/50">
                      No text content available for this citation.
                    </p>
                  </div>
                )}
              </div>

              {/* Clinical Verification Notice */}
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/25">
                <p className="text-xs leading-relaxed text-purple-200/80">
                  ⚕️ <strong>Evidence Grounding:</strong> The multi-agent pipeline extracted this verbatim passage from your local document index. The response generated by the model was strictly grounded against this excerpt.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
