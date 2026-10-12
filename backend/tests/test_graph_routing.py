"""
test_graph_routing.py — Unit tests for graph routing logic.
"""
import pytest
from unittest.mock import MagicMock, patch


class TestRouterEdge:
    """Test the conditional edge logic for routing."""

    def test_document_qa_route(self):
        from app.agents.grader import should_retry_or_continue
        from langchain_core.documents import Document

        state = {
            "relevant_docs": [
                Document(page_content="doc1", metadata={}),
                Document(page_content="doc2", metadata={}),
            ],
            "rewrite_count": 0,
        }
        assert should_retry_or_continue(state) == "generate"

    def test_rewrite_triggered_when_few_relevant(self):
        from app.agents.grader import should_retry_or_continue

        state = {
            "relevant_docs": [],
            "rewrite_count": 0,
        }
        assert should_retry_or_continue(state) == "rewrite"

    def test_generate_after_max_rewrites(self):
        from app.agents.grader import should_retry_or_continue

        state = {
            "relevant_docs": [],
            "rewrite_count": 2,  # Max reached
        }
        assert should_retry_or_continue(state) == "generate"

    def test_one_relevant_doc_triggers_rewrite(self):
        from app.agents.grader import should_retry_or_continue
        from langchain_core.documents import Document

        state = {
            "relevant_docs": [Document(page_content="only one", metadata={})],
            "rewrite_count": 1,
        }
        # Still < 2 and rewrite_count < 2 → rewrite
        assert should_retry_or_continue(state) == "rewrite"


class TestVerifierEdge:
    """Test the conditional edge logic for verification."""

    def test_grounded_goes_to_finalize(self):
        from app.agents.verifier import should_regenerate_or_finish

        state = {"is_grounded": True, "regeneration_count": 0}
        assert should_regenerate_or_finish(state) == "finalize"

    def test_ungrounded_triggers_regeneration(self):
        from app.agents.verifier import should_regenerate_or_finish

        state = {"is_grounded": False, "regeneration_count": 0}
        assert should_regenerate_or_finish(state) == "regenerate"

    def test_max_regeneration_goes_to_finalize(self):
        from app.agents.verifier import should_regenerate_or_finish

        state = {"is_grounded": False, "regeneration_count": 1}
        assert should_regenerate_or_finish(state) == "finalize"


class TestRouterNodeParsing:
    """Test router agent JSON parsing resilience."""

    def test_parse_valid_json(self):
        import json
        raw = '{"category": "document_qa", "reason": "Medical question"}'
        result = json.loads(raw)
        assert result["category"] == "document_qa"

    def test_parse_fenced_json(self):
        import json
        raw = "```json\n{\"category\": \"chitchat\", \"reason\": \"Greeting\"}\n```"
        clean = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(clean)
        assert result["category"] == "chitchat"
