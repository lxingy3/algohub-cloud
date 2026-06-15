import os
import re
from functools import lru_cache
from typing import Any

import spacy
from fastapi import FastAPI, Header, HTTPException
from keybert import KeyBERT
from pydantic import BaseModel


app = FastAPI(title="AlgoStories ML Worker")

AGENCY_PATTERNS = [
    "CPS",
    "child protective services",
    "child welfare",
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
    "screening tool",
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
]


class TextRequest(BaseModel):
    text: str
    top_n: int | None = 10
    use_mmr: bool | None = True


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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
        elif ent.label_ in {"GPE", "LOC", "FAC"}:
            entities["locations"].append(ent.text)
        elif ent.label_ in {"DATE", "TIME"}:
            entities["dates"].append(ent.text)
        elif ent.label_ in {"PERSON"}:
            entities["people_roles"].append(ent.text)

    lower = text.lower()
    entities["agencies"].extend(find_phrases(text, lower, AGENCY_PATTERNS))
    entities["systems"].extend(find_phrases(text, lower, SYSTEM_PATTERNS))
    entities["people_roles"].extend(find_phrases(text, lower, ROLE_PATTERNS))

    return {"entities": {key: unique(values) for key, values in entities.items()}}


@app.post("/keybert-keywords")
def keybert_keywords(payload: TextRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    text = clean_text(payload.text)
    if not text:
        return {"keywords": []}

    top_n = max(1, min(int(payload.top_n or 10), 20))
    keywords = get_keybert().extract_keywords(
        text,
        keyphrase_ngram_range=(1, 3),
        stop_words="english",
        top_n=top_n,
        use_mmr=bool(payload.use_mmr),
        diversity=0.7,
    )

    return {
        "keywords": [
            {"keyword": phrase, "score": round(float(score), 4)}
            for phrase, score in keywords
            if phrase
        ]
    }


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def empty_entities() -> dict[str, list[str]]:
    return {
        "agencies": [],
        "locations": [],
        "systems": [],
        "dates": [],
        "people_roles": [],
    }


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
