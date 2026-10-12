# Chapter 6: Clinical Safety, Groundedness & Evaluation

## 1. Safety Guardrails & Non-Pharmacological Boundaries

Because MedDoc Intelligence operates in the clinical domain, multiple safety layers prevent risky medical advice:

```
[User Input]
     │
     ├── 1. Emergency Detection ──> Prepend ⚠️ Emergency Services Warning
     │
     ├── 2. Intent Routing       ──> Out-of-Scope Handler (Refuse personal prescriptions)
     │
     ├── 3. Strict System Prompt ──> Prohibit inference beyond context
     │
     ├── 4. Verifier Agent       ──> Check claims against source passages
     │
     └── 5. Clinical Disclaimer  ──> Persistent footer & answer attributions
```

---

## 2. Hallucination Prevention Directives

In `app/prompts.py`, both `GENERATOR_SYSTEM` and `GENERATOR_SYSTEM_STRICT` impose non-negotiable constraints:
1. **Verbatim Context Grounding**:
   > *"Answer ONLY from the provided context. If the context does not contain the answer, say: 'I could not find this information in the uploaded documents.'"*
2. **Mandatory Inline Citations**:
   > *"Cite every factual claim with [Source: <filename>, p.<page>]."*
3. **No Patient-Specific Prescription/Dosage Advice**:
   > *"Do NOT provide personal diagnosis, specific treatment plans, or dosage advice for individual patients. Summarise what the documents say and always recommend consulting a qualified healthcare professional."*

---

## 3. Automated Evaluation Suite (`backend/eval/eval.py`)

The repository includes an automated evaluation harness that benchmarks retrieval and groundedness over clinical test questions.

### 3.1 Retrieval Hit Rate Metric
$$\text{Hit Rate} = \frac{1}{|Q|} \sum_{q \in Q} \mathbb{I}(\text{Gold Document} \in \text{Retrieved Chunks}(q))$$

- **Target**: $\ge 90\%$ retrieval hit rate on golden clinical test sets.

### 3.2 Citation Precision Metric
$$\text{Citation Precision} = \frac{|\text{Verified Factual Claims}|}{|\text{Total Claims in Answer}|}$$

- **Target**: $100\%$ precision in strict mode.

### 3.3 Running the Evaluation Benchmark

```bash
cd backend
python eval/eval.py
```

### 3.4 Running Unit & Pipeline Tests

```bash
cd backend
pytest tests/ -v
```

Tests cover:
- Document loaders (PDF, DOCX, TXT, MD)
- Chunker structure preservation and overlap
- Query rewriter acronym expansion
- Router intent classification
- End-to-end StateGraph execution with mocked LLMs

---

*MedDoc Intelligence Engineering Team · Safe Clinical AI Systems*
