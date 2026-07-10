import os
import re
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import spacy
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from faster_whisper import WhisperModel
from keybert import KeyBERT
from pydantic import BaseModel
from transformers import pipeline


app = FastAPI(title="AlgoStories ML Worker")

TASK2_MODEL = os.environ.get("TASK2_IMPACT_MODEL", "facebook/bart-large-mnli")
TASK3_MODEL = os.environ.get("TASK3_THEME_MODEL", "facebook/bart-large-mnli")
TASK1_MODEL = os.environ.get("TASK1_WHISPER_MODEL", "small")
TASK1_LANGUAGE = os.environ.get("TASK1_WHISPER_LANGUAGE") or None
SUPPORTED_MEDIA_EXTENSIONS = {".wav", ".mp3", ".webm", ".flac", ".ogg", ".m4a", ".mp4", ".mov", ".m4v", ".ogv"}
TERMINAL_PUNCTUATION = (".", "?", "!")
CONTINUATION_WORDS = {
    "and",
    "but",
    "or",
    "for",
    "nor",
    "so",
    "yet",
    "because",
    "while",
    "when",
    "where",
    "which",
    "who",
    "whose",
    "that",
    "than",
    "then",
    "to",
    "of",
    "in",
    "on",
    "at",
    "by",
    "from",
    "with",
    "between",
    "around",
    "under",
    "over",
    "into",
    "through",
    "as",
}

AGENCY_PATTERNS = [
    "CPS",
    "child protective services",
    "child welfare",
    "Pittsburgh Housing Authority",
    "Housing Authority of the City of Pittsburgh",
    "Allegheny County Department of Human Services",
    "Allegheny County benefits office",
    "Pittsburgh Public Schools",
    "Pittsburgh Regional Transit",
    "housing authority",
    "public agency",
    "benefits office",
    "school district",
    "police department",
    "labor department",
    "transit authority",
]

SYSTEM_PATTERNS = [
    "algorithm",
    "automated system",
    "automated housing inspection system",
    "housing inspection system",
    "language access routing system",
    "student support system",
    "benefits eligibility verification engine",
    "transit safety routing system",
    "traffic management system",
    "screening tool",
    "priority score",
    "low priority score",
    "low priority queue",
    "high-risk label",
    "risk score",
    "risk assessment",
    "eligibility system",
    "routing system",
    "verification engine",
    "fraud detection system",
    "family screening tool",
]

ROLE_PATTERNS = [
    "caseworker",
    "screeners",
    "supervisor",
    "worker",
    "tenant",
    "resident",
    "student",
    "parent",
    "applicant",
    "rider",
    "caseworker",
    "counselor",
    "teacher",
    "interpreter",
    "benefits worker",
    "transit worker",
]

LOCATION_PATTERNS = [
    "Allegheny County",
    "Pittsburgh",
    "Downtown Pittsburgh",
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
]

ISSUE_PATTERNS = [
    "mold",
    "broken heat",
    "unsafe housing",
    "food assistance",
    "benefits application",
    "outdated income record",
    "extra review",
    "safety report",
    "complaint categories",
    "location history",
    "zip code",
    "missed assignments",
    "grades improved",
    "appeal",
    "algorithm involved",
]


class TextRequest(BaseModel):
    text: str
    top_n: int | None = 10
    use_mmr: bool | None = True


class ZeroShotRequest(BaseModel):
    text: str
    candidate_labels: list[str]
    hypothesis_template: str | None = "This example is {}."
    multi_label: bool | None = True


def require_token(authorization: str | None) -> None:
    expected = os.environ.get("ML_WORKER_TOKEN")
    if not expected:
        return
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@lru_cache(maxsize=1)
def get_nlp():
    return spacy.load("en_core_web_sm")


@lru_cache(maxsize=1)
def get_keybert():
    return KeyBERT("sentence-transformers/all-MiniLM-L6-v2")


@lru_cache(maxsize=1)
def get_impact_classifier():
    return pipeline("zero-shot-classification", model=TASK2_MODEL, device=-1)


@lru_cache(maxsize=1)
def get_bart_classifier():
    return pipeline("zero-shot-classification", model=TASK3_MODEL, device=-1)


