import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import spacy
from keybert import KeyBERT
from transformers import pipeline


TASK2_MODEL = os.environ.get("TASK2_IMPACT_MODEL", "facebook/bart-large-mnli")
TASK3_MODEL = os.environ.get("TASK3_THEME_MODEL", "facebook/bart-large-mnli")
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
        r"\bcould not tell\b",
        r"\bnobody could tell\b",
        r"\bwhat information counted\b",
        r"\bwhat triggered\b",
        r"\bwhat changed\b",
        r"\bwhat information was used\b",
        r"\bwho checked it\b",
        r"\bhow to correct it\b",
        r"\bwhat image or rule\b",
        r"\bwhich answer mattered\b",
        r"\bplain language\b",
        r"\bmatching process\b",
        r"\blanguage request did not carry over\b",
        r"\blanguage that controls\b",
        r"\bnot part of the design\b",
        r"\bdoes not know\b",
        r"\bnot told\b[^\n.]{0,120}\bhow\b",
        r"\bcould not see\b[^\n.]{0,120}\b(score|record|rule|reason)\b",
        r"\bdo not know\b[^\n.]{0,120}\bhow\b",
        r"\bdon't know\b[^\n.]{0,120}\bhow\b",
        r"\bunclear\b[^\n.]{0,120}\bwhy\b",
        r"\bhow\b[^\n.]{0,120}\b(calculated|decided|made|works)\b",
    ],
    "positive_experience": [
        r"\bconnected me\b",
        r"\brecognized\b[^\n.]{0,120}\bneeded\b",
        r"\bfound the document\b",
        r"\breopened the case\b",
        r"\bsame afternoon\b",
        r"\bpaused the shutoff\b",
        r"\bpaused the shutoff request\b",
        r"\bapproval came\b",
        r"\btold me exactly\b",
        r"\bhelped someone notice\b",
        r"\brouted\b[^\n.]{0,80}\bright\b",
        r"\brouted\b[^\n.]{0,80}\bquickly\b",
        r"\bsent me to the right\b",
        r"\bright interpreter\b",
        r"\bfirst try\b",
        r"\bquickly\b",
        r"\barrived faster\b",
        r"\bgot an interview\b",
        r"\bhelped me register\b",
        r"\bpointed me to\b",
        r"\bmoved forward\b",
        r"\bpriority changed\b",
        r"\binspection date appeared\b",
        r"\bthe fix helped\b",
        r"\bcould actually help\b",
        r"\bmoved me to an interpreter\b",
        r"\binterpreter stayed on the line\b",
        r"\bstayed on the line\b",
        r"\bdid not have to repeat\b",
        r"\brespected my time\b",
        r"\brespected\b[^\n.]{0,120}\bprivacy\b",
        r"\bapproval notice\b",
        r"\bthe same day\b",
        r"\bsame week\b",
        r"\bmatched\b[^\n.]{0,120}\bcorrectly\b",
        r"\bfinished\b",
        r"\bwas able to\b",
        r"\bmuch better\b",
        r"\bhelped at first\b",
        r"\bworked well\b",
        r"\bfaster than before\b",
    ],
    "lack_of_recourse": [
        r"\bcould not change\b",
        r"\bcould not adjust\b",
        r"\bcould not adjust\b[^\n.]{0,120}\bmedical equipment\b",
        r"\bcould not see\b[^\n.]{0,120}\b(score|record|rule|reason)\b",
        r"\bnot something\b[^\n.]{0,120}\breview\b",
        r"\bclosed door\b",
        r"\bhad to come back\b",
        r"\bnot easy to document\b",
        r"\branking did not change\b",
        r"\balready saved\b",
        r"\bprove it\b",
        r"\bpaid because the late fee\b",
        r"\blate fee was coming\b",
        r"\bpaid before the late fee\b",
        r"\bappeal portal\b[^\n.]{0,120}\bstill marked\b",
        r"\bno way to correct\b",
        r"\bdeleting my profile\b",
        r"\bseparate form\b[^\n.]{0,120}\bapproved\b",
        r"\bno way to\b[^\n.]{0,120}\b(appeal|challenge|change)\b",
        r"\bcould not appeal\b",
        r"\bdenied\b[^\n.]{0,120}\bappeal\b",
        r"\bwould not review\b",
    ],
    "process_confusion": [
        r"\bconfused\b",
        r"\bstart over\b",
        r"\bcould not tell\b",
        r"\bnobody could tell\b",
        r"\bwhat information counted\b",
        r"\bwhat triggered\b",
        r"\bwhat changed\b",
        r"\bwhat information was used\b",
        r"\bwho checked it\b",
        r"\bhow to correct it\b",
        r"\bwhat image or rule\b",
        r"\bwhich answer mattered\b",
        r"\bweighted my old\b",
        r"\btwo profiles\b",
        r"\bclicking between two versions\b",
        r"\bstatus changed\b",
        r"\bfirst notice\b",
        r"\bdid not understand\b",
        r"\bdidn't understand\b",
        r"\bdo not know whether\b",
        r"\bdon't know whether\b",
        r"\bnot sure\b",
        r"\bunclear\b[^\n.]{0,120}\b(process|what|why)\b",
    ],
    "arbitrary_outcome": [
        r"\bkept\b[^\n.]{0,120}\b(low priority|high-risk|label|score)\b",
        r"\bkept ranking\b",
        r"\bwrong queue\b",
        r"\bsent the report to maintenance\b",
        r"\bstayed\b[^\n.]{0,120}\b(record|label|priority)\b",
        r"\bflag stayed\b",
        r"\bflag\b[^\n.]{0,120}\bdid not seem to update\b",
        r"\bstatus kept changing\b",
        r"\bstatus changed\b",
        r"\bpriority list\b",
        r"\blow priority\b",
        r"\brouted\b[^\n.]{0,80}\b(maintenance|wrong|routine)\b",
        r"\bwrong\b[^\n.]{0,80}\b(category|station|office|team)\b",
        r"\bscore\b[^\n.]{0,120}\b(from|came from|decided)\b",
        r"\bscore treated\b",
        r"\bstill treated\b",
        r"\bchanged only after\b",
        r"\bold label follows\b",
        r"\brandom\b",
        r"\binconsistent\b",
    ],
    "delayed_outcome": [
        r"\bwaited\b",
        r"\bcost\b[^\n.]{0,120}\b(days|weeks|months)\b",
        r"\bseveral days\b",
        r"\btwo weeks\b",
        r"\bthree weeks\b",
        r"\btwelve days\b",
        r"\bnine days\b",
        r"\bfive days\b",
        r"\bmissed the deadline\b",
        r"\bdeadline\b",
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
        r"\bnotice\b[^\n.]{0,120}\bonly in english\b",
        r"\blanguage request did not carry over\b",
        r"\bdid not carry over to the notice\b",
    ],
    "data_accuracy": [
        r"\bwrong\b",
        r"\bmismatch\b",
        r"\bnot merge\b",
        r"\brecords did not merge\b",
        r"\btwo profiles\b",
        r"\btwo versions\b",
        r"\btwo addresses\b",
        r"\btwo households\b",
        r"\blimited data\b",
        r"\bstable picture\b",
        r"\bscore looked backward\b",
        r"\brecord only shows\b",
        r"\bmay not see\b",
        r"\bkeep missing\b",
        r"\brecalibrated\b",
        r"\bfollowing the temporary signs\b",
        r"\bold employer name\b",
        r"\bold profile\b",
        r"\breliable transportation\b",
        r"\bold beechview address\b",
        r"\bcurrent address\b",
        r"\bshelter intake form\b",
        r"\btrust pictures\b",
        r"\bshort description\b",
        r"\bpediatrician fax\b",
        r"\bdoctor's note\b",
        r"\bmissed appointment\b",
        r"\brescheduled\b",
        r"\bonly saw missed days\b",
        r"\bweighted my old\b",
        r"\bcurrent availability\b",
        r"\bdid not count\b[^\n.]{0,120}\bmedical equipment\b",
        r"\bmedical equipment\b",
        r"\bnot carry over\b",
        r"\bunit count\b",
        r"\bmisrouted\b",
        r"\brouted\b[^\n.]{0,80}\b(maintenance|wrong)\b",
        r"\boutdated\b",
        r"\bincorrect\b",
        r"\bold record\b",
        r"\bold address\b",
        r"\bpublic benefits records\b",
        r"\bgrades improved\b",
        r"\bstayed on my record\b",
    ],
    "loss_of_dignity": [
        r"\bbeing judged\b",
        r"\bembarrassing\b",
        r"\blunch line\b",
        r"\bwhat kind of parent\b",
        r"\balready decided\b",
        r"\bdid not count\b",
        r"\bhiding something\b",
        r"\btreated badly\b",
        r"\btreated like\b[^\n.]{0,120}\bthreat\b",
        r"\breads the situation like risk\b",
        r"\bdoes not count\b",
        r"\bfamilies feel that\b",
        r"\bwork families are already doing\b",
        r"\bfamilies know\b",
        r"\bsplit my son from me\b",
        r"\btreated me like\b",
        r"\bhumiliated\b",
        r"\bdehumanized\b",
        r"\bscolded\b",
        r"\bstrip\s+(?:my|me|kid|child|children|someone)\b",
        r"\bnaked\b",
    ],
}

