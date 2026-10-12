"""
llm.py — Dual-provider LLM factory supporting Google Gemini and OpenRouter
with automatic cross-provider fallback.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)


def _make_openrouter_llm(model: str, temperature: float, streaming: bool = False) -> BaseChatModel:
    cfg = get_settings()
    return ChatOpenAI(
        model=model or cfg.openrouter_model,
        temperature=temperature,
        streaming=streaming,
        base_url=cfg.openrouter_base_url,
        api_key=cfg.openrouter_api_key,
        default_headers={
            "HTTP-Referer": cfg.openrouter_referer,
            "X-Title": cfg.openrouter_title,
        },
        max_retries=0,
        timeout=15,
    )


def _make_gemini_llm(model: str, temperature: float) -> BaseChatModel:
    cfg = get_settings()
    from langchain_google_genai import ChatGoogleGenerativeAI
    gemini_model = model or cfg.gemini_model
    return ChatGoogleGenerativeAI(
        model=gemini_model,
        google_api_key=cfg.gemini_api_key,
        temperature=temperature,
        max_retries=1,
    )


def _make_hybrid_llm(
    openrouter_model: str,
    gemini_model: str,
    temperature: float,
    streaming: bool = False,
) -> BaseChatModel:
    cfg = get_settings()
    has_openrouter = bool(cfg.openrouter_api_key and not cfg.openrouter_api_key.startswith("sk-or-v1-xxx"))
    has_gemini = bool(cfg.gemini_api_key)

    or_llm = _make_openrouter_llm(openrouter_model, temperature, streaming) if has_openrouter else None
    gem_llm = _make_gemini_llm(gemini_model, temperature) if has_gemini else None

    # Dual provider with fallback
    if cfg.llm_provider.lower() == "gemini" and gem_llm:
        if or_llm:
            return gem_llm.with_fallbacks([or_llm])
        return gem_llm

    # Default / openrouter primary
    if or_llm:
        if gem_llm:
            return or_llm.with_fallbacks([gem_llm])
        return or_llm

    if gem_llm:
        return gem_llm

    raise ValueError("Neither OpenRouter nor Gemini API key is configured.")


@lru_cache(maxsize=4)
def get_main_llm(streaming: bool = False) -> BaseChatModel:
    """Full model — used for generation. temperature=0.2"""
    cfg = get_settings()
    return _make_hybrid_llm(
        openrouter_model=cfg.openrouter_model,
        gemini_model=cfg.gemini_model,
        temperature=0.2,
        streaming=streaming,
    )


@lru_cache(maxsize=4)
def get_fast_llm() -> BaseChatModel:
    """Fast model — used for router, grader, rewriter, verifier. temp=0"""
    cfg = get_settings()
    return _make_hybrid_llm(
        openrouter_model=cfg.openrouter_fast_model,
        gemini_model=cfg.gemini_fast_model,
        temperature=0,
    )
