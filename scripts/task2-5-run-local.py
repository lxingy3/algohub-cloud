import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import spacy
from keybert import KeyBERT
from transformers import pipeline


TASK2_MODEL = "MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33"
TASK3_MODEL = "facebook/bart-large-mnli"
TASK5_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

IMPACT_LABELS = {
    "NEGATIVE": "The story says an automated system harmed, disadvantaged, delayed, denied, wrongly flagged, or unfairly treated the person.",
    "POSITIVE": "The story says an automated system worked well, helped the person, improved access, or led to a good outcome.",
    "MIXED": "The story says an automated system had both helpful and harmful effects.",
    "UNCLEAR": "The story does not make the impact clear enough to determine whether it was positive or negative.",
}

THEME_LABELS = {
    "opacity": "Person did not understand how or why a decision was made.",
    "positive_experience": "System worked well or led to a good outcome.",
    "lack_of_recourse": "No way to challenge or appeal the automated decision.",
    "process_confusion": "Person was confused about the overall process.",
    "arbitrary_outcome": "Decision seemed random or inconsistent.",
    "delayed_outcome": "Process took unreasonably long.",
    "discriminatory_impact": "Suspected racial, economic, or demographic bias.",
    "lack_of_notification": "Person was not told that an algorithm was involved.",
    "data_accuracy": "System used incorrect or outdated information.",
    "loss_of_dignity": "Person felt dehumanized by the process.",
}

THEME_EVIDENCE = {
    "opacity": [
        r"\bno one explained\b",
        r"\bcould not explain\b",
        r"\bdo not know\b.*\bhow\b",
        r"\bdon't know\b.*\bhow\b",
        r"\bunclear\b.*\bwhy\b",
        r"\bhow\b.*\b(calculated|decided|made)\b",
    ],
    "positive_experience": [
        r"\bconnected me\b",
        r"\bfinished\b",
        r"\bwas able to\b",
        r"\bmuch better\b",
        r"\bhelped at first\b",
        r"\bworked well\b",
        r"\bfaster than before\b",
    ],
    "lack_of_recourse": [
        r"\bcould not change\b",
        r"\bno way to\b.*\b(appeal|challenge|change)\b",
        r"\bcould not appeal\b",
        r"\bdenied\b.*\bappeal\b",
        r"\bwould not review\b",
    ],
    "process_confusion": [
        r"\bconfused\b",
        r"\bstart over\b",
        r"\bdo not know whether\b",
        r"\bdon't know whether\b",
        r"\bnot sure\b",
        r"\bunclear\b.*\bprocess\b",
    ],
    "arbitrary_outcome": [
        r"\bkept\b.*\b(low priority|high-risk|label|score)\b",
        r"\bstayed\b.*\b(record|label|priority)\b",
        r"\bstill treated\b",
        r"\brandom\b",
        r"\binconsistent\b",
    ],
    "delayed_outcome": [
        r"\bwaited\b",
        r"\bweeks\b",
        r"\bmonths\b",
        r"\bdelay\b",
        r"\btook too long\b",
    ],
    "discriminatory_impact": [
        r"\bracial\b",
        r"\brace\b",
        r"\blow-income\b",
        r"\bzip code\b",
        r"\bneighborhood\b",
        r"\bdemographic\b",
        r"\bdisability\b",
        r"\bbiased\b",
        r"\bbias\b",
    ],
    "lack_of_notification": [
        r"\bwas not told\b",
        r"\bnever told\b",
        r"\bno notice\b",
        r"\bnot notified\b",
        r"\bonly learned later\b",
    ],
    "data_accuracy": [
        r"\bwrong\b",
        r"\boutdated\b",
        r"\bincorrect\b",
        r"\bold record\b",
        r"\bgrades improved\b",
        r"\bstayed on my record\b",
    ],
    "loss_of_dignity": [
        r"\btreated me like\b",
        r"\bhumiliated\b",
        r"\bdehumanized\b",
        r"\bscolded\b",
        r"\bstrip\b",
        r"\bnaked\b",
    ],
}

ROLE_TERMS = [
    "caseworker",
    "worker",
    "cps worker",
    "inspector",
    "dispatcher",
    "benefits worker",
    "transit worker",
    "career center worker",
    "assistance office worker",
    "front desk worker",
    "agency staff member",
    "city staff member",
    "school staff member",
    "screeners",
    "supervisors",
    "counselor",
    "teacher",
    "tenant",
    "resident",
    "parent",
    "student",
    "caller",
    "interpreter",
    "agency staff",
    "community member",
]