@lru_cache(maxsize=1)
def get_whisper_model():
    return WhisperModel(TASK1_MODEL, device="cpu", compute_type="int8")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="audio file is required")
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="audio file must be under 50 MB")

    suffix = Path(file.filename or "audio").suffix.lower()
    if suffix not in SUPPORTED_MEDIA_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Task 1 supports WAV, MP3, WebM, FLAC, OGG, M4A, MP4, MOV, M4V, and OGV files")
    with TemporaryDirectory(prefix="algostories-task1-") as work_dir:
        input_path = Path(work_dir) / f"input{suffix}"
        input_path.write_bytes(file_bytes)
        segments, info = get_whisper_model().transcribe(
            str(input_path),
            language=TASK1_LANGUAGE,
            beam_size=5,
            vad_filter=True,
        )

        raw_segments = []
        transcript_parts = []
        for segment in segments:
            text = clean_text(segment.text)
            if not text:
                continue
            transcript_parts.append(text)
            raw_segments.append(
                {
                    "start": round(float(segment.start), 2),
                    "end": round(float(segment.end), 2),
                    "text": text,
                }
            )

    raw_transcript = clean_text(" ".join(transcript_parts))
    readable_transcript, sentence_segments = build_readable_task1_output(raw_segments)
    return {
        "task": "Task 1: audio transcription",
        "inputKind": "audio",
        "inputFile": file.filename or "uploaded audio",
        "provider": "hf-space-faster-whisper",
        "model": TASK1_MODEL,
        "tool": TASK1_MODEL,
        "status": "COMPLETED" if raw_transcript else "EMPTY",
        "language": getattr(info, "language", None),
        "languageProbability": round(float(getattr(info, "language_probability", 0) or 0), 4),
        "durationSeconds": round(float(getattr(info, "duration", 0) or 0), 2),
        "transcript": readable_transcript,
        "rawTranscript": raw_transcript,
        "segments": sentence_segments,
        "sentenceSegments": sentence_segments,
        "rawSegments": raw_segments,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "outputFormat": "transcript and segments are sentence-smoothed; rawTranscript/rawSegments keep the original Whisper time chunks",
    }


