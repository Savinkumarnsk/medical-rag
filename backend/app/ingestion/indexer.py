"""
indexer.py — FAISS index builder/updater.

CLI usage:
    python -m app.ingestion.indexer --path data/raw
    python -m app.ingestion.indexer --path data/raw --reindex
    python -m app.ingestion.indexer --file path/to/file.pdf
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

import numpy as np

from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Cached embeddings & vector store ──────────────────────────────────────────

@lru_cache(maxsize=1)
def get_embeddings():
    from langchain_huggingface import HuggingFaceEmbeddings
    cfg = get_settings()
    logger.info("Initializing HuggingFaceEmbeddings (%s)", cfg.embedding_model)
    return HuggingFaceEmbeddings(
        model_name=cfg.embedding_model,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},  # cosine via dot product
    )


def _get_embeddings():
    return get_embeddings()


def _get_or_create_store(embeddings, index_path: Path):
    from langchain_community.vectorstores import FAISS
    if (index_path / "index.faiss").exists():
        logger.info("Loading existing FAISS index from %s", index_path)
        return FAISS.load_local(
            str(index_path),
            embeddings,
            allow_dangerous_deserialization=True,
        )
    logger.info("Creating new FAISS index at %s", index_path)
    return None


# ── Metadata registry (tracks ingested chunk IDs) ─────────────────────────────

def _registry_path(index_path: Path) -> Path:
    return index_path / "registry.json"


def _load_registry(index_path: Path) -> set:
    p = _registry_path(index_path)
    if p.exists():
        return set(json.loads(p.read_text()))
    return set()


def _save_registry(index_path: Path, registry: set) -> None:
    _registry_path(index_path).write_text(json.dumps(list(registry)))


# ── Core indexing functions ────────────────────────────────────────────────────

def ingest_documents(
    docs_path: Optional[Path] = None,
    file_path: Optional[Path] = None,
    reindex: bool = False,
) -> dict:
    """
    Ingest documents from a directory or a single file.
    Returns a summary dict: {indexed, skipped, total_chunks}.
    """
    from langchain_community.vectorstores import FAISS
    from app.ingestion.loaders import load_document, load_directory
    from app.ingestion.chunker import chunk_documents

    cfg = get_settings()
    index_path = cfg.faiss_index_path
    index_path.mkdir(parents=True, exist_ok=True)

    # Load raw documents
    if file_path:
        raw_docs = load_document(file_path)
    elif docs_path:
        raw_docs = load_directory(docs_path)
    else:
        raise ValueError("Provide either docs_path or file_path")

    if not raw_docs:
        logger.warning("No documents found.")
        return {"indexed": 0, "skipped": 0, "total_chunks": 0}

    # Chunk
    chunks = chunk_documents(raw_docs)
    logger.info("Total chunks after splitting: %d", len(chunks))

    # Deduplication
    registry = set() if reindex else _load_registry(index_path)
    new_chunks = []
    skipped = 0
    for chunk in chunks:
        cid = chunk.metadata.get("chunk_id", "")
        if cid and cid in registry:
            skipped += 1
        else:
            registry.add(cid)
            new_chunks.append(chunk)

    logger.info("New chunks: %d  Skipped (duplicates): %d", len(new_chunks), skipped)

    if not new_chunks:
        return {"indexed": 0, "skipped": skipped, "total_chunks": len(chunks)}

    # Embed & index
    embeddings = _get_embeddings()

    if reindex or not (index_path / "index.faiss").exists():
        store = FAISS.from_documents(new_chunks, embeddings)
    else:
        store = _get_or_create_store(embeddings, index_path)
        if store is None:
            store = FAISS.from_documents(new_chunks, embeddings)
        else:
            store.add_documents(new_chunks)

    store.save_local(str(index_path))
    _save_registry(index_path, registry)
    clear_vectorstore_cache()

    logger.info("FAISS index saved to %s", index_path)
    return {
        "indexed": len(new_chunks),
        "skipped": skipped,
        "total_chunks": len(chunks),
    }


@lru_cache(maxsize=1)
def get_vectorstore():
    """Load the persisted FAISS store (for query time). Cached in memory."""
    from langchain_community.vectorstores import FAISS
    cfg = get_settings()
    index_path = cfg.faiss_index_path
    if not (index_path / "index.faiss").exists():
        return None
    logger.info("Loading FAISS vectorstore from %s into memory cache", index_path)
    embeddings = get_embeddings()
    return FAISS.load_local(
        str(index_path),
        embeddings,
        allow_dangerous_deserialization=True,
    )


def clear_vectorstore_cache() -> None:
    """Clear cached vectorstore and force reload on next query."""
    logger.info("Clearing in-memory vectorstore cache")
    get_vectorstore.cache_clear()


def list_indexed_documents() -> List[dict]:
    """Return a list of indexed document metadata (source, page count)."""
    store = get_vectorstore()
    if store is None or not hasattr(store, "docstore"):
        return []

    seen: dict = {}
    for doc_id, doc in store.docstore._dict.items():
        src = doc.metadata.get("source", "unknown")
        if src not in seen:
            seen[src] = {
                "source": src,
                "file_type": doc.metadata.get("file_type", ""),
                "pages": set(),
                "chunks": 0,
            }
        seen[src]["pages"].add(doc.metadata.get("page", 0))
        seen[src]["chunks"] += 1
    result = []
    for info in seen.values():
        info["page_count"] = len(info.pop("pages"))
        result.append(info)
    return sorted(result, key=lambda x: x["source"])


# ── CLI entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    os.chdir(Path(__file__).resolve().parents[2])  # go to backend/

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    parser = argparse.ArgumentParser(description="Medical RAG Indexer")
    parser.add_argument("--path", type=Path, help="Directory of documents to index")
    parser.add_argument("--file", type=Path, help="Single file to index")
    parser.add_argument("--reindex", action="store_true", help="Full re-index (clear existing)")
    args = parser.parse_args()

    if not args.path and not args.file:
        parser.error("Provide --path or --file")

    summary = ingest_documents(
        docs_path=args.path,
        file_path=args.file,
        reindex=args.reindex,
    )
    print(f"\n[OK] Indexing complete: {summary}")
