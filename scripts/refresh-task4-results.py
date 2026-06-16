import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

import spacy


def load_runner():
    script_path = Path(__file__).with_name("task2-5-run-local.py")
    spec = importlib.util.spec_from_file_location("task2_5_run_local", script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    output_dir = Path("task345-results/existing-stories-ml-output")
    combined_path = output_dir / "task2-5-combined-results.json"
    task4_path = output_dir / "task4-entity-extraction-results.json"
    runner = load_runner()
    nlp = spacy.load("en_core_web_sm")

    combined = json.loads(combined_path.read_text(encoding="utf-8"))
    task4_rows = []
    for row in combined["results"]:
        entities = runner.extract_entities(nlp, row["narrativeText"])
        row["aiExtractedExperiences"]["entities"] = entities
        task4_rows.append(
            {
                "id": row["id"],
                "title": row.get("title") or "",
                "inputField": "narrativeText",
                "aiExtractedExperiences": {"entities": entities},
            }
        )

    combined["generatedAt"] = datetime.now(timezone.utc).isoformat()
    task4_payload = {
        "task": "Task 4: Entity Extraction",
        "tool": "spaCy",
        "model": "en_core_web_sm",
        "inputField": "narrativeText",
        "outputFields": ["aiExtractedExperiences.entities"],
        "generatedAt": combined["generatedAt"],
        "results": task4_rows,
    }

    combined_path.write_text(json.dumps(combined, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    task4_path.write_text(json.dumps(task4_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"updated": len(task4_rows), "combinedPath": str(combined_path), "task4Path": str(task4_path)}, indent=2))


if __name__ == "__main__":
    main()
