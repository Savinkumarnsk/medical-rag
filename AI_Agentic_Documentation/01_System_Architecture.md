# Chapter 1: System Architecture & Design Philosophy

## 1. Context & Motivation
Large Language Models (LLMs) have achieved remarkable conversational fluency, but in high-stakes domains such as healthcare and clinical research, general fluency without strict factual provenance is hazardous. The clinical domain presents three distinct challenges:
- **Lexical and Acronym Ambiguity**: Clinical notes, guidelines, and diagnostic criteria frequently use dense acronyms (*HTN*, *CKD*, *ACEi*, *ARB*, *DASH*) that cause semantic drift in standard vector embeddings.
- **Hallucination Risk**: Unconstrained LLMs tend to fabricate plausible dosages or contraindications.
- **Context Fragmentation**: Naive chunking algorithms slice clinical tables and diagnostic contraindication lists across chunk boundaries, resulting in partial context retrieval.

**MedDoc Intelligence** solves these challenges by combining:
1. A **Deterministic State Graph (LangGraph)** that governs multi-agent collaboration with feedback loops.
2. A **Local Vector Engine (FAISS + BAAI/bge-small-en-v1.5)** running on-premise/CPU with Maximal Marginal Relevance (MMR) retrieval.
3. A **Liquid Glass Web Client** featuring real-time streaming, on-demand citation verification, and a responsive functional color system.

---

## 2. High-Level Component Topology

```
+-------------------------------------------------------------------------+
|                         Frontend Client (React 19)                     |
|  - Ultra-Transparent Frosted Glass UI (blur: 36px, saturation: 240%)    |
|  - Server-Sent Events (SSE) Multi-Agent Step Listener                  |
|  - On-Demand Evidence Vault Drawer (Multi-Chunk Tabs, Copy, Badges)    |
|  - Action Palette: Green (New/Sync), Blue (Ask/Copy), Red (Clear/Close)|
+------------------------------------+------------------------------------+
                                     | HTTP / SSE
                                     v
+-------------------------------------------------------------------------+
|                         FastAPI Application Gateway                     |
|  - /ask (SSE Streaming Multi-Agent Pipeline)                           |
|  - /ingest & /ingest/reindex (File Upload & Index Pipeline)             |
|  - /documents (Corpus Metadata & File Chunk Breakdown)                 |
|  - /health (Readiness & Model Health Checks)                           |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  LangGraph Cyclic Agentic State Engine                  |
|                                                                         |
|      [Router Agent] ──> chitchat / out_of_scope ──> Early Exit         |
|             │                                                           |
|             ▼ (document_qa)                                             |
|      [Retriever Agent (FAISS MMR)] ──> [Grader Agent]                   |
|             ▲                                 │                         |
|             │ (Rewrite Loop < 2)              ▼ (Relevant >= 2)         |
|      [Rewriter Agent]                [Generator Agent]                  |
|                                               │                         |
|                                               ▼                         |
|                                      [Verifier Agent]                   |
|                                               │ (Regeneration Loop < 1) |
|                                               ▼                         |
|                                      [Finalizer Agent]                  |
+-------------------------------------------------------------------------+
```

---

## 3. Technology Stack Breakdown

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Orchestration** | LangGraph / LangChain | `0.2.x` | Stateful agent execution and cyclic decision routing |
| **API Backend** | FastAPI | `0.115.x` | Asynchronous high-throughput web server & SSE streaming |
| **Server Runtime** | Uvicorn | `0.32.x` | ASGI production application server |
| **Vector Store** | FAISS (CPU) | `1.9.x` | High-density vector similarity search with cosine distance |
| **Embedding Model**| `BAAI/bge-small-en-v1.5`| `1.5` | 384-dimensional dense semantic representations |
| **LLM Provider** | Google Gemini / OpenRouter | `3.5 Flash Lite` | Clinical reasoning, grading, rewriting, and synthesis |
| **Frontend Core** | React / Vite | `19.x / 8.x` | Reactive user interface & component rendering |
| **Styling** | Vanilla CSS + Tailwind CSS | `3.4.x` | Glassmorphism, aurora plasma shaders, and CSS tokens |
| **Animation** | Framer Motion | `12.x` | Smooth state transitions, drawers, and modal animations |
| **Icons** | Lucide React | `0.4x` | Consistent clinical and interface iconography |
