import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, RefreshCw, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';

const FILE_ICONS = {
  pdf: '📄',
  docx: '📝',
  txt: '📃',
  md: '📋',
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
      className="w-72 flex-shrink-0 flex flex-col h-full border-r"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <div>
            <h1 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              MedDoc RAG
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Medical Document AI
            </p>
          </div>
          <button
            onClick={onToggleDark}
            className="ml-auto btn-ghost p-1.5 rounded-lg text-sm"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="p-3">
        <div
          className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-teal-500 bg-teal-50 dark:bg-teal-950'
              : 'border-slate-200 dark:border-slate-700 hover:border-teal-400'
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
            <div className="space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-500" />
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Uploading... {uploadProgress}%
              </p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <motion.div
                  className="bg-teal-500 h-1.5 rounded-full"
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-5 h-5 mx-auto mb-1.5 text-teal-500" />
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Drop files or click to upload
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                PDF, DOCX, TXT, MD
              </p>
            </>
          )}
        </div>

        <button
          onClick={handleReindex}
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg
                     border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800
                     transition-colors disabled:opacity-50"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Re-index all documents"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Re-index All
        </button>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
           style={{ color: 'var(--text-muted)' }}>
          Documents ({documents.length})
        </p>

        {loading && !documents.length ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg animate-pulse"
                   style={{ background: 'var(--bg-secondary)' }} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No documents indexed yet.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Upload files to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {documents.map((doc, i) => (
                <motion.div
                  key={doc.source}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-2.5 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0">
                      {FILE_ICONS[doc.file_type] || '📄'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {doc.source}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {doc.page_count} page{doc.page_count !== 1 ? 's' : ''} · {doc.chunks} chunks
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`mx-3 mb-3 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {toast.type === 'error'
              ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
              : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
