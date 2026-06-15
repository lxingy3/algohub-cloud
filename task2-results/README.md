# Task 2 Impact Classification

Task 2 classifies each story's `narrativeText` into one of four impact labels:

- `NEGATIVE`
- `POSITIVE`
- `MIXED`
- `UNCLEAR`

It outputs the database fields used by the app:

- `aiImpactClassification`
- `aiConfidenceScore`

Run the local test:

```powershell
python -m venv .task2-deberta-env
.\.task2-deberta-env\Scripts\python.exe -m pip install -r task2-results\requirements-task2.txt
.\.task2-deberta-env\Scripts\python.exe scripts\task2-impact-classify-local.py
```

The script uses a DeBERTa-v3 zero-shot classifier and applies the 0.85 confidence threshold from the pipeline notes.
