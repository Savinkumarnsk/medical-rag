"""
test_loaders.py — Unit tests for document loaders.
"""
import pytest
from pathlib import Path
from app.ingestion.loaders import load_md, load_txt, load_document, _extract_section_heading


SAMPLE_MD = """# Introduction

This is the introduction section.

## Methods

This describes the methods used.

## Results

Here are the results of the study.
"""

SAMPLE_TXT = "This is a plain text document with medical information.\nHypertension affects millions."


class TestMarkdownLoader:
    def test_loads_sections(self, tmp_path):
        f = tmp_path / "test.md"
        f.write_text(SAMPLE_MD)
        docs = load_md(f)
        assert len(docs) >= 2

    def test_metadata_fields(self, tmp_path):
        f = tmp_path / "test.md"
        f.write_text(SAMPLE_MD)
        docs = load_md(f)
        for doc in docs:
            assert "source" in doc.metadata
            assert "page" in doc.metadata
            assert "section" in doc.metadata
            assert "file_type" in doc.metadata
            assert doc.metadata["file_type"] == "md"

    def test_source_is_filename(self, tmp_path):
        f = tmp_path / "my_doc.md"
        f.write_text(SAMPLE_MD)
        docs = load_md(f)
        assert all(d.metadata["source"] == "my_doc.md" for d in docs)

    def test_empty_file(self, tmp_path):
        f = tmp_path / "empty.md"
        f.write_text("")
        docs = load_md(f)
        # Should handle gracefully
        assert isinstance(docs, list)


class TestTxtLoader:
    def test_loads_as_single_doc(self, tmp_path):
        f = tmp_path / "test.txt"
        f.write_text(SAMPLE_TXT)
        docs = load_txt(f)
        assert len(docs) == 1

    def test_content_preserved(self, tmp_path):
        f = tmp_path / "test.txt"
        f.write_text(SAMPLE_TXT)
        docs = load_txt(f)
        assert "Hypertension" in docs[0].page_content

    def test_metadata(self, tmp_path):
        f = tmp_path / "test.txt"
        f.write_text(SAMPLE_TXT)
        docs = load_txt(f)
        assert docs[0].metadata["file_type"] == "txt"
        assert docs[0].metadata["page"] == 1


class TestDispatcher:
    def test_md_dispatch(self, tmp_path):
        f = tmp_path / "doc.md"
        f.write_text("# Test\nContent.")
        docs = load_document(f)
        assert len(docs) >= 1

    def test_txt_dispatch(self, tmp_path):
        f = tmp_path / "doc.txt"
        f.write_text("Test content")
        docs = load_document(f)
        assert len(docs) == 1

    def test_unsupported_raises(self, tmp_path):
        f = tmp_path / "doc.xyz"
        f.write_text("content")
        with pytest.raises(ValueError, match="Unsupported"):
            load_document(f)


class TestSectionExtractor:
    def test_markdown_heading(self):
        text = "## Treatment Guidelines\nSome content here."
        heading = _extract_section_heading(text)
        assert heading == "Treatment Guidelines"

    def test_all_caps_heading(self):
        text = "INTRODUCTION\nSome content here."
        heading = _extract_section_heading(text)
        assert heading.lower() == "introduction"

    def test_no_heading_returns_general(self):
        text = "Just some plain text without headings."
        heading = _extract_section_heading(text)
        assert heading == "General"
