"""
eval.py — Simple RAG evaluation script.
Reports retrieval hit rate and groundedness over 10 Q&A pairs.

Usage:
    cd backend
    python eval/eval.py
"""
from __future__ import annotations

import os
import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Evaluation Q&A pairs based on hypertension_guidelines.md
QA_PAIRS = [
    {
        "question": "What are the diagnostic criteria for Grade 2 hypertension?",
        "expected_keywords": ["160", "100", "grade 2"],
    },
    {
        "question": "What is the target blood pressure for diabetic patients?",
        "expected_keywords": ["130", "80", "diabetes"],
    },
    {
        "question": "Which antihypertensive drugs are contraindicated in pregnancy?",
        "expected_keywords": ["ACE", "ARB", "contraindicated", "pregnancy"],
    },
    {
        "question": "What lifestyle changes can reduce blood pressure?",
        "expected_keywords": ["DASH", "sodium", "exercise", "alcohol"],
    },
    {
        "question": "What is the definition of a hypertensive emergency?",
        "expected_keywords": ["180", "120", "end-organ", "damage"],
    },
    {
        "question": "What are the first-line antihypertensive drug classes?",
        "expected_keywords": ["ACE", "ARB", "calcium channel", "thiazide"],
    },
    {
        "question": "What is the blood pressure target for elderly patients over 80?",
        "expected_keywords": ["150", "90", "elderly"],
    },
    {
        "question": "How does sodium restriction affect blood pressure?",
        "expected_keywords": ["sodium", "mmHg", "restriction"],
    },
    {
        "question": "What complications can uncontrolled hypertension cause?",
        "expected_keywords": ["stroke", "kidney", "heart", "MI"],
    },
    {
        "question": "What is the recommended monitoring for patients on ACE inhibitors?",
        "expected_keywords": ["electrolytes", "potassium", "eGFR", "4 weeks"],
    },
]


def check_hit(retrieved_docs, expected_keywords: list) -> bool:
    """Return True if at least one expected keyword is found in retrieved docs."""
    combined = " ".join(d.page_content.lower() for d in retrieved_docs)
    return any(kw.lower() in combined for kw in expected_keywords)


def check_groundedness_simple(answer: str, expected_keywords: list) -> bool:
    """Heuristic: answer contains at least one expected keyword."""
    answer_lower = answer.lower()
    return any(kw.lower() in answer_lower for kw in expected_keywords)


def run_eval():
    print("=" * 60)
    print("Medical RAG Evaluation")
    print("=" * 60)

    # Import after env is loaded
    from app.ingestion.indexer import get_vectorstore
    from app.config import get_settings

    cfg = get_settings()
    index_path = cfg.faiss_index_path

    if not (index_path / "index.faiss").exists():
        print("❌ FAISS index not found. Run ingestion first:")
        print("   python -m app.ingestion.indexer --path data/raw")
        sys.exit(1)

    try:
        store = get_vectorstore()
    except Exception as e:
        print(f"❌ Failed to load vector store: {e}")
        sys.exit(1)

    hit_count = 0
    grounded_count = 0
    results = []

    for i, qa in enumerate(QA_PAIRS, start=1):
        question = qa["question"]
        expected = qa["expected_keywords"]

        print(f"\n[{i:02d}] Q: {question}")

        # Retrieval
        docs = store.similarity_search(question, k=5)
        hit = check_hit(docs, expected)
        hit_count += int(hit)

        print(f"     Retrieval hit: {'✓' if hit else '✗'} ({len(docs)} docs)")
        if docs:
            src = docs[0].metadata.get("source", "?")
            print(f"     Top source: {src}")

        # Simple groundedness check (keyword-based, no LLM call)
        if docs:
            answer_proxy = " ".join(d.page_content for d in docs[:2])
            grounded = check_groundedness_simple(answer_proxy, expected)
            grounded_count += int(grounded)
            print(f"     Groundedness: {'✓' if grounded else '✗'}")
        else:
            print("     Groundedness: ✗ (no docs retrieved)")

        results.append({
            "question": question,
            "retrieval_hit": hit,
            "grounded": grounded if docs else False,
        })

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    total = len(QA_PAIRS)
    print(f"Retrieval Hit Rate : {hit_count}/{total} = {hit_count/total:.0%}")
    print(f"Groundedness Rate  : {grounded_count}/{total} = {grounded_count/total:.0%}")

    # Save results
    out_path = Path("eval/results.json")
    out_path.parent.mkdir(exist_ok=True)
    out_path.write_text(json.dumps(results, indent=2))
    print(f"\nDetailed results saved to {out_path}")


if __name__ == "__main__":
    run_eval()