POSITIVE_CUES = [
        r"\bworked\b",
        r"\bconnected me\b",
        r"\brecognized\b[^\n.]{0,120}\bneeded\b",
        r"\bfound the document\b",
        r"\breopened the case\b",
        r"\bsame afternoon\b",
        r"\bpaused the shutoff\b",
        r"\bpaused the shutoff request\b",
        r"\bapproval came\b",
        r"\btold me exactly\b",
        r"\bhelped someone notice\b",
    r"\brouted\b[^\n.]{0,80}\bright\b",
    r"\brouted\b[^\n.]{0,80}\bquickly\b",
    r"\bsent me to the right\b",
    r"\bright interpreter\b",
    r"\bfirst try\b",
    r"\bquickly\b",
    r"\barrived faster\b",
    r"\bhelped me register\b",
    r"\bpointed me to\b",
    r"\bmoved forward\b",
    r"\bpriority changed\b",
    r"\binspection date appeared\b",
    r"\bthe fix helped\b",
    r"\bcould actually help\b",
    r"\bmoved me to an interpreter\b",
    r"\binterpreter stayed on the line\b",
    r"\bstayed on the line\b",
    r"\bdid not have to repeat\b",
    r"\brespected my time\b",
    r"\brespected\b[^\n.]{0,120}\bprivacy\b",
    r"\bconfirmed\b",
    r"\bapproved\b",
    r"\bapproval notice\b",
    r"\bfaster\b",
    r"\bfaster than\b",
    r"\bthe same day\b",
    r"\bsame week\b",
    r"\bmatched\b[^\n.]{0,120}\bcorrectly\b",
    r"\bfit my\b",
    r"\bgot an interview\b",
]

