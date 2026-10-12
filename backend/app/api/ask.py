"""
ask.py — Streaming SSE /ask endpoint.

Streams agent step events + token chunks to the frontend.
Event types:
  - "step"   : {"step": "routing"|"rewriting"|"retrieving"|"grading"|"generating"|"verifying"|"done"}
  - "token"  : {"token": "..."}  (incremental answer tokens)
  - "result" : full final state {answer, citations, key_points, step_log}
  - "error"  : {"error": "..."}
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import AsyncGenerator, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.agents.graph import get_graph

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ask", tags=["QA"])


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    chat_history: list = Field(default_factory=list)


@router.post("")
async def ask(request: AskRequest):
    """Stream the multi-agent RAG pipeline as SSE events."""
    session_id = request.session_id or str(uuid.uuid4())

    async def event_stream() -> AsyncGenerator[dict, None]:
        try:
            graph = get_graph()
            config = {"configurable": {"thread_id": session_id}}

            initial_state = {
                "question": request.question,
                "session_id": session_id,
                "chat_history": request.chat_history,
                "rewrite_count": 0,
                "regeneration_count": 0,
                "step_log": [],
            }

            # Stream graph events
            prev_step = None
            async for event in graph.astream_events(
                initial_state,
                config=config,
                version="v2",
            ):
                kind = event.get("event", "")
                name = event.get("name", "")
                data = event.get("data", {})

                # Node start → emit step event
                if kind == "on_chain_start" and name in (
                    "router", "rewriter", "retriever", "grader",
                    "generator", "verifier", "prep_regeneration", "finalizer",
                    "chitchat_responder", "out_of_scope_handler",
                ):
                    step_label = _node_to_step_label(name)
                    if step_label != prev_step:
                        prev_step = step_label
                        yield {
                            "event": "step",
                            "data": json.dumps({"step": step_label}),
                        }

                # LLM token streaming from generator
                elif kind == "on_chat_model_stream" and "generator" in name:
                    chunk = data.get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        yield {
                            "event": "token",
                            "data": json.dumps({"token": chunk.content}),
                        }

            # Get final state
            final_state = await graph.aget_state(config)
            values = final_state.values if hasattr(final_state, "values") else {}

            yield {
                "event": "result",
                "data": json.dumps({
                    "answer": values.get("final_answer") or values.get("answer", ""),
                    "citations": values.get("citations", []),
                    "key_points": values.get("key_points", []),
                    "step_log": values.get("step_log", []),
                    "session_id": session_id,
                }),
            }

        except Exception as exc:
            logger.error("[Ask] Error: %s", exc, exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"error": str(exc)}),
            }

    return EventSourceResponse(event_stream())


def _node_to_step_label(node_name: str) -> str:
    labels = {
        "router": "routing",
        "rewriter": "rewriting",
        "retriever": "retrieving",
        "grader": "grading",
        "generator": "generating",
        "verifier": "verifying",
        "prep_regeneration": "regenerating",
        "finalizer": "done",
        "chitchat_responder": "responding",
        "out_of_scope_handler": "refusing",
    }
    return labels.get(node_name, node_name)
