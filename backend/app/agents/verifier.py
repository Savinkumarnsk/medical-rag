"""
verifier.py — Groundedness / hallucination checker agent.
"""
from __future__ import annotations

import json
import logging

from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.state import AgentState
from app.llm import get_fast_llm
from app.prompts import VERIFIER_SYSTEM, VERIFIER_HUMAN

logger = logging.getLogger(__name__)
MAX_REGENERATIONS = 1


def _build_context_str(state: AgentState) -> str:
    docs = state.get("relevant_docs", [])
    return "\n\n".join(
        f"[{doc.metadata.get('source','?')}, p.{doc.metadata.get('page','?')}]\n{doc.page_content[:600]}"
        for doc in docs
    )


def verifier_agent(state: AgentState) -> AgentState:
    """Verify that the answer is grounded in the retrieved context."""
    answer = state.get("answer", "")
    context = _build_context_str(state)

    if not answer or not context:
        return {
            **state,
            "is_grounded": True,
            "ungrounded_claims": [],
            "verification_reason": "No answer or context to verify.",
            "current_step": "verifying",
            "step_log": state.get("step_log", []) + ["Verifier → skipped (no content)"],
        }

    logger.info("[Verifier] Checking groundedness...")

    llm = get_fast_llm()
    messages = [
        SystemMessage(content=VERIFIER_SYSTEM),
        HumanMessage(content=VERIFIER_HUMAN.format(
            context=context,
            answer=answer,
        )),
    ]

    raw = ""
    try:
        response = llm.invoke(messages)
        raw = response.content if hasattr(response, "content") else str(response)
        raw = raw.strip()
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            clean_json = match.group(0)
        else:
            clean_json = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(clean_json)
        is_grounded = result.get("grounded", True)
        ungrounded = result.get("ungrounded_claims", [])
        reason = result.get("reason", "")
    except Exception as exc:
        logger.exception("[Verifier] failed: %s | raw=%r — assuming grounded", exc, raw)
        is_grounded = True
        ungrounded = []
        reason = "Verification fallback (grounded assumed)"

    logger.info("[Verifier] Grounded: %s | Claims: %s", is_grounded, ungrounded)

    return {
        **state,
        "is_grounded": is_grounded,
        "ungrounded_claims": ungrounded,
        "verification_reason": reason,
        "current_step": "verifying",
        "step_log": state.get("step_log", []) + [
            f"Verifier → {'✓ grounded' if is_grounded else '✗ ungrounded'}"
        ],
    }


def should_regenerate_or_finish(state: AgentState) -> str:
    """
    Conditional edge after verification:
    - Not grounded + regeneration_count < MAX → regenerate
    - Otherwise → finalize
    """
    is_grounded = state.get("is_grounded", True)
    regen_count = state.get("regeneration_count", 0)

    if not is_grounded and regen_count < MAX_REGENERATIONS:
        logger.info("[Verifier] Triggering regeneration #%d", regen_count + 1)
        return "regenerate"
    return "finalize"
