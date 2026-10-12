"""
generator.py — Answer generator agent with citation extraction.
"""
from __future__ import annotations

import logging
import re
from typing import Dict, List

from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.state import AgentState
from app.llm import get_main_llm
from app.prompts import GENERATOR_SYSTEM, GENERATOR_HUMAN, GENERATOR_SYSTEM_STRICT

logger = logging.getLogger(__name__)

NO_INFO_ANSWER = (
    "I could not find sufficient information in the uploaded documents to answer this question. "
    "Please consult a qualified healthcare professional for guidance."
)


def _build_context(docs: List[Document]) -> str:
    """Format docs as a numbered context block."""
    parts = []
    for i, doc in enumerate(docs, start=1):
        src = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", "?")
        section = doc.metadata.get("section", "")
        header = f"[{i}] Source: {src}, Page {page}"
        if section:
            header += f", Section: {section}"
        parts.append(f"{header}\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def _extract_citations(answer: str, docs: List[Document]) -> List[Dict[str, str]]:
    """Extract [Source: X, p.Y] citations from the answer."""
    pattern = r"\[Source:\s*([^,\]]+),\s*[pP]\.?\s*(\d+)\]"
    matches = re.findall(pattern, answer)
    seen = set()
    citations = []
    for source, page in matches:
        key = (source.strip(), page.strip())
        if key not in seen:
            seen.add(key)
            # Find the matching doc for snippet
            snippet = ""
            for doc in docs:
                if doc.metadata.get("source", "") == source.strip():
                    snippet = doc.page_content[:300]
                    break
            citations.append({
                "source": source.strip(),
                "page": page.strip(),
                "snippet": snippet,
            })
    return citations


def _extract_key_points(answer: str) -> List[str]:
    """Extract bullet points from the Supporting Details section."""
    points = []
    in_details = False
    for line in answer.split("\n"):
        if "**Supporting Details**" in line or "Supporting Details:" in line:
            in_details = True
            continue
        if in_details:
            if line.startswith("**") and "Details" not in line:
                break
            stripped = line.lstrip("•-* ").strip()
            if stripped:
                points.append(stripped)
    return points


def generator_agent(state: AgentState) -> AgentState:
    """Generate answer strictly from relevant docs."""
    docs = state.get("relevant_docs", [])
    question = state.get("rewritten_query") or state["question"]
    strict = state.get("regeneration_count", 0) > 0

    if not docs:
        return {
            **state,
            "answer": NO_INFO_ANSWER,
            "key_points": [],
            "citations": [],
            "current_step": "generating",
            "step_log": state.get("step_log", []) + ["Generator → no relevant docs; fallback"],
        }

    context = _build_context(docs)
    system_prompt = GENERATOR_SYSTEM_STRICT if strict else GENERATOR_SYSTEM

    logger.info("[Generator] Generating answer (strict=%s)", strict)

    llm = get_main_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=GENERATOR_HUMAN.format(
            context=context,
            question=question,
        )),
    ]

    try:
        response = llm.invoke(messages)
        answer = response.content.strip()
    except Exception as exc:
        logger.exception("[Generator] LLM generation error: %s", exc)
        if "429" in str(exc) or "quota" in str(exc).lower() or "rate limit" in str(exc).lower():
            answer = (
                "⚠️ The AI model provider temporarily reached its request limit. "
                "Please wait a few seconds and try your question again."
            )
        else:
            answer = (
                "⚠️ A service error occurred while communicating with the AI model provider. "
                "Please verify your connection or API key and try again."
            )

    citations = _extract_citations(answer, docs)
    key_points = _extract_key_points(answer)

    logger.info("[Generator] Answer length: %d chars, Citations: %d", len(answer), len(citations))

    return {
        **state,
        "answer": answer,
        "key_points": key_points,
        "citations": citations,
        "current_step": "generating",
        "step_log": state.get("step_log", []) + [
            f"Generator → {len(answer)} chars, {len(citations)} citations"
        ],
    }
