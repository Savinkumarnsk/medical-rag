"""
router.py — Query router agent. Classifies the user's question.
"""
from __future__ import annotations

import json
import logging

from app.agents.state import AgentState
from app.llm import get_fast_llm
from app.prompts import ROUTER_SYSTEM, ROUTER_HUMAN, OUT_OF_SCOPE_RESPONSE

logger = logging.getLogger(__name__)


def router_agent(state: AgentState) -> AgentState:
    """Classify question as document_qa / chitchat / out_of_scope."""
    question = state["question"]
    logger.info("[Router] Classifying: %s", question[:80])

    llm = get_fast_llm()
    from langchain_core.messages import SystemMessage, HumanMessage

    messages = [
        SystemMessage(content=ROUTER_SYSTEM),
        HumanMessage(content=ROUTER_HUMAN.format(question=question)),
    ]

    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            raw = match.group(0)
        result = json.loads(raw)
        category = result.get("category", "document_qa")
        rewritten_query = result.get("rewritten_query") or question
        reason = result.get("reason", "")
    except Exception as exc:
        logger.warning("[Router] Parse error: %s — defaulting to document_qa", exc)
        category = "document_qa"
        rewritten_query = question
        reason = "Parse error; defaulting to document retrieval."

    logger.info("[Router] → %s (%s) | Query: %s", category, reason, rewritten_query[:60])

    return {
        **state,
        "route": category,
        "route_reason": reason,
        "rewritten_query": rewritten_query,
        "current_step": "routing",
        "step_log": state.get("step_log", []) + [f"Router → {category}"],
    }
