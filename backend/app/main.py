"""
main.py — FastAPI application entry point.
Configured with Google Gemini (gemini-3.6-flash) primary and OpenRouter fallback.
"""
from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api import health, ingest, documents, ask

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_settings()
    logger.info("Starting Medical RAG API", env=cfg.app_env)
    # Pre-warm embeddings & vectorstore at startup
    try:
        from app.ingestion.indexer import get_vectorstore
        store = get_vectorstore()
        if store is not None:
            logger.info("Pre-warmed FAISS vectorstore and embeddings cache")
    except Exception as exc:
        logger.warning(f"Could not pre-warm vectorstore on startup: {exc}")
    yield
    logger.info("Shutting down Medical RAG API")


# ── App ───────────────────────────────────────────────────────────────────────
cfg = get_settings()

app = FastAPI(
    title="Medical Document RAG API",
    description="Multi-agent RAG over medical documents using LangChain + LangGraph + FAISS",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request ID middleware ─────────────────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ── Exception handler ─────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(ingest.router)
app.include_router(documents.router)
app.include_router(ask.router)
