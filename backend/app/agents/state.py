"""
state.py — LangGraph TypedDict state for the medical RAG pipeline.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict

from langchain_core.documents import Document


class AgentState(TypedDict, total=False):
    # ── Input ────────────────────────────────────────────────────────────────
    question: str                        # Original user question
    session_id: str                      # Conversation session ID
    chat_history: List[Dict[str, str]]   # [{"role": "user"|"assistant", "content": "..."}]

    # ── Routing ──────────────────────────────────────────────────────────────
    route: str                           # "document_qa" | "chitchat" | "out_of_scope"
    route_reason: str

    # ── Query Rewriting ───────────────────────────────────────────────────────
    rewritten_query: str
    rewrite_count: int                   # Number of rewrite retries

    # ── Retrieval ────────────────────────────────────────────────────────────
    retrieved_docs: List[Document]

    # ── Grading ──────────────────────────────────────────────────────────────
    relevant_docs: List[Document]
    grading_details: List[Dict[str, Any]]

    # ── Generation ───────────────────────────────────────────────────────────
    answer: str
    key_points: List[str]
    citations: List[Dict[str, str]]      # [{"source": "...", "page": "..."}]

    # ── Verification ─────────────────────────────────────────────────────────
    is_grounded: bool
    ungrounded_claims: List[str]
    verification_reason: str
    regeneration_count: int              # 0 or 1 (max 1 regen)

    # ── Agent step tracking (for SSE streaming) ───────────────────────────────
    current_step: str                    # "routing" | "rewriting" | "retrieving" | ...
    step_log: List[str]

    # ── Final output ─────────────────────────────────────────────────────────
    final_answer: str
    error: Optional[str]
