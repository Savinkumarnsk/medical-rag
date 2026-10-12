"""
documents.py — List indexed documents.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from app.ingestion.indexer import list_indexed_documents

router = APIRouter(prefix="/documents", tags=["Documents"])


class DocumentInfo(BaseModel):
    source: str
    file_type: str
    page_count: int
    chunks: int


@router.get("", response_model=List[DocumentInfo])
async def get_documents():
    """Return a list of all indexed documents with metadata."""
    try:
        docs = list_indexed_documents()
        return [DocumentInfo(**d) for d in docs]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