SYSTEM_TERMS = [
    "risk score",
    "priority score",
    "eligibility score",
    "low priority score",
    "high risk score",
    "housing allocation algorithm",
    "allegheny family screening tool",
    "automated housing inspection system",
    "housing prioritization system",
    "benefits eligibility verification engine",
    "fraud detection system",
    "family screening tool",
    "student support risk flag system",
    "student award eligibility portal",
    "traffic management camera system",
    "transit safety routing system",
    "workforce job matching system",
    "language access routing system",
    "emergency dispatch triage tool",
    "emergency dispatch triage assistant",
    "energy assistance forecasting tool",
    "community services intake system",
    "automated public service system",
    "waiting list",
    "screening tool",
    "routing system",
    "inspection system",
    "student support system",
    "benefits system",
    "housing inspection system",
    "traffic management system",
    "language access routing system",
    "transit safety incident classifier",
    "public housing inspection scheduler",
    "wage compliance risk model",
    "library resource recommendation tool",
    "emergency dispatch triage assistant",
]

PITTSBURGH_AGENCIES = [
    "Allegheny County Government",
    "Allegheny County Department of Human Services",
    "Pittsburgh Housing Authority",
    "Housing Authority of the City of Pittsburgh",
    "City of Pittsburgh Department of Permits, Licenses, and Inspections",
    "Allegheny County benefits office",
    "Pittsburgh Public Schools",
    "Pittsburgh Department of Mobility and Infrastructure",
    "Pittsburgh Regional Transit",
    "PA CareerLink Pittsburgh",
    "Pennsylvania Department of Labor and Industry",
    "City of Pittsburgh resident services office",
    "Allegheny County Emergency Services",
    "Allegheny County assistance office",
    "City of Pittsburgh community services office",
    "City of Pittsburgh public safety office",
    "City of Pittsburgh",
]

PITTSBURGH_LOCATIONS = [
    "Allegheny County",
    "Pittsburgh",
    "Downtown Pittsburgh",
    "Downtown",
    "East Liberty",
    "Homewood",
    "Oakland",
    "Squirrel Hill",
    "Hill District",
    "North Side",
    "South Side",
    "Bloomfield",
    "Garfield",
    "Larimer",
    "Lawrenceville",
    "Hazelwood",
    "Carrick",
    "Beechview",
    "Brookline",
    "Mount Washington",
    "Shadyside",
    "Manchester",
    "Strip District",
    "Forbes Avenue",
    "East Busway",
    "McKeesport",
    "Wilkinsburg",
    "Carrick",
    "Beechview",
]


def load_records(path: Path) -> list[dict]:
    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise ValueError("Input file must contain a JSON array.")
    output = []
    for index, record in enumerate(records, start=1):
        text = str(record.get("narrativeText") or "").strip()
        if not text:
            raise ValueError(f"Record {index} is missing narrativeText.")
        output.append(
            {
                "id": str(record.get("id") or f"record-{index}"),
                "title": record.get("title") or "",
                "narrativeText": text,
            }
        )
    return output


def round_score(value: float) -> float:
    return round(float(value or 0), 4)


def classify_impact(classifier, text: str) -> dict:
    descriptions = list(IMPACT_LABELS.values())
    result = classifier(
        text,
        candidate_labels=descriptions,
        hypothesis_template="This public service story has this impact: {}",
        multi_label=True,
    )
    scores_by_description = dict(zip(result["labels"], result["scores"]))
    evidence_scores = {
        key: round_score(scores_by_description.get(description, 0))
        for key, description in IMPACT_LABELS.items()
    }
    negative = evidence_scores["NEGATIVE"]
    positive = evidence_scores["POSITIVE"]
    unclear = evidence_scores["UNCLEAR"]
    mixed = evidence_scores["MIXED"]

    if unclear >= 0.9 and unclear >= max(negative, positive, mixed):
        classification = "UNCLEAR"
        confidence = unclear
    elif positive >= 0.65 and negative >= 0.65:
        classification = "MIXED"
        confidence = max(mixed, min(positive, negative))
    elif unclear >= 0.65 and max(negative, positive) < 0.5:
        classification = "UNCLEAR"
        confidence = unclear
    elif negative >= positive and negative >= unclear:
        classification = "NEGATIVE"
        confidence = negative
    elif positive >= negative and positive >= unclear:
        classification = "POSITIVE"
        confidence = positive
    else:
        classification = "UNCLEAR"
        confidence = unclear

    return {
        "aiImpactClassification": classification,
        "aiConfidenceScore": round_score(confidence),
        "humanReviewRequired": confidence < 0.85,
        "evidenceScores": evidence_scores,
    }


