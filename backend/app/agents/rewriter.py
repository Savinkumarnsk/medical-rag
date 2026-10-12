"""
rewriter.py — Query rewriter agent. Optimises the question for retrieval.
"""
from __future__ import annotations

import logging

from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.state import AgentState
from app.llm import get_fast_llm
from app.prompts import REWRITER_SYSTEM, REWRITER_HUMAN

logger = logging.getLogger(__name__)


def _format_history(chat_history: list) -> str:
    if not chat_history:
        return "No prior conversation."
    lines = []
    for msg in chat_history[-6:]:  # last 3 turns
        role = msg.get("role", "user").capitalize()
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)


def rewriter_agent(state: AgentState) -> AgentState:
    """Rewrite the question into a retrieval-optimised standalone query."""
    question = state["question"]
    history = _format_history(state.get("chat_history", []))
    rewrite_count = state.get("rewrite_count", 0)

    logger.info("[Rewriter] Rewriting (attempt %d): %s", rewrite_count + 1, question[:80])

    llm = get_fast_llm()
    messages = [
        SystemMessage(content=REWRITER_SYSTEM),
        HumanMessage(content=REWRITER_HUMAN.format(
            history=history,
            question=question,
        )),
    ]

    try:
        response = llm.invoke(messages)
        rewritten = response.content.strip().strip('"')
    except Exception as exc:
        logger.warning("[Rewriter] Failed: %s — using original", exc)
        rewritten = question

    logger.info("[Rewriter] → %s", rewritten[:120])

    return {
        **state,
        "rewritten_query": rewritten,
        "rewrite_count": rewrite_count + 1,
        "current_step": "rewriting",
        "step_log": state.get("step_log", []) + [f"Rewriter → {rewritten[:60]}..."],
    }
