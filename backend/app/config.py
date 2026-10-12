"""
config.py — Centralised settings via pydantic-settings.
All values are loaded from environment variables / .env file.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_PATH,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── LLM Provider & Settings ─────────────────────────────────────────────
    llm_provider: str = "openrouter"  # "openrouter" or "gemini"
    enable_verifier: bool = False

    # ── Google Gemini (optional) ─────────────────────────────────────────────
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    gemini_model: str = "gemini-3.8-flash"
    gemini_fast_model: str = "gemini-3.8-flash"

    # ── OpenRouter (fallback / optional) ────────────────────────────────────
    openrouter_api_key: str = Field(default="", description="OpenRouter API key")
    openrouter_model: str = "nvidia/nemotron-3.5-lightning:free"
    openrouter_fast_model: str = "nvidia/nemotron-3.5-lightning:free"
    openrouter_referer: str = "http://localhost:5173"
    openrouter_title: str = "MedicalDocRAG"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # ── Embeddings ──────────────────────────────────────────────────────────
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    # ── FAISS ───────────────────────────────────────────────────────────────
    faiss_index_path: Path = Path("data/faiss_index")
    raw_docs_path: Path = Path("data/raw")

    # ── Retrieval ───────────────────────────────────────────────────────────
    retrieval_top_k: int = 8
    retrieval_mmr: bool = True
    mmr_fetch_k: int = 20

    # ── Chunking ────────────────────────────────────────────────────────────
    chunk_size: int = 800
    chunk_overlap: int = 120

    # ── PII ─────────────────────────────────────────────────────────────────
    enable_pii_masking: bool = False

    # ── App ─────────────────────────────────────────────────────────────────
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str) -> str:
        return v

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