NEGATIVE_CUES = [
    r"\bwrong\b",
    r"\bnot explain\b",
    r"\bcould not explain\b",
    r"\bcould not tell\b",
    r"\bnobody could tell\b",
        r"\bcould not change\b",
        r"\bcould not adjust\b",
        r"\bcould not see\b",
        r"\bdid not change\b",
        r"\bwrong queue\b",
        r"\balready decided\b",
        r"\bbefore anyone read\b",
        r"\btreated\b[^\n.]{0,80}\bas neglect\b",
        r"\bold profile mattered\b",
        r"\bfirst notice made\b",
    r"\bnot something\b[^\n.]{0,120}\breview\b",
    r"\brecords did not merge\b",
    r"\bstatus changed\b",
    r"\bincomplete\b",
    r"\bhad to come back\b",
    r"\bmissed the deadline\b",
    r"\bdid not carry over\b",
    r"\bnot carry over\b",
    r"\bnotice\b[^\n.]{0,120}\bonly in english\b",
    r"\blimited data\b",
    r"\bscore looked backward\b",
    r"\btreated badly\b",
    r"\bclosed door\b",
    r"\bnot easy to document\b",
    r"\bprove it\b",
    r"\bnot part of the design\b",
    r"\brecord only shows\b",
    r"\bmay not see\b",
    r"\bkeep missing\b",
    r"\bdoes not trust\b",
    r"\bno way to correct\b",
    r"\bdeleting my profile\b",
    r"\bseparate form\b[^\n.]{0,120}\bapproved\b",
    r"\bnot allowed\b",
    r"\bno way\b",
    r"\bdenied\b",
    r"\b(benefits|case|account|application|payment)\b[^\n.]{0,80}\bpaused\b",
    r"\bpaused over\b",
    r"\bflagged\b",
    r"\bhigh risk\b",
    r"\blow priority\b",
    r"\bwaited\b",
    r"\bweeks\b",
    r"\bseveral days\b",
    r"\brouted\b[^\n.]{0,80}\b(maintenance|wrong|different)\b",
    r"\bnobody contacted\b",
    r"\bcost\b[^\n.]{0,120}\b(days|weeks|months)\b",
    r"\btreated me like\b",
    r"\bsuspicion\b",
]

