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
    """Extract citations from the answer and ensure all retrieved context chunks are available with full text."""
    pattern = r"\[(?:Source:\s*)?([^,\]\n]+?)(?:,\s*(?:[pP]age|[pP])\.?\s*(\d+))?\]"
    matches = re.findall(pattern, answer)
    seen = set()
    citations = []

    for source, page in matches:
        s_clean = source.strip()
        p_clean = page.strip() if page else ""

        # Validate that it matches a known doc or extension
        is_known = any(s_clean.lower() in str(d.metadata.get("source", "")).lower() for d in docs)
        has_ext = any(s_clean.lower().endswith(ext) for ext in [".pdf", ".docx", ".txt", ".md"])
        if not (is_known or has_ext):
            continue

        key = (s_clean.lower(), p_clean)
        if key not in seen:
            seen.add(key)
            matching_doc = None
            for doc in docs:
                d_src = str(doc.metadata.get("source", "")).strip().lower()
                d_page = str(doc.metadata.get("page", "")).strip()
                if (d_src == s_clean.lower() or s_clean.lower() in d_src) and (d_page == p_clean or not p_clean):
                    matching_doc = doc
                    break
            if not matching_doc:
                for doc in docs:
                    d_src = str(doc.metadata.get("source", "")).strip().lower()
                    if d_src == s_clean.lower() or s_clean.lower() in d_src:
                        matching_doc = doc
                        break

            full_content = matching_doc.page_content if matching_doc else ""
            section = matching_doc.metadata.get("section", "") if matching_doc else ""
            chunk_id = matching_doc.metadata.get("chunk_id", "") if matching_doc else ""

            citations.append({
                "source": matching_doc.metadata.get("source", s_clean) if matching_doc else s_clean,
                "page": str(matching_doc.metadata.get("page", p_clean or "1")) if matching_doc else (p_clean or "1"),
                "snippet": full_content,
                "content": full_content,
                "section": section,
                "chunk_id": chunk_id,
            })

    # Always ensure every retrieved document chunk is available in citations
    for i, doc in enumerate(docs, start=1):
        d_src = str(doc.metadata.get("source", "Document")).strip()
        d_page = str(doc.metadata.get("page", "1")).strip()
        already_present = any(
            c.get("source", "").lower() == d_src.lower() and str(c.get("page", "")) == d_page
            for c in citations
        )
        if not already_present:
            citations.append({
                "source": d_src,
                "page": d_page,
                "snippet": doc.page_content,
                "content": doc.page_content,
                "section": doc.metadata.get("section", ""),
                "chunk_id": doc.metadata.get("chunk_id", f"chunk-{i}"),
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
