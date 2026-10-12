"""
ingest.py — File upload and re-index endpoints.
"""
from __future__ import annotations

import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import get_settings
from app.ingestion.indexer import ingest_documents
from app.agents.retriever import invalidate_store_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["Ingestion"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


class IngestResponse(BaseModel):
    indexed: int
    skipped: int
    total_chunks: int
    filename: str


class ReindexResponse(BaseModel):
    message: str
    indexed: int
    total_chunks: int


@router.post("", response_model=IngestResponse)
async def ingest_file(file: UploadFile = File(...)):
    """Upload and index a single document file."""
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    cfg = get_settings()
    dest = cfg.raw_docs_path / file.filename
    cfg.raw_docs_path.mkdir(parents=True, exist_ok=True)

    # Save upload
    with dest.open("wb") as f:
        content = await file.read()
        f.write(content)

    logger.info("Saved uploaded file: %s (%d bytes)", dest, len(content))

    try:
        result = ingest_documents(file_path=dest)
        invalidate_store_cache()
    except Exception as exc:
        logger.error("Ingestion failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    return IngestResponse(
        indexed=result["indexed"],
        skipped=result["skipped"],
        total_chunks=result["total_chunks"],
        filename=file.filename,
    )


@router.post("/reindex", response_model=ReindexResponse)
async def reindex_all():
    """Re-index all documents in the raw docs directory."""
    cfg = get_settings()
    try:
        result = ingest_documents(docs_path=cfg.raw_docs_path, reindex=True)
        invalidate_store_cache()
    except Exception as exc:
        logger.error("Re-index failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    return ReindexResponse(
        message="Re-index complete",
        indexed=result["indexed"],
        total_chunks=result["total_chunks"],
    )
