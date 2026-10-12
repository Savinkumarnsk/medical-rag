import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, BookOpen, Hash } from 'lucide-react';

export default function SourceDrawer({ citation, onClose }) {
  return (
    <AnimatePresence>
      {citation && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 shadow-2xl"
            style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)' }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b"
                   style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950">
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Source Document
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close source drawer"
                  className="btn-ghost p-1.5 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Metadata */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm"
                       style={{ color: 'var(--text-secondary)' }}>
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium truncate">{citation.source}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm"
                       style={{ color: 'var(--text-secondary)' }}>
                    <Hash className="w-4 h-4 flex-shrink-0" />
                    <span>Page {citation.page}</span>
                  </div>
                </div>

                {/* Divider */}
                <hr style={{ borderColor: 'var(--border-color)' }} />

                {/* Snippet */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                     style={{ color: 'var(--text-muted)' }}>
                    Excerpt
                  </p>
                  {citation.snippet ? (
                    <div
                      className="text-sm leading-relaxed p-3 rounded-lg"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderLeft: '3px solid var(--accent)',
                      }}
                    >
                      {citation.snippet}
                      {citation.snippet.length >= 300 && (
                        <span style={{ color: 'var(--text-muted)' }}> …</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                      No preview available for this source.
                    </p>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    ⚕️ This excerpt is from an indexed document. Always verify with the original source.
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