def find_theme_evidence(text: str, theme: str) -> list[str]:
    evidence = []
    lower_text = text.lower()
    for pattern in THEME_EVIDENCE.get(theme, []):
        match = re.search(pattern, lower_text)
        if match:
            evidence.append(match.group(0))
    return unique(evidence)


def detect_themes(classifier, text: str) -> list[dict]:
    descriptions = list(THEME_LABELS.values())
    result = classifier(
        text,
        candidate_labels=descriptions,
        hypothesis_template="This public service story shows this theme: {}",
        multi_label=True,
    )
    rows = []
    fallback_rows = []
    for description, score in zip(result["labels"], result["scores"]):
        theme = next((key for key, value in THEME_LABELS.items() if value == description), None)
        if theme:
            evidence = find_theme_evidence(text, theme)
            fallback_rows.append(
                {
                    "theme": theme,
                    "confidence": round_score(score),
                    "matchedEvidence": evidence[:3],
                }
            )
            if evidence and score >= 0.5:
                rows.append(
                    {
                        "theme": theme,
                        "confidence": round_score(score),
                        "matchedEvidence": evidence[:3],
                    }
                )
    rows.sort(key=lambda row: row["confidence"], reverse=True)
    if rows:
        return rows[:4]
    fallback_rows.sort(key=lambda row: row["confidence"], reverse=True)
    return fallback_rows[:2]


def normalize_entity(value):
    cleaned = re.sub(r"\s+", " ", str(value).strip())
    cleaned = re.sub(r"^the\s+", "", cleaned, flags=re.IGNORECASE)
    return cleaned


def unique(values):
    cleaned = [normalize_entity(value) for value in values if str(value).strip()]
    return list(dict.fromkeys(cleaned))


def phrase_in_text(text: str, phrase: str) -> bool:
    return re.search(rf"\b{re.escape(phrase)}\b", text, flags=re.IGNORECASE) is not None


def known_phrases(text: str, phrases: list[str]) -> list[str]:
    return [phrase for phrase in phrases if phrase_in_text(text, phrase)]


def compact_entities(values: list[str]) -> list[str]:
    cleaned = unique(values)
    output = []
    for value in cleaned:
        lower = value.lower()
        if any(other.lower() != lower and other.lower().endswith(lower) and len(other) > len(value) + 3 for other in cleaned):
            continue
        output.append(value)
    return output


def clean_system_phrase(value: str) -> str:
    phrase = normalize_entity(value)
    phrase = re.sub(r"^.*\bits\s+", "", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"^.*\bthe\s+", "", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"^.*\bto the\s+", "", phrase, flags=re.IGNORECASE)
    if re.search(r"\b(?:think|don't|doesn|didn|wasn|isn|aren)\b", phrase, flags=re.IGNORECASE):
        return ""
    if phrase.lower() in {"this tool", "the tool", "computer system", "system"}:
        return ""
    for known in SYSTEM_TERMS:
        if phrase_in_text(phrase, known):
            return known
    return phrase


def compact_systems(values: list[str]) -> list[str]:
    cleaned = unique(clean_system_phrase(value) for value in values)
    output = []
    for value in cleaned:
        lower = value.lower()
        if any(existing.lower() in lower or lower in existing.lower() for existing in output):
            continue
        output.append(value)
    return output


def extract_system_phrases(text: str) -> list[str]:
    matches = []
    patterns = [
        r"\b(?:automated\s+)?[A-Za-z][A-Za-z-]*(?:\s+[A-Za-z][A-Za-z-]*){0,5}\s+(?:system|tool|engine|model|algorithm|portal)\b",
        r"\b(?:low|high|higher|lower)?\s*(?:risk|priority|eligibility|inspection|safety)\s+score\b",
        r"\bhigh-risk label\b",
        r"\blow priority queue\b",
        r"\bautomated review\b",
        r"\bwaiting list\b",
    ]
    for pattern in patterns:
        matches.extend(re.findall(pattern, text, flags=re.IGNORECASE))
    matches.extend(known_phrases(text, SYSTEM_TERMS))
    return compact_systems(matches)


