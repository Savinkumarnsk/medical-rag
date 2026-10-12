"""
retriever.py — FAISS retrieval agent (similarity + MMR).
"""
from __future__ import annotations

import logging
from typing import List

from langchain_core.documents import Document

from app.agents.state import AgentState
from app.config import get_settings

logger = logging.getLogger(__name__)

from app.ingestion.indexer import get_vectorstore, clear_vectorstore_cache


def retriever_agent(state: AgentState) -> AgentState:
    """Retrieve top-k chunks from FAISS using the rewritten query."""
    cfg = get_settings()
    query = state.get("rewritten_query") or state["question"]
    logger.info("[Retriever] Query: %s", query[:120])

    try:
        store = get_vectorstore()
        if store is None:
            logger.warning("[Retriever] No FAISS index found")
            docs = []
        elif cfg.retrieval_mmr:
            docs: List[Document] = store.max_marginal_relevance_search(
                query,
                k=cfg.retrieval_top_k,
                fetch_k=cfg.mmr_fetch_k,
            )
        else:
            docs = store.similarity_search(query, k=cfg.retrieval_top_k)

        logger.info("[Retriever] Retrieved %d docs", len(docs))

    except Exception as exc:
        logger.error("[Retriever] Error: %s", exc)
        docs = []

    return {
        **state,
        "retrieved_docs": docs,
        "current_step": "retrieving",
        "step_log": state.get("step_log", []) + [f"Retriever → {len(docs)} docs"],
    }


def invalidate_store_cache() -> None:
    """Reset the cached store (call after re-indexing)."""
    clear_vectorstore_cache()
