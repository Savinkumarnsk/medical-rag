import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, BookOpen, Hash, Sparkles } from 'lucide-react';

export default function SourceDrawer({ citation, onClose }) {
  return (
    <AnimatePresence>
      {citation && (
        <>
          {/* Backdrop with Frosted Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Liquid Glass Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 shadow-2xl backdrop-blur-2xl border-l"
            style={{
              background: 'rgba(13, 7, 34, 0.88)',
              borderColor: 'rgba(168, 85, 247, 0.25)',
              boxShadow: '-10px 0 50px rgba(112, 26, 232, 0.25)',
            }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div
                className="flex items-center justify-between p-5 border-b"
                style={{ borderColor: 'rgba(168, 85, 247, 0.16)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-sm">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-heading font-bold text-sm text-purple-100">
                      Grounded Citation
                    </h2>
                    <p className="text-[11px] text-purple-300/60">
                      Verified Document Reference
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close source drawer"
                  className="btn-ghost-purple p-2 rounded-xl text-purple-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Metadata Pills */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20">
                    <div className="flex items-center gap-2 text-xs text-purple-300 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span className="font-semibold">Source File</span>
                    </div>
                    <p className="text-xs font-medium text-white truncate">
                      {citation.source}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20">
                    <div className="flex items-center gap-2 text-xs text-purple-300 mb-1">
                      <Hash className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span className="font-semibold">Page Locator</span>
                    </div>
                    <p className="text-xs font-medium text-white">
                      Page {citation.page}
                    </p>
                  </div>
                </div>

                {/* Snippet Card */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300/70 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Extracted Text Chunk
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300/70 font-mono">
                      FAISS Match
                    </span>
                  </div>

                  {citation.snippet ? (
                    <div
                      className="text-xs leading-relaxed p-4 rounded-xl relative border"
                      style={{
                        background: 'rgba(23, 14, 52, 0.7)',
                        borderColor: 'rgba(168, 85, 247, 0.25)',
                        color: '#f3e8ff',
                        boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-l-xl" />
                      <p className="pl-2 select-text font-sans">
                        {citation.snippet}
                        {citation.snippet.length >= 300 && (
                          <span className="text-purple-400 font-bold"> …</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-purple-500/20 text-center">
                      <p className="text-xs italic text-purple-300/50">
                        No direct text excerpt indexed for this match.
                      </p>
                    </div>
                  )}
                </div>

                {/* Disclaimer Badge */}
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/25 text-purple-200">
                  <p className="text-xs leading-relaxed text-purple-300/80">
                    ⚕️ <strong>Direct Vector Chunk:</strong> This passage was extracted from the vector store and provided as contextual grounding to the reasoning model.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
