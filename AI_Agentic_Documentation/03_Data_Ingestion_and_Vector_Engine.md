# Chapter 3: Data Ingestion & Vector Engine Architecture

## 1. Multi-Modal Document Loaders (`app/ingestion/loaders.py`)

Clinical knowledge is distributed across heterogeneous document formats: clinical study PDFs, hospital SOP documents, guidelines in Word (.docx), and markdown/plain text protocols.

The ingestion module handles each format with deterministic loaders and OCR fallbacks:

```
[Uploaded File]
       │
       ├── .pdf  ──> pypdf text extraction
       │              └── If extracted text < 100 chars per page:
       │                   └── pytesseract OCR Fallback (scanned documents)
       │
       ├── .docx ──> python-docx document parser
       │              └── Paragraph & table cell extraction
       │
       ├── .txt  ──> UTF-8 / Latin-1 auto-detect reader
       │
       └── .md   ──> Header-preserving markdown reader
```

---

## 2. Text Normalization Pipeline (`app/ingestion/cleaner.py`)

Medical documents frequently contain scanned artifacts, broken ligatures, and formatting oddities that degrade dense vector representations. The cleaner applies a five-stage normalization pipeline:
1. **Unicode Normalization**: Applies `unicodedata.normalize('NFKC', text)` to standardize mathematical symbols, Greek letters ($\alpha, \beta$), and formatting characters.
2. **Hyphenated Linebreak Restoration**: Reconnects hyphenated clinical terms broken across page margins (e.g., `hyper-\ntension` $\rightarrow$ `hypertension`).
3. **Whitespace Canonicalization**: Compresses multi-space indentation and excess carriage returns while preserving list structures.
4. **Header and Page Boundary Tagging**: Extracts page numbers and sectional headers into chunk metadata.
5. **PII/PHI Redaction (Configurable)**: If `ENABLE_PII_MASKING=true`, strips Social Security Numbers, patient MRNs, phone numbers, and dates of birth using clinical regex patterns.

---

## 3. Structure-Aware Chunking (`app/ingestion/chunker.py`)

Standard sliding-window chunkers cut text indiscriminately, often bisecting dosage tables or diagnostic criteria lists.

MedDoc Intelligence implements **Structure-Aware Chunking**:
- **Target Size**: 800 characters (~150–200 words).
- **Chunk Overlap**: 120 characters (~20–30 words) to guarantee context continuity across boundaries.
- **Header Boundary Detection**: Chunks respect markdown headers (`#`, `##`, `###`), section dividers (`---`), and numbered lists (`1.`, `2.`, `a.`).
- **Metadata Inheritance**: Every chunk inherits:
  - `source`: Filename (e.g., `hypertension_guidelines.md`)
  - `page`: Page or section offset (e.g., `10`)
  - `section`: Nearest enclosing clinical section header
  - `chunk_id`: Deterministic hash for traceability

---

## 4. Dense Embeddings & Vector Index (`app/ingestion/indexer.py`)

### 4.1 Embedding Model
- **Model**: `BAAI/bge-small-en-v1.5`
- **Architecture**: Compact BERT-based Bi-Encoder fine-tuned on clinical and scientific retrieval tasks.
- **Dimensions**: 384 dimensions.
- **Latency**: Under 15ms per chunk on standard CPU.
- **Privacy Guarantee**: 100% local inference via HuggingFace Sentence-Transformers; no vectors or clinical texts leave the host server during embedding generation.

### 4.2 FAISS Vector Storage & Maximal Marginal Relevance (MMR)
- **Index Type**: `IndexFlatIP` (Inner Product on $L_2$-normalized vectors, computing cosine similarity).
- **Persistence**: Serialized locally to disk at `backend/data/faiss_index/` (`index.faiss` and `index.pkl`).
- **MMR Search Mechanics**:
  $$\text{MMR} = \arg\max_{d_i \in R \setminus S} \left[ \lambda \cdot \text{Sim}_1(d_i, Q) - (1 - \lambda) \max_{d_j \in S} \text{Sim}_2(d_i, d_j) \right]$$
  Where:
  - $Q$ is the user's clinical query.
  - $R$ is the candidate pool of top 20 nearest chunks.
  - $S$ is the set of already selected chunks.
  - $\lambda = 0.7$ guarantees diversity while preserving relevance.