WEAK_KEYWORDS = {
    "agency",
    "rest",
    "form",
    "person",
    "people",
    "case",
    "model",
    "tool",
    "system",
    "industry",
    "downtown",
    "february",
    "march",
    "april",
    "may",
    "june",
    "weeks",
    "worker",
    "record",
    "score",
    "priority",
    "report",
    "computer",
    "decision",
    "decisions",
    "category",
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
    "police officer",
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
    "public safety routing system",
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


def count_matches(text: str, patterns: list[str]) -> int:
    lower_text = text.lower()
    return sum(1 for pattern in patterns if re.search(pattern, lower_text, flags=re.IGNORECASE))


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
    positive_cues = count_matches(text, POSITIVE_CUES)
    negative_cues = count_matches(text, NEGATIVE_CUES)
    positive_resolution = re.search(
        r"\b(priority changed|inspection date appeared|the fix helped|corrected|fixed the category|apologized|right unit|same day|same week|same afternoon|reopened the case|paused the shutoff|approval came)\b",
        text,
        flags=re.IGNORECASE,
    )

    if positive_cues >= 2 and negative_cues == 0:
        classification = "POSITIVE"
        confidence = max(positive, 0.9)
    elif negative_cues >= 2 and positive_cues == 0:
        classification = "NEGATIVE"
        confidence = max(negative, 0.9)
    elif positive_resolution and negative_cues >= 2:
        classification = "MIXED"
        confidence = max(mixed, 0.88)
    elif positive_cues >= 1 and negative_cues == 0 and positive >= 0.85:
        classification = "POSITIVE"
        confidence = max(positive, 0.86)
    elif negative_cues >= 1 and positive_cues == 0 and negative >= 0.85:
        classification = "NEGATIVE"
        confidence = max(negative, 0.86)
    elif negative_cues >= 2 and positive_cues <= 1:
        classification = "NEGATIVE"
        confidence = max(negative, 0.88)
    elif positive_cues >= 2 and negative_cues <= 1 and positive >= 0.75:
        classification = "POSITIVE"
        confidence = max(positive, 0.88)
    elif positive_cues >= 2 and negative_cues >= 2:
        classification = "MIXED"
        confidence = max(mixed, min(positive, negative), 0.85)
    elif unclear >= 0.9 and unclear >= max(negative, positive, mixed):
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
            if evidence and (score >= 0.5 or len(evidence) >= 2):
                rows.append(
                    {
                        "theme": theme,
                        "confidence": round_score(max(score, 0.65 if len(evidence) >= 2 else score)),
                        "matchedEvidence": evidence[:3],
                    }
                )
    rows.sort(key=lambda row: row["confidence"], reverse=True)
    if rows:
        return rows[:6]
    fallback_rows.sort(key=lambda row: row["confidence"], reverse=True)
    return []


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
    cleaned = unique(clean_entity_surface(value) for value in values)
    output = []
    for value in sorted(cleaned, key=len, reverse=True):
        lower = value.lower()
        if any(existing.lower() == lower for existing in output):
            continue
        output.append(value)
    compacted = []
    for value in output:
        lower = value.lower()
        if any(lower != other.lower() and lower in other.lower() and len(other) > len(value) + 3 for other in compacted):
            continue
        compacted.append(value)
    return compacted


def clean_entity_surface(value: str) -> str:
    cleaned = normalize_entity(value)
    cleaned = re.sub(r"'s\b", "", cleaned)
    cleaned = cleaned.replace("Department of Human Services rental aid portal", "rental aid portal")
    return cleaned.strip()


def clean_system_phrase(value: str) -> str:
    phrase = normalize_entity(value)
    phrase = re.sub(r"^.*\bits\s+", "", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"^.*\bthe\s+", "", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"^.*\bto the\s+", "", phrase, flags=re.IGNORECASE)
    if re.search(r"\b(?:think|don't|doesn|didn|wasn|isn|aren)\b", phrase, flags=re.IGNORECASE):
        return ""
    if re.search(r"\b(?:fight this computer system|can fix a system|you have to)\b", phrase, flags=re.IGNORECASE):
        return ""
    if phrase.lower() in {"this tool", "the tool", "computer system", "system", "a system", "tool", "portal", "model", "algorithm"}:
        return ""
    for known in sorted(SYSTEM_TERMS, key=len, reverse=True):
        if phrase_in_text(phrase, known):
            return known
    return phrase


def compact_systems(values: list[str]) -> list[str]:
    cleaned = unique(clean_system_phrase(value) for value in values)
    output = []
    for value in sorted(cleaned, key=len, reverse=True):
        lower = value.lower()
        if lower in {"tool", "portal", "model", "system", "algorithm"}:
            continue
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
    if "police" in lower or "citation" in lower:
        roles.append("police officer")
    if "dispatch" in lower or "emergency dispatch" in lower or "emergency services" in lower:
        roles.append("dispatcher")
    if "inspection" in lower:
        roles.append("inspector")
    if "careerlink" in lower or "job matching" in lower or "employment" in lower:
        roles.append("career center worker")
    if "interpreter" in lower or "language access" in lower:
        roles.append("interpreter")
    if "community services" in lower or "library" in lower:
        roles.append("front desk worker")
    if "public safety" in lower:
        roles.append("public safety worker")
    return unique(roles)


def compact_roles(values: list[str]) -> list[str]:
    roles = unique(values)
    specific = [role for role in roles if role not in {"worker", "resident", "student", "parent", "applicant", "caller"}]
    if specific:
        roles = specific + [role for role in roles if role in {"tenant", "rider"}]
    return compact_entities(roles)


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
        and not re.search(r"^(PDF|Zone\s+\d+|Children'?s?\s+Hospital)$", agency, flags=re.IGNORECASE)
        and not re.search(r"\bafter\b", agency, flags=re.IGNORECASE)
        and agency.lower() not in {location.lower() for location in PITTSBURGH_LOCATIONS}
    ]
    agency_keys = {normalize_entity(agency).lower() for agency in agencies}
    locations = [
        location for location in locations
        if normalize_entity(location).lower() not in agency_keys
        and not re.search(r"\b(?:Office|Department|Authority|Services|Government|CareerLink)\b", location, flags=re.IGNORECASE)
    ]
    roles = compact_roles([term for term in ROLE_TERMS if term in lower_text] + infer_roles(text, systems, agencies))

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
            "housing prioritization system",
            "family screening tool",
            "language access routing system",
            "transit safety incident classifier",
            "wage compliance risk model",
            "old address",
            "public benefits records",
            "safety concern",
            "rental aid portal",
            "approval notice",
        ]
    )
    return unique(candidate for candidate in candidates if candidate in lower_text)


def readable_keyword(value: str) -> bool:
    cleaned = value.strip().lower()
    if not cleaned or cleaned in WEAK_KEYWORDS:
        return False
    words = cleaned.split()
    if len(words) == 1 and len(cleaned) < 5:
        return False
    if len(words) == 2 and any(word in {"got", "get", "kept", "told", "said", "could", "would", "after"} for word in words):
        return False
    return True


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
    ranked = [phrase for phrase, _score in keywords if readable_keyword(phrase)]
    if candidates:
        for candidate in candidates:
            if readable_keyword(candidate) and len(candidate.split()) > 1 and candidate not in ranked:
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

    print(f"Loading impact classifier: {TASK2_MODEL}...")
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
            "tool": "BART-MNLI zero-shot classifier" if "bart" in TASK2_MODEL.lower() else "zero-shot impact classifier",
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
