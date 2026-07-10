import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from transformers import pipeline


DEFAULT_MODEL = os.environ.get("TASK2_IMPACT_MODEL", "facebook/bart-large-mnli")

LABELS = {
    "NEGATIVE": "negative experience with an automated system",
    "POSITIVE": "positive experience with an automated system",
    "MIXED": "mixed experience with an automated system",
    "UNCLEAR": "unclear or neutral experience",
}

EVIDENCE_TO_LABEL = {
    LABELS["NEGATIVE"]: "NEGATIVE",
    LABELS["POSITIVE"]: "POSITIVE",
    LABELS["MIXED"]: "MIXED",
    LABELS["UNCLEAR"]: "UNCLEAR",
}


def load_narratives(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    data = payload.get("records") if isinstance(payload, dict) else payload
    if not isinstance(data, list):
        raise ValueError("Input JSON must be a list or an object with a records array.")

    records = []
    for index, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Record {index} is not an object.")
        text = str(item.get("narrativeText") or item.get("text") or "").strip()
        if not text:
            raise ValueError(f"Record {index} is missing narrativeText.")
        records.append({
            "id": str(item.get("id") or f"record-{index}"),
            "title": item.get("title"),
            "narrativeText": text,
        })
    return records


def classify_records(records: list[dict], model_name: str, threshold: float) -> list[dict]:
    classifier = pipeline(
        "zero-shot-classification",
        model=model_name,
        tokenizer=model_name,
        device=-1,
    )
    evidence_descriptions = list(EVIDENCE_TO_LABEL.keys())
    results = []

    for record in records:
      output = classifier(
          record["narrativeText"],
          candidate_labels=evidence_descriptions,
          multi_label=False,
      )
      scores_by_description = dict(zip(output["labels"], output["scores"]))
      evidence_scores = {
          EVIDENCE_TO_LABEL[description]: round(float(scores_by_description.get(description, 0.0)), 4)
          for description in evidence_descriptions
      }
      winner = EVIDENCE_TO_LABEL[output["labels"][0]]
      confidence = float(output["scores"][0])
      results.append({
          "id": record["id"],
          "title": record["title"],
          "inputField": "narrativeText",
          "model": model_name,
          "aiImpactClassification": winner,
          "aiConfidenceScore": confidence,
          "humanReviewRequired": confidence <= threshold,
          "threshold": threshold,
          "evidenceScores": evidence_scores,
          "narrativeText": record["narrativeText"],
      })

    return results

def main() -> None:
    parser = argparse.ArgumentParser(description="Run ML Task 2 impact classification on narrative text.")
    parser.add_argument("--input", default="task2-results/sample-narratives.json", help="JSON list of narrative records.")
    parser.add_argument("--output", default="task2-results/task2-impact-classification-results.json", help="Output JSON path.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Zero-shot impact classifier model.")
    parser.add_argument("--threshold", type=float, default=0.85, help="Confidence threshold for auto-assignment.")
    args = parser.parse_args()

    records = load_narratives(Path(args.input))
    classifications = classify_records(records, args.model, args.threshold)
    output = {
        "task": "Task 2: impact classification",
        "inputField": "narrativeText",
        "outputFields": ["aiImpactClassification", "aiConfidenceScore"],
        "labels": ["NEGATIVE", "POSITIVE", "MIXED", "UNCLEAR"],
        "threshold": args.threshold,
        "model": args.model,
        "status": "COMPLETED",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "results": classifications,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output_path.resolve())
    print(f"status=COMPLETED records={len(classifications)} model={args.model}")


if __name__ == "__main__":
    main()
