import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, RefreshCw, CheckCircle, AlertCircle, Loader2, Sparkles, Layers } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';

const FILE_ICONS = {
  pdf: '📕',
  docx: '📘',
  txt: '📄',
  md: '📑',
};

export default function Sidebar({ darkMode, onToggleDark }) {
  const { documents, loading, uploading, uploadProgress, error, upload, reindex } = useDocuments();
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFiles = useCallback(async (files) => {
    const supported = Array.from(files).filter(f =>
      ['.pdf', '.docx', '.txt', '.md'].some(ext => f.name.toLowerCase().endsWith(ext))
    );
    if (!supported.length) {
      showToast('Only PDF, DOCX, TXT, MD files are supported.', 'error');
      return;
    }
    for (const file of supported) {
      try {
        const result = await upload(file);
        showToast(`✓ ${file.name} — ${result.indexed} chunks indexed`);
      } catch (err) {
        showToast(`✗ ${file.name}: ${err.message}`, 'error');
      }
    }
  }, [upload]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleReindex = async () => {
    try {
      const result = await reindex();
      showToast(`✓ Re-indexed ${result.indexed} chunks`);
    } catch (err) {
      showToast(`✗ Re-index failed: ${err.message}`, 'error');
    }
  };

  return (
    <aside
      className="w-72 flex-shrink-0 flex flex-col h-full z-20 liquid-glass-sidebar relative"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-purple-500/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 p-[1.5px] shadow-lg shadow-purple-600/30">
            <div className="w-full h-full bg-[#0d0722] rounded-[14px] flex items-center justify-center">
              <span className="text-lg">🩺</span>
            </div>
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm tracking-wide neon-text-gradient">
              Clinical Vault
            </h2>
            <p className="text-[11px] font-medium text-purple-300/60">
              Verified Document Library
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="p-3">
        <div
          className={`relative rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 backdrop-blur-md ${
            dragOver
              ? 'border-2 border-fuchsia-400 bg-purple-900/40 shadow-lg shadow-purple-500/20 scale-[1.02]'
              : 'border border-purple-500/25 bg-purple-950/20 hover:border-purple-400/50 hover:bg-purple-900/25 hover:shadow-md hover:shadow-purple-900/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to upload"
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.md"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="space-y-2.5 py-1">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" />
              <p className="text-xs font-semibold text-purple-200">
                Indexing Chunks... {uploadProgress}%
              </p>
              <div className="w-full bg-purple-950/60 border border-purple-500/20 rounded-full h-2 overflow-hidden p-0.5">
                <motion.div
                  className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 h-full rounded-full"
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center mx-auto mb-2 text-purple-300 shadow-sm">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-purple-100">
                Drop documents or click
              </p>
              <p className="text-[11px] text-purple-300/50 mt-0.5">
                PDF, DOCX, TXT, MD
              </p>
            </>
          )}
        </div>

        {/* Re-index Button */}
        <button
          onClick={handleReindex}
          disabled={loading}
          className="w-full mt-2.5 flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-xl
                     border border-purple-500/20 bg-purple-950/30 text-purple-200 hover:bg-purple-900/40 hover:border-purple-400/40
                     transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
          aria-label="Re-index all documents"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-purple-300 ${loading ? 'animate-spin' : ''}`} />
          Re-sync Knowledge Base
        </button>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        <div className="flex items-center justify-between px-1.5 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300/60 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-purple-400" />
            Corpus Files
          </p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/20 text-purple-300">
            {documents.length}
          </span>
        </div>

        {loading && !documents.length ? (
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl bg-purple-950/20 border border-purple-500/10 animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 px-2 rounded-2xl border border-dashed border-purple-500/20 bg-purple-950/10 mt-2">
            <FileText className="w-8 h-8 mx-auto mb-2 text-purple-400/40" />
            <p className="text-xs font-medium text-purple-200/70">
              No medical files indexed.
            </p>
            <p className="text-[11px] text-purple-300/40 mt-0.5">
              Drag clinical papers above.
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <AnimatePresence>
              {documents.map((doc, i) => (
                <motion.div
                  key={doc.source}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-950/25 hover:bg-purple-900/35 hover:border-purple-400/45 transition-all duration-200 shadow-sm group"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {FILE_ICONS[doc.file_type] || '📄'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-purple-100 group-hover:text-white transition-colors">
                        {doc.source}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-purple-300/60 mt-0.5">
                        <span>{doc.page_count} p.</span>
                        <span>•</span>
                        <span className="font-mono text-purple-300/80">{doc.chunks} chunks</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Liquid Glass Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`mx-3 mb-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 backdrop-blur-xl shadow-xl ${
              toast.type === 'error'
                ? 'bg-rose-950/80 text-rose-200 border border-rose-500/40 shadow-rose-900/30'
                : 'bg-purple-950/85 text-purple-100 border border-purple-400/50 shadow-purple-900/40'
            }`}
          >
            {toast.type === 'error'
              ? <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              : <CheckCircle className="w-4 h-4 flex-shrink-0 text-fuchsia-400" />}
            <span className="truncate">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