def extract_date_phrases(text: str) -> list[str]:
    matches = []
    patterns = [
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b",
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b",
        r"\b(?:Spring|Summer|Fall|Winter)\s+\d{4}\b",
        r"\b\d{4}\b",
    ]
    for pattern in patterns:
        matches.extend(re.findall(pattern, text, flags=re.IGNORECASE))
    return unique(matches)


def infer_roles(text: str, systems: list[str], agencies: list[str]) -> list[str]:
    lower = " ".join([text, *systems, *agencies]).lower()
    roles = []
    if "child welfare" in lower or "family screening" in lower or "cps" in lower:
        roles.append("cps worker")
    if "housing" in lower or "benefits" in lower or "voucher" in lower or "rental aid" in lower:
        roles.append("caseworker")
    if "school" in lower or "student" in lower:
        roles.append("school counselor")
    if "transit" in lower:
        roles.append("transit worker")
    if "dispatch" in lower or "emergency" in lower:
        roles.append("dispatcher")
    if "inspection" in lower:
        roles.append("inspector")
    if "careerlink" in lower or "job matching" in lower or "employment" in lower:
        roles.append("career center worker")
    if "language" in lower or "interpreter" in lower:
        roles.append("interpreter")
    if "community services" in lower or "library" in lower:
        roles.append("front desk worker")
    if "public safety" in lower:
        roles.append("public safety worker")
    return unique(roles)


def extract_entities(nlp, text: str) -> dict:
    doc = nlp(text)
    lower_text = text.lower()
    agencies = []
    locations = []
    dates = []
    for ent in doc.ents:
        if ent.label_ == "ORG":
            agencies.append(ent.text)
        if ent.label_ in {"GPE", "LOC", "FAC"}:
            locations.append(ent.text)
        if ent.label_ == "DATE":
            dates.append(ent.text)

    agencies.extend(
        re.findall(
            r"\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s+(?:Agency|Department|Office|Authority|Center|University|County)\b",
            text,
        )
    )

    agencies.extend(known_phrases(text, PITTSBURGH_AGENCIES))
    locations.extend(known_phrases(text, PITTSBURGH_LOCATIONS))
    systems = extract_system_phrases(text)
    agencies = [
        agency for agency in agencies
        if not re.search(r"\b(?:Algorithm|Tool|System|Engine|Portal|Score|Scheduler|Classifier|Model)\b", agency, flags=re.IGNORECASE)
        and agency.lower() not in {location.lower() for location in PITTSBURGH_LOCATIONS}
    ]
    locations = [
        location for location in locations
        if location not in agencies and not re.search(r"\b(?:Office|Department|Authority|Services|Government)\b", location, flags=re.IGNORECASE)
    ]
    roles = unique([term for term in ROLE_TERMS if term in lower_text] + infer_roles(text, systems, agencies))

    return {
        "agencies": compact_entities(agencies),
        "locations": compact_entities(locations),
        "systems": systems,
        "dates": compact_entities([*dates, *extract_date_phrases(text)]),
        "people_roles": roles,
    }


def build_keyword_candidates(nlp, text: str) -> list[str]:
    doc = nlp(text)
    lower_text = text.lower()
    candidates = []
    stop_edges = {"my", "our", "their", "this", "that", "his", "her", "a", "an", "the"}
    for chunk in doc.noun_chunks:
        phrase = re.sub(r"[^A-Za-z0-9\s-]", "", chunk.text.lower()).strip()
        words = [word for word in phrase.split() if word not in stop_edges]
        if 1 <= len(words) <= 3 and any(len(word) > 3 for word in words):
            candidates.append(" ".join(words))
    candidates.extend([term for term in SYSTEM_TERMS if term in lower_text])
    candidates.extend([term.lower() for term in PITTSBURGH_AGENCIES if term.lower() in lower_text])
    candidates.extend([term.lower() for term in PITTSBURGH_LOCATIONS if term.lower() in lower_text])
    candidates.extend(
        [
            "priority score",
            "waiting list",
            "language access",
            "benefits office",
            "traffic signal timing",
            "caseworker review",
            "automated notice",
            "high-risk label",
            "appeal process",
            "inspection complaint",
        ]
    )
    return unique(candidate for candidate in candidates if candidate in lower_text)


