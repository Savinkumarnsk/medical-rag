"""
chunker.py — Structure-aware document chunking with metadata propagation.
"""
from __future__ import annotations

import hashlib
import logging
from typing import List

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings
from app.ingestion.cleaner import clean_text

logger = logging.getLogger(__name__)

# Separators ordered from highest to lowest structural priority
_SEPARATORS = [
    "\n## ",    # Markdown H2
    "\n### ",   # Markdown H3
    "\n\n",     # Paragraph break
    "\n",       # Line break
    ". ",       # Sentence boundary
    " ",        # Word boundary
    "",         # Character fallback
]

# Patterns that indicate table or medication list boundaries — avoid splitting mid-table
_TABLE_START = "| "
_TABLE_END = "|\n\n"


def chunk_documents(docs: List[Document]) -> List[Document]:
    """
    Split documents into retrieval-optimised chunks.
    - Cleans text before splitting
    - Preserves metadata from source document
    - Adds chunk_id (content hash) and chunk_index
    - Avoids splitting mid-table where possible
    """
    cfg = get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=cfg.chunk_size,
        chunk_overlap=cfg.chunk_overlap,
        separators=_SEPARATORS,
        length_function=_token_len,
        keep_separator=True,
    )

    all_chunks: List[Document] = []
    for doc in docs:
        cleaned_content = clean_text(doc.page_content)
        if not cleaned_content.strip():
            continue

        # Split carefully around tables
        segments = _split_preserving_tables(cleaned_content)
        raw_chunks: List[Document] = []
        for segment in segments:
            sub_docs = splitter.create_documents(
                [segment],
                metadatas=[doc.metadata],
            )
            raw_chunks.extend(sub_docs)

        # Add chunk IDs and indices
        for i, chunk in enumerate(raw_chunks):
            chunk_id = _content_hash(chunk.page_content)
            chunk.metadata = {
                **doc.metadata,
                "chunk_id": chunk_id,
                "chunk_index": i,
                "chunk_count": len(raw_chunks),
            }
            all_chunks.append(chunk)

    logger.info("Created %d chunks from %d documents", len(all_chunks), len(docs))
    return all_chunks


def _split_preserving_tables(text: str) -> List[str]:
    """
    Split text at double newlines but keep table blocks together.
    A table block starts with '| ' and ends at a blank line after a row.
    """
    segments: List[str] = []
    current: List[str] = []
    in_table = False

    for line in text.split("\n"):
        is_table_row = line.strip().startswith("|")
        if is_table_row:
            in_table = True
            current.append(line)
        else:
            if in_table and not line.strip():
                # End of table block — flush it as one segment
                segments.append("\n".join(current))
                current = []
                in_table = False
            else:
                if not in_table and not line.strip() and current:
                    segments.append("\n".join(current))
                    current = []
                else:
                    current.append(line)

    if current:
        segments.append("\n".join(current))

    return [s for s in segments if s.strip()]


def _token_len(text: str) -> int:
    """Approximate token length using tiktoken (cl100k_base)."""
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        # Fallback: ~4 chars per token
        return len(text) // 4


def _content_hash(text: str) -> str:
    """SHA-256 content hash for deduplication."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
