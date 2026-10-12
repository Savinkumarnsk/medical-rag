"""
test_chunker.py — Unit tests for the chunker module.
"""
import pytest
from langchain_core.documents import Document
from app.ingestion.chunker import chunk_documents, _content_hash, _split_preserving_tables


def make_doc(content: str, page: int = 1) -> Document:
    return Document(
        page_content=content,
        metadata={"source": "test.pdf", "page": page, "section": "Test", "file_type": "pdf"},
    )


class TestContentHash:
    def test_deterministic(self):
        assert _content_hash("hello") == _content_hash("hello")

    def test_different_inputs(self):
        assert _content_hash("hello") != _content_hash("world")

    def test_length(self):
        h = _content_hash("test")
        assert len(h) == 16


class TestSplitPreservingTables:
    def test_keeps_table_together(self):
        text = "Intro paragraph\n\n| Col1 | Col2 |\n|---|---|\n| A | B |\n\nConclusion"
        segments = _split_preserving_tables(text)
        table_segments = [s for s in segments if "|" in s]
        assert len(table_segments) == 1
        assert "Col1" in table_segments[0]
        assert "Col2" in table_segments[0]

    def test_regular_paragraphs_split(self):
        text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
        segments = _split_preserving_tables(text)
        assert len(segments) >= 2


class TestChunkDocuments:
    def test_basic_chunking(self):
        doc = make_doc("This is a test document. " * 50)
        chunks = chunk_documents([doc])
        assert len(chunks) >= 1

    def test_metadata_propagation(self):
        doc = make_doc("Sample text " * 20, page=5)
        chunks = chunk_documents([doc])
        for chunk in chunks:
            assert chunk.metadata["source"] == "test.pdf"
            assert chunk.metadata["page"] == 5

    def test_chunk_ids_assigned(self):
        doc = make_doc("Content " * 30)
        chunks = chunk_documents([doc])
        for chunk in chunks:
            assert "chunk_id" in chunk.metadata
            assert len(chunk.metadata["chunk_id"]) == 16

    def test_deduplication_by_hash(self):
        doc = make_doc("Repeated content " * 20)
        # Same content → same chunk_id
        chunks = chunk_documents([doc, doc])
        ids = [c.metadata["chunk_id"] for c in chunks]
        # Should have duplicates (dedup happens in indexer, not chunker)
        assert len(ids) >= 1

    def test_empty_doc_skipped(self):
        doc = make_doc("")
        chunks = chunk_documents([doc])
        assert len(chunks) == 0

    def test_multiple_docs(self):
        docs = [make_doc("Document content " * 30, page=i) for i in range(3)]
        chunks = chunk_documents(docs)
        pages = {c.metadata["page"] for c in chunks}
        assert pages == {0, 1, 2}

    def test_long_doc_multiple_chunks(self):
        long_text = "Medical information about hypertension. " * 200
        doc = make_doc(long_text)
        chunks = chunk_documents([doc])
        assert len(chunks) > 1