def extract_keywords(model, nlp, text: str) -> list[str]:
    candidates = build_keyword_candidates(nlp, text)
    if not candidates:
        candidates = None
    keywords = model.extract_keywords(
        text,
        candidates=candidates,
        keyphrase_ngram_range=(1, 3),
        stop_words="english",
        top_n=10,
        use_mmr=True,
        diversity=0.55,
    )
    ranked = [phrase for phrase, _score in keywords]
    if candidates:
        for candidate in candidates:
            if len(candidate.split()) > 1 and candidate not in ranked:
                ranked.append(candidate)
            if len(ranked) >= 10:
                break
    return ranked[:10]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ML Part 1 Task 2-5 on narrativeText samples.")
    parser.add_argument("--input", default="task2-results/sample-narratives.json")
    parser.add_argument("--output-dir", default="task2-5-results")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    records = load_records(input_path)

    print("Loading DeBERTa-v3 impact classifier...")
    impact_classifier = pipeline("zero-shot-classification", model=TASK2_MODEL, tokenizer=TASK2_MODEL, device=-1)
    print("Loading BART theme detector...")
    theme_classifier = pipeline("zero-shot-classification", model=TASK3_MODEL, tokenizer=TASK3_MODEL, device=-1)
    print("Loading spaCy entity model...")
    nlp = spacy.load("en_core_web_sm")
    print("Loading KeyBERT keyword model...")
    keyword_model = KeyBERT(model=TASK5_MODEL)

    task2_rows = []
    task3_rows = []
    task4_rows = []
    task5_rows = []
    combined_rows = []

    for record in records:
        print(f"Running {record['id']}...")
        text = record["narrativeText"]
        task2 = classify_impact(impact_classifier, text)
        task3 = detect_themes(theme_classifier, text)
        task4 = extract_entities(nlp, text)
        task5 = extract_keywords(keyword_model, nlp, text)

        base = {
            "id": record["id"],
            "title": record["title"],
            "inputField": "narrativeText",
        }
        task2_rows.append({**base, **task2})
        task3_rows.append({**base, "aiThemes": task3})
        task4_rows.append({**base, "aiExtractedExperiences": {"entities": task4}})
        task5_rows.append({**base, "aiExtractedExperiences": {"keywords": task5}})
        combined_rows.append(
            {
                **base,
                "narrativeText": text,
                **task2,
                "aiThemes": task3,
                "aiExtractedExperiences": {
                    "entities": task4,
                    "keywords": task5,
                },
            }
        )

    generated_at = datetime.now(timezone.utc).isoformat()
    outputs = {
        "task2-impact-classification-results.json": {
            "task": "Task 2: Impact Classification",
            "tool": "DeBERTa-v3 zero-shot classifier",
            "model": TASK2_MODEL,
            "inputField": "narrativeText",
            "outputFields": ["aiImpactClassification", "aiConfidenceScore"],
            "generatedAt": generated_at,
            "results": task2_rows,
        },
        "task3-theme-detection-results.json": {
            "task": "Task 3: Theme Detection",
            "tool": "BART zero-shot classifier",
            "model": TASK3_MODEL,
            "inputField": "narrativeText",
            "outputFields": ["aiThemes"],
            "generatedAt": generated_at,
            "results": task3_rows,
        },
        "task4-entity-extraction-results.json": {
            "task": "Task 4: Entity Extraction",
            "tool": "spaCy",
            "model": "en_core_web_sm",
            "inputField": "narrativeText",
            "outputFields": ["aiExtractedExperiences.entities"],
            "generatedAt": generated_at,
            "results": task4_rows,
        },
        "task5-keyword-extraction-results.json": {
            "task": "Task 5: Keyword Extraction",
            "tool": "KeyBERT",
            "model": TASK5_MODEL,
            "inputField": "narrativeText",
            "outputFields": ["aiExtractedExperiences.keywords"],
            "settings": {"top_n": 10, "keyphrase_ngram_range": [1, 3], "use_mmr": True, "diversity": 0.55},
            "generatedAt": generated_at,
            "results": task5_rows,
        },
        "task2-5-combined-results.json": {
            "task": "ML Part 1 Task 2-5",
            "inputField": "narrativeText",
            "generatedAt": generated_at,
            "results": combined_rows,
        },
    }

    (output_dir / "task2-5-input-narratives.json").write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    for file_name, payload in outputs.items():
        (output_dir / file_name).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Wrote {output_dir.resolve()}")


if __name__ == "__main__":
    main()
