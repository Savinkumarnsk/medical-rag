# Chapter 4: FastAPI Backend & SSE Streaming Protocol

## 1. Application Architecture & Lifespan (`app/main.py`)

The backend is built with **FastAPI** using asynchronous lifespan management and non-blocking IO:

- **CORS Middleware**: Restricted to configured frontend origins (e.g., `http://localhost:5173`).
- **Gzip Compression**: Compresses document payloads exceeding 1 KB.
- **Dependency Injection**: Singleton pattern via `get_settings()` and `get_graph()`.

---

## 2. API Endpoints Specification

### 2.1 `/ask` — Multi-Agent Server-Sent Events (SSE)
- **Method**: `POST`
- **Request Headers**: `Content-Type: application/json`, `Accept: text/event-stream`
- **Request Body**:
  ```json
  {
    "question": "What are contraindications for ACE inhibitors?",
    "session_id": "session-1718000000",
    "chat_history": [
      { "role": "user", "content": "Let's talk about hypertension" },
      { "role": "assistant", "content": "Hypertension is defined as..." }
    ]
  }
  ```

#### Server-Sent Events Lifecycle:
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: step
data: {"step": "routing"}

event: step
data: {"step": "retrieving"}

event: step
data: {"step": "grading"}

event: step
data: {"step": "generating"}

event: token
data: {"token": "ACE"}

event: token
data: {"token": " inhibitors"}

event: result
data: {
  "answer": "ACE inhibitors are contraindicated in pregnancy due to risk of fetal renal dysplasia...",
  "citations": [
    {
      "source": "hypertension_guidelines.md",
      "page": "12",
      "section": "Pregnancy Contraindications",
      "snippet": "Full un-truncated retrieved passage from page 12...",
      "content": "Full un-truncated retrieved passage from page 12..."
    }
  ],
  "key_points": [
    "Contraindicated in all trimesters of pregnancy",
    "Risk of bilateral renal artery stenosis"
  ],
  "step_log": [
    "Router → document_qa",
    "Retriever → fetched 8 candidate chunks",
    "Grader → 3 relevant chunks found",
    "Generator → 412 chars, 2 citations"
  ],
  "session_id": "session-1718000000"
}
```

---

### 2.2 `/ingest` — Document Upload & Real-Time Indexing
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Payload**: `file: UploadFile`
- **Response**:
  ```json
  {
    "status": "success",
    "filename": "cardiology_update_2026.pdf",
    "chunks_indexed": 42,
    "pages": 8
  }
  ```

### 2.3 `/documents` — Corpus Inspection
- **Method**: `GET`
- **Response**:
  ```json
  {
    "total_documents": 1,
    "total_chunks": 14,
    "documents": [
      {
        "source": "hypertension_guidelines.md",
        "file_type": "md",
        "chunks": 14,
        "page_count": 1
      }
    ]
  }
  ```

### 2.4 `/health` — Operational Readiness Check
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "llm_provider": "openrouter",
    "model": "nvidia/nemotron-3.5-lightning:free",
    "vector_store": "faiss",
    "index_loaded": true
  }
  ```
