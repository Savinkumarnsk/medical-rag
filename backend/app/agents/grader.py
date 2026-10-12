"""
grader.py — Relevance grader agent with batched single-call evaluation.
"""
from __future__ import annotations

import json
import logging
import re
from typing import List

from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.state import AgentState
from app.llm import get_fast_llm
from app.prompts import BATCH_GRADER_SYSTEM, BATCH_GRADER_HUMAN

logger = logging.getLogger(__name__)

MIN_RELEVANT_DOCS = 2
MAX_REWRITES = 2


def grader_agent(state: AgentState) -> AgentState:
    """Score retrieved chunks in a single batched LLM call; keep relevant ones."""
    question = state.get("rewritten_query") or state["question"]
    retrieved: List[Document] = state.get("retrieved_docs", [])
    logger.info("[Grader] Grading %d docs for: %s", len(retrieved), question[:80])

    if not retrieved:
        return {
            **state,
            "relevant_docs": [],
            "grading_details": [],
            "current_step": "grading",
            "step_log": state.get("step_log", []) + ["Grader → 0 docs retrieved"],
        }

    # Format all candidate chunks together for 1 batched prompt
    formatted_chunks = []
    for idx, doc in enumerate(retrieved):
        source = doc.metadata.get("source", "doc")
        page = doc.metadata.get("page", 1)
        preview = doc.page_content[:700].strip()
        formatted_chunks.append(f"[{idx}] Source: {source} (p.{page})\n{preview}")

    chunks_text = "\n\n".join(formatted_chunks)

    llm = get_fast_llm()
    messages = [
        SystemMessage(content=BATCH_GRADER_SYSTEM),
        HumanMessage(content=BATCH_GRADER_HUMAN.format(
            question=question,
            chunks=chunks_text,
        )),
    ]

    raw = ""
    relevant_docs: List[Document] = []
    details = []

    try:
        response = llm.invoke(messages)
        raw = response.content if hasattr(response, "content") else str(response)
        raw = raw.strip()

        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            clean_json = match.group(0)
        else:
            clean_json = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        result = json.loads(clean_json)
        relevant_indices = set(result.get("relevant_indices", []))
        # Handle string or int keys
        reasons = result.get("reasons", {})

        for idx, doc in enumerate(retrieved):
            is_rel = (idx in relevant_indices) or (str(idx) in relevant_indices)
            reason = reasons.get(str(idx)) or reasons.get(idx) or ("Relevant" if is_rel else "Not relevant")
            details.append({
                "source": doc.metadata.get("source", ""),
                "page": doc.metadata.get("page", ""),
                "relevant": is_rel,
                "reason": reason,
            })
            if is_rel:
                relevant_docs.append(doc)

    except Exception as exc:
        logger.exception("[Grader] failed: %s | raw=%r — failing open", exc, raw)
        # Fail open: a grader parsing failure must never block the user from getting an answer
        relevant_docs = list(retrieved)
        details = [
            {
                "source": doc.metadata.get("source", ""),
                "page": doc.metadata.get("page", ""),
                "relevant": True,
                "reason": f"Fail-open fallback ({exc})",
            }
            for doc in retrieved
        ]

    # If the model marked 0 docs as relevant but docs were retrieved, fail open with top docs
    if not relevant_docs and retrieved:
        logger.warning("[Grader] 0 docs marked relevant by model — failing open with top retrieved docs")
        relevant_docs = retrieved[:min(2, len(retrieved))]
        for idx in range(len(relevant_docs)):
            if idx < len(details):
                details[idx]["relevant"] = True
                details[idx]["reason"] = "Fallback passed through"

    logger.info("[Grader] Relevant: %d / %d", len(relevant_docs), len(retrieved))

    return {
        **state,
        "relevant_docs": relevant_docs,
        "grading_details": details,
        "current_step": "grading",
        "step_log": state.get("step_log", []) + [
            f"Grader → {len(relevant_docs)}/{len(retrieved)} relevant"
        ],
    }


def should_retry_or_continue(state: AgentState) -> str:
    """
    Conditional edge after grading:
    - < MIN_RELEVANT_DOCS and rewrites < MAX_REWRITES → rewrite
    - otherwise → generate
    """
    relevant = state.get("relevant_docs", [])
    rewrite_count = state.get("rewrite_count", 0)

    if len(relevant) < MIN_RELEVANT_DOCS and rewrite_count < MAX_REWRITES:
        logger.info("[Grader] Not enough relevant docs; triggering rewrite #%d", rewrite_count + 1)
        return "rewrite"
    return "generate"
