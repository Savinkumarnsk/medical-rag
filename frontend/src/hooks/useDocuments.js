import { useState, useEffect, useCallback } from 'react';
import { fetchDocuments, uploadDocument, reindexDocuments } from '../api';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const upload = useCallback(async (file) => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const result = await uploadDocument(file, setUploadProgress);
      await loadDocuments();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [loadDocuments]);

  const reindex = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reindexDocuments();
      await loadDocuments();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDocuments]);

  return { documents, loading, uploading, uploadProgress, error, upload, reindex, refresh: loadDocuments };
}
