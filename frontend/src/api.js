// api.js — API utilities for the Medical RAG frontend

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchDocuments() {
  const res = await fetch(`${BASE_URL}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/ingest`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText)?.detail || 'Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

export async function reindexDocuments() {
  const res = await fetch(`${BASE_URL}/ingest/reindex`, { method: 'POST' });
  if (!res.ok) throw new Error('Re-index failed');
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.ok;
}

/**
 * Stream ask request as Server-Sent Events.
 * Calls onStep(step), onToken(token), onResult(result), onError(err).
 */
export function askStreaming({ question, sessionId, chatHistory, onStep, onToken, onResult, onError }) {
  const controller = new AbortController();

  const run = async () => {
    try {
      const res = await fetch(`${BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          session_id: sessionId,
          chat_history: chatHistory,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(err.detail || 'Request failed');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Normalize Windows CRLF to standard LF so SSE messages split cleanly on \n\n
        const normalized = buffer.replace(/\r\n/g, '\n');
        const messages = normalized.split('\n\n');
        buffer = messages.pop() || '';

        for (const msg of messages) {
          if (!msg.trim()) continue;
          const lines = msg.split('\n');
          let eventType = '';
          let dataLine = '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              eventType = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              dataLine = trimmed.slice(5).trim();
            }
          }

          if (!dataLine || dataLine === '[DONE]') continue;
          try {
            const payload = JSON.parse(dataLine);
            if (eventType === 'step' || 'step' in payload) onStep?.(payload.step || payload);
            else if (eventType === 'token' || 'token' in payload) onToken?.(payload.token || payload);
            else if (eventType === 'result' || 'answer' in payload) onResult?.(payload);
            else if (eventType === 'error' || 'error' in payload) onError?.(payload.error || payload);
          } catch (e) {
            console.error('Error parsing SSE data:', e, dataLine);
          }
        }
      }

      // Flush any trailing message left in buffer
      if (buffer.trim()) {
        const lines = buffer.replace(/\r\n/g, '\n').trim().split('\n');
        let eventType = '';
        let dataLine = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) eventType = trimmed.slice(6).trim();
          else if (trimmed.startsWith('data:')) dataLine = trimmed.slice(5).trim();
        }
        if (dataLine && dataLine !== '[DONE]') {
          try {
            const payload = JSON.parse(dataLine);
            if (eventType === 'result' || 'answer' in payload) onResult?.(payload);
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err.message);
      }
    }
  };

  run();
  return () => controller.abort();
}