@app.post("/impact-classification")
def impact_classification(payload: ZeroShotRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    return run_zero_shot(get_impact_classifier(), payload)


@app.post("/bart-themes")
def bart_themes(payload: ZeroShotRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    return run_zero_shot(get_bart_classifier(), payload)


@app.post("/spacy-entities")
def spacy_entities(payload: TextRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    text = clean_text(payload.text)
    if not text:
        return {"entities": empty_entities()}

    doc = get_nlp()(text)
    entities = empty_entities()

    for ent in doc.ents:
        if ent.label_ in {"ORG"}:
            entities["agencies"].append(ent.text)
        elif ent.label_ == "PERSON":
            entities["people"].append(ent.text)
        elif ent.label_ in {"GPE", "LOC", "FAC"}:
            entities["locations"].append(ent.text)
        elif ent.label_ in {"DATE", "TIME"}:
            entities["dates"].append(ent.text)

    lower = text.lower()
    entities["agencies"].extend(find_phrases(text, lower, AGENCY_PATTERNS))
    entities["locations"].extend(find_phrases(text, lower, LOCATION_PATTERNS))
    entities["systems"].extend(find_phrases(text, lower, SYSTEM_PATTERNS))
    entities["dates"].extend(extract_date_phrases(text))
    entities["people_roles"].extend(find_phrases(text, lower, ROLE_PATTERNS))
    entities["addresses"].extend(re.findall(r"\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way)\b", text, flags=re.IGNORECASE))

    return {"entities": normalize_entities(entities)}


@app.post("/keybert-keywords")
def keybert_keywords(payload: TextRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    text = clean_text(payload.text)
    if not text:
        return {"keywords": []}

    top_n = max(1, min(int(payload.top_n or 10), 20))
    candidates = keyword_candidates(text)
    keywords = get_keybert().extract_keywords(
        text,
        candidates=candidates or None,
        keyphrase_ngram_range=(1, 3),
        stop_words="english",
        top_n=top_n,
        use_mmr=bool(payload.use_mmr),
        diversity=0.55,
    )

    return {
        "keywords": [
            {"keyword": phrase, "score": round(float(score), 4)}
            for phrase, score in keywords
            if phrase
        ]
    }


def keyword_candidates(text: str) -> list[str]:
    doc = get_nlp()(text)
    candidates: list[str] = []
    for chunk in doc.noun_chunks:
        phrase = clean_keyword(chunk.text)
        if phrase:
            candidates.append(phrase)
    for ent in doc.ents:
        if ent.label_ in {"ORG", "GPE", "LOC", "FAC", "PRODUCT", "EVENT", "WORK_OF_ART"}:
            phrase = clean_keyword(ent.text)
            if phrase:
                candidates.append(phrase)
    lower = text.lower()
    for phrase in AGENCY_PATTERNS + LOCATION_PATTERNS + SYSTEM_PATTERNS + ISSUE_PATTERNS + ROLE_PATTERNS:
        if phrase.lower() in lower:
            cleaned = clean_keyword(match_original_case(text, phrase))
            if cleaned:
                candidates.append(cleaned)
    return unique(candidates)


def clean_keyword(value: str) -> str:
    phrase = re.sub(r"[^A-Za-z0-9\s'-]", "", str(value or "")).strip().lower()
    words = [word for word in phrase.split() if word not in {"a", "an", "the", "this", "that", "my", "your", "his", "her", "their", "our"}]
    if not words or len(words) > 4:
        return ""
    if all(len(word) <= 2 for word in words):
        return ""
    return " ".join(words)


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def run_zero_shot(classifier: Any, payload: ZeroShotRequest) -> dict[str, Any]:
    text = clean_text(payload.text)
    labels = [clean_text(label) for label in payload.candidate_labels if clean_text(label)]
    if not text or not labels:
        raise HTTPException(status_code=400, detail="text and candidate_labels are required")

    output = classifier(
        text,
        candidate_labels=labels,
        hypothesis_template=payload.hypothesis_template or "This example is {}.",
        multi_label=bool(payload.multi_label),
    )
    return {
        "sequence": output.get("sequence", text),
        "labels": output.get("labels", []),
        "scores": [round(float(score), 6) for score in output.get("scores", [])],
    }


def build_readable_task1_output(raw_segments: list[dict[str, Any]]) -> tuple[str, list[dict[str, Any]]]:
    sentence_segments = []
    current_parts = []
    current_start = None
    current_end = None

    for index, segment in enumerate(raw_segments):
        text = clean_text(segment.get("text", ""))
        if not text:
            continue
        if current_start is None:
            current_start = segment.get("start")
        current_end = segment.get("end")
        current_parts.append(text)

        next_text = raw_segments[index + 1].get("text") if index + 1 < len(raw_segments) else None
        if should_continue_task1(text, next_text):
            continue

        sentence_segments.append(
            {
                "start": current_start,
                "end": current_end,
                "text": sentence_case_task1(" ".join(current_parts)),
            }
        )
        current_parts = []
        current_start = None
        current_end = None

    if current_parts:
        sentence_segments.append(
            {
                "start": current_start,
                "end": current_end,
                "text": sentence_case_task1(" ".join(current_parts)),
            }
        )

    readable_transcript = clean_text(" ".join(segment["text"] for segment in sentence_segments))
    return readable_transcript, sentence_segments


def should_continue_task1(current_text: str, next_text: str | None) -> bool:
    text = clean_text(current_text)
    if not text:
        return True
    if text.endswith(TERMINAL_PUNCTUATION):
        return False
    if text.endswith((",", ";", ":", "-", "—")):
        return True
    if not next_text:
        return False
    first_word_raw = clean_text(next_text).split(" ", 1)[0].strip("\"'“”’()[]{}")
    first_word = first_word_raw.lower()
    return first_word in CONTINUATION_WORDS or (first_word_raw[:1].islower() and first_word != "i")


def sentence_case_task1(value: str) -> str:
    sentence = clean_text(value)
    if not sentence:
        return sentence
    if not sentence.endswith(TERMINAL_PUNCTUATION):
        sentence += "."
    return sentence[0].upper() + sentence[1:]


def empty_entities() -> dict[str, list[str]]:
    return {
        "agencies": [],
        "locations": [],
        "systems": [],
        "dates": [],
        "people_roles": [],
        "people": [],
        "addresses": [],
    }


def extract_date_phrases(text: str) -> list[str]:
    pattern = r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b|\b(?:last year|weeks|months|one day|today|yesterday|tomorrow)\b"
    return re.findall(pattern, text, flags=re.IGNORECASE)


def normalize_entities(entities: dict[str, list[str]]) -> dict[str, list[str]]:
    normalized = {key: unique([clean_entity(value) for value in values]) for key, values in entities.items()}
    for key in ["agencies", "locations", "systems"]:
        normalized[key] = compact_entities(normalized[key])
    return normalized


def clean_entity(value: str) -> str:
    return re.sub(r"^the\s+", "", clean_text(value), flags=re.IGNORECASE)


def compact_entities(values: list[str]) -> list[str]:
    cleaned = unique(values)
    result = []
    for value in cleaned:
        key = value.lower()
        if any(other.lower() != key and other.lower().endswith(key) and len(other) > len(value) + 3 for other in cleaned):
            continue
        result.append(value)
    return result


def find_phrases(original: str, lower: str, phrases: list[str]) -> list[str]:
    found = []
    for phrase in phrases:
        if phrase.lower() in lower:
            found.append(match_original_case(original, phrase))
    return found


def match_original_case(text: str, phrase: str) -> str:
    match = re.search(re.escape(phrase), text, flags=re.IGNORECASE)
    return match.group(0) if match else phrase


def unique(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        item = clean_text(value)
        key = item.lower()
        if item and key not in seen:
            seen.add(key)
            result.append(item)
    return result
