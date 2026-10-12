"""
cleaner.py — Text normalisation for medical documents.
"""
from __future__ import annotations

import re
import unicodedata


def clean_text(text: str) -> str:
    """Apply a pipeline of normalisation steps."""
    text = _normalise_unicode(text)
    text = _fix_hyphenation(text)
    text = _remove_page_artifacts(text)
    text = _normalise_whitespace(text)
    return text.strip()


def _normalise_unicode(text: str) -> str:
    """Convert to NFKC unicode, keeping common medical symbols."""
    return unicodedata.normalize("NFKC", text)


def _fix_hyphenation(text: str) -> str:
    """Rejoin words broken with end-of-line hyphens (common in PDFs)."""
    # "hyper-\ntension" → "hypertension"
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    return text


def _remove_page_artifacts(text: str) -> str:
    """Remove common PDF header/footer patterns."""
    # Page numbers like "Page 4 of 12" or "- 4 -"
    text = re.sub(r"(?im)^-?\s*\d+\s*-?\s*$", "", text)
    text = re.sub(r"(?im)^page\s+\d+\s+of\s+\d+\s*$", "", text)
    # Running headers/footers (lines < 60 chars that repeat)
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        stripped = line.strip()
        # Skip lines that look like repeated header/footer boilerplate
        if len(stripped) < 5 and stripped.isdigit():
            continue
        cleaned.append(line)
    return "\n".join(cleaned)


def _normalise_whitespace(text: str) -> str:
    """Collapse multiple blank lines, normalise spaces."""
    # Multiple blank lines → single blank line
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Trailing whitespace on lines
    text = re.sub(r"[ \t]+$", "", text, flags=re.MULTILINE)
    # Non-breaking spaces → regular space
    text = text.replace("\xa0", " ")
    return text
