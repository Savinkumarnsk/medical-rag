"""
graph.py — LangGraph StateGraph assembly for the Medical RAG pipeline.

Flow:
  router
    ├─ chitchat     → chitchat_responder → END
    ├─ out_of_scope → out_of_scope_handler → END
    └─ document_qa  → rewriter → retriever → grader
                                               ├─ rewrite → rewriter (loop, max 2)
                                               └─ generate → generator → verifier
                                                                           ├─ regenerate → generator
                                                                           └─ finalize → finalizer → END
"""
from __future__ import annotations

import logging

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from app.agents.state import AgentState
from app.agents.router import router_agent
from app.agents.rewriter import rewriter_agent
from app.agents.retriever import retriever_agent
from app.agents.grader import grader_agent, should_retry_or_continue
from app.agents.generator import generator_agent
from app.agents.verifier import verifier_agent, should_regenerate_or_finish
from app.prompts import CHITCHAT_SYSTEM, OUT_OF_SCOPE_RESPONSE

logger = logging.getLogger(__name__)


# ── Leaf nodes ────────────────────────────────────────────────────────────────

def chitchat_responder(state: AgentState) -> AgentState:
    from app.llm import get_fast_llm
    llm = get_fast_llm()
    response = llm.invoke([
        SystemMessage(content=CHITCHAT_SYSTEM),
        HumanMessage(content=state["question"]),
    ])
    answer = response.content.strip()
    return {
        **state,
        "answer": answer,
        "final_answer": answer,
        "citations": [],
        "key_points": [],
        "current_step": "done",
        "step_log": state.get("step_log", []) + ["Chitchat → responded"],
    }


def out_of_scope_handler(state: AgentState) -> AgentState:
    return {
        **state,
        "answer": OUT_OF_SCOPE_RESPONSE,
        "final_answer": OUT_OF_SCOPE_RESPONSE,
        "citations": [],
        "key_points": [],
        "current_step": "done",
        "step_log": state.get("step_log", []) + ["Out-of-scope → refused"],
    }


def prep_regeneration(state: AgentState) -> AgentState:
    """Increment regeneration count before sending back to generator."""
    return {
        **state,
        "regeneration_count": state.get("regeneration_count", 0) + 1,
        "current_step": "regenerating",
        "step_log": state.get("step_log", []) + ["Verifier → re-generating with strict prompt"],
    }


def finalizer(state: AgentState) -> AgentState:
    """Copy answer to final_answer, append disclaimer."""
    answer = state.get("answer", "")
    return {
        **state,
        "final_answer": answer,
        "current_step": "done",
        "step_log": state.get("step_log", []) + ["Pipeline complete ✓"],
    }


# ── Route helpers ─────────────────────────────────────────────────────────────

def route_from_router(state: AgentState) -> str:
    return state.get("route", "document_qa")


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph(checkpointer=None):
    """Build and compile the LangGraph StateGraph."""
    builder = StateGraph(AgentState)

    # Add nodes
    builder.add_node("router", router_agent)
    builder.add_node("chitchat_responder", chitchat_responder)
    builder.add_node("out_of_scope_handler", out_of_scope_handler)
    builder.add_node("rewriter", rewriter_agent)
    builder.add_node("retriever", retriever_agent)
    builder.add_node("grader", grader_agent)
    builder.add_node("generator", generator_agent)
    builder.add_node("verifier", verifier_agent)
    builder.add_node("prep_regeneration", prep_regeneration)
    builder.add_node("finalizer", finalizer)

    # Entry point
    builder.set_entry_point("router")

    # Router conditional edges (document_qa goes straight to retriever, rewriter used for retries)
    builder.add_conditional_edges(
        "router",
        route_from_router,
        {
            "chitchat": "chitchat_responder",
            "out_of_scope": "out_of_scope_handler",
            "document_qa": "retriever",
        },
    )

    # Leaf nodes → END
    builder.add_edge("chitchat_responder", END)
    builder.add_edge("out_of_scope_handler", END)

    # Document QA pipeline
    builder.add_edge("rewriter", "retriever")
    builder.add_edge("retriever", "grader")

    # Grader conditional: retry rewrite or generate
    builder.add_conditional_edges(
        "grader",
        should_retry_or_continue,
        {
            "rewrite": "rewriter",
            "generate": "generator",
        },
    )

    from app.config import get_settings
    cfg = get_settings()

    if cfg.enable_verifier:
        builder.add_edge("generator", "verifier")
        builder.add_conditional_edges(
            "verifier",
            should_regenerate_or_finish,
            {
                "regenerate": "prep_regeneration",
                "finalize": "finalizer",
            },
        )
        builder.add_edge("prep_regeneration", "generator")
    else:
        builder.add_edge("generator", "finalizer")

    builder.add_edge("finalizer", END)

    cp = checkpointer or MemorySaver()
    return builder.compile(checkpointer=cp)


# Module-level singleton
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
