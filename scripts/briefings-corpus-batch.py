import argparse
import hashlib
import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


DEFAULT_MODEL = "Qwen/Qwen3-Embedding-0.6B"
STOPWORDS = {
    "the", "and", "for", "that", "this", "with", "from", "was", "were", "our", "your", "their", "into",
    "about", "after", "algorithm", "automated", "because", "before", "could", "have", "system", "there",
    "without", "worker", "score", "said", "pittsburgh", "allegheny", "county", "2026", "did", "office", "like",
}
SYNTHETIC_RECORDS = [
    ("housing-1", "Housing applicants described a waiting list score that changed without explanation and delayed placement."),
    ("housing-2", "A tenant could not see why the housing priority score dropped after submitting updated documents."),
    ("housing-3", "The housing portal ranked the family lower and no worker could explain which record mattered."),
    ("child-1", "A parent said a family screening score triggered a child welfare visit before anyone checked the context."),
    ("child-2", "The screening tool marked the family high risk and the parent had no clear appeal path."),
    ("child-3", "A child welfare risk score followed the family even after the caseworker corrected the record."),
    ("jobs-1", "A job matching system routed a worker to openings that did not match their skills or schedule."),
    ("jobs-2", "The employment platform helped a resident find an interview faster after matching their experience."),
    ("traffic-1", "A traffic camera notice arrived late and the driver could not dispute the automated flag."),
]


def clean_label(words):
    useful = [
        word for word in words
        if word and not word.isdigit() and word.lower() not in STOPWORDS
    ]
    label = " / ".join(useful[:4]).strip()
    return label or "suggested topic"


def topic_id_or_none(topic_id):
    return None if topic_id is None or int(topic_id) < 0 else int(topic_id)


def min_cluster_size(count):
    return max(2, min(10, round(count * 0.06)))


def read_json(path):
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path, payload):
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def keyword_label(texts, indexes):
    words = []
    for index in indexes:
        words.extend(re.findall(r"[a-z][a-z'-]{3,}", texts[index].lower()))
    stop = {
        *STOPWORDS,
    }
    ranked = [word for word, _count in Counter(word for word in words if word not in stop).most_common(6)]
    return clean_label(ranked)


def keybert_keywords(keyword_model, texts, indexes):
    if keyword_model is None:
        return []
    topic_text = " ".join(texts[index] for index in indexes)
    try:
        rows = keyword_model.extract_keywords(
            topic_text,
            keyphrase_ngram_range=(1, 3),
            stop_words="english",
            use_mmr=True,
            diversity=0.45,
            top_n=10,
        )
    except Exception:
        return []
    return [
        keyword for keyword, _score in rows
        if keyword and keyword.lower() not in STOPWORDS and not keyword.isdigit()
    ][:8]


def canonical_topic_label(records, indexes, words, texts):
    keyword_text = " ".join(words).lower()
    domain_counts = Counter(records[index].get("affectedDomain") or "" for index in indexes)
    top_domain = domain_counts.most_common(1)[0][0].lower() if domain_counts else ""
    text = f"{keyword_text} {top_domain}"
    rules = [
        (("student", "school", "academic risk", "lunch portal"), "Student Support and Risk Labels"),
        (("dispatcher", "dispatch triage", "emergency dispatch"), "Emergency Dispatch Triage"),
        (("transit safety", "traffic citation", "wrong station", "maintenance"), "Transit and Traffic Report Routing"),
        (("old address", "voucher", "shelter address"), "Housing Records and Voucher Eligibility"),
        (("unhoused", "community voice", "nobody trusts"), "Housing Access, Trust, and Voice"),
        (("housing inspection", "building", "utility help", "low priority"), "Housing Conditions and Service Priority"),
        (("job workshop", "job matching", "resource recommendation"), "Employment and Service Recommendations"),
        (("family screening", "child welfare", "cps", "risk score"), "Family Screening Risk and Support"),
        (("housing", "unhoused", "shelter", "tenant"), "Housing Access and Priority"),
        (("benefits", "eligibility", "appeal", "review"), "Benefits Review and Eligibility"),
        (("dispatcher", "emergency", "traffic", "transit", "safety", "inspection", "building"), "Public Safety Response and Inspection"),
        (("job", "employment", "interview", "worker matching"), "Job Matching and Employment Access"),
        (("language", "translation", "interpreter"), "Language Access and Service Navigation"),
        (("student", "school", "counselor"), "Student Support and Risk Labels"),
    ]
    for terms, label in rules:
        if any(term in text for term in terms):
            return label
    return None


def build_topics(records, topic_ids, texts, topic_model=None, keyword_model=None):
    grouped = defaultdict(list)
    for index, topic_id in enumerate(topic_ids):
        if topic_id_or_none(topic_id) is not None:
            grouped[int(topic_id)].append(index)

    topics = []
    topic_info = {}
    if topic_model is not None:
        try:
            for row in topic_model.get_topic_info().to_dict("records"):
                topic_info[int(row.get("Topic"))] = row
        except Exception:
            topic_info = {}

    for topic_id, indexes in sorted(grouped.items()):
        info = topic_info.get(topic_id, {})
        words = []
        if topic_model is not None:
            try:
                words = [word for word, _score in topic_model.get_topic(topic_id)[:8]]
            except Exception:
                words = []
        keybert_words = keybert_keywords(keyword_model, texts, indexes)
        label_words = keybert_words or words
        label = canonical_topic_label(records, indexes, label_words, texts) or (clean_label(label_words) if label_words else None) or info.get("Name") or keyword_label(texts, indexes)
        algorithm_ids = {algorithm_id for index in indexes for algorithm_id in records[index].get("algorithmIds", [])}
        domains = {records[index].get("affectedDomain") for index in indexes if records[index].get("affectedDomain")}
        topics.append({
            "topicId": topic_id,
            "label": label,
            "topKeywords": keybert_words or [word for word in words if word and word.lower() not in STOPWORDS and not word.isdigit()][:8] or label.split(" / "),
            "size": len(indexes),
            "spanAlgorithms": len(algorithm_ids),
            "spanDomains": len(domains),
        })
    return dedupe_topic_labels(topics)


def dedupe_topic_labels(topics):
    counts = Counter(topic["label"] for topic in topics)
    seen = Counter()
    for topic in topics:
        label = topic["label"]
        if counts[label] == 1:
            continue
        seen[label] += 1
        label_words = set(re.findall(r"[a-z][a-z'-]{2,}", label.lower()))
        suffix_words = [
            word for word in topic.get("topKeywords", [])
            if not label_words.intersection(re.findall(r"[a-z][a-z'-]{2,}", str(word).lower()))
        ]
        suffix = clean_label(suffix_words[:2]).replace(" / ", " and ")
        topic["label"] = f"{label}: {suffix}" if suffix != "suggested topic" else f"{label} {seen[label]}"
    return topics


def semantic_rows(items, embeddings, entity_type):
    rows = []
    for item, vector in zip(items, embeddings):
        text = item.get("analysisText") or item.get("text") or ""
        rows.append({
            "entityType": entity_type,
            "entityId": item["id"],
            "contentHash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "vector": np.asarray(vector, dtype=float).round(8).tolist(),
        })
    return rows


def sensitive_entities(records, texts):
    import spacy

    requested_model = os.environ.get("SPACY_MODEL", "en_core_web_trf")
    try:
        nlp = spacy.load(requested_model)
        loaded_model = requested_model
    except OSError:
        nlp = spacy.load("en_core_web_sm")
        loaded_model = "en_core_web_sm"
    rows = []
    address_pattern = re.compile(r"\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way)\b", re.I)
    for record, doc, text in zip(records, nlp.pipe(texts, batch_size=16), texts):
        exclusions = [str(value).strip().lower() for value in record.get("knownEntityExclusions", []) if str(value).strip()]
        people = []
        for ent in doc.ents:
            value = ent.text.strip()
            lowered = value.lower()
            if ent.label_ != "PERSON" or len(value) < 3:
                continue
            if any(lowered in exclusion or exclusion in lowered for exclusion in exclusions):
                continue
            people.append(value)
        rows.append({
            "people": list(dict.fromkeys(people)),
            "addresses": list(dict.fromkeys(address_pattern.findall(text))),
        })
    return rows, loaded_model


def make_payload(input_payload, embeddings, umap_xy, cluster_ids, topic_ids, topics, model_name, params, warnings, semantic_embeddings=None, sensitive_entity_rows=None):
    records = input_payload.get("records", [])
    output_records = []
    for index, record in enumerate(records):
        cluster_id = int(cluster_ids[index]) if cluster_ids is not None else None
        topic_id = topic_id_or_none(topic_ids[index]) if topic_ids is not None else None
        output_records.append({
            "id": record["id"],
            "clusterId": cluster_id,
            "isOutlier": cluster_id == -1,
            "topicId": topic_id,
            "umapX": float(umap_xy[index][0]) if umap_xy is not None else None,
            "umapY": float(umap_xy[index][1]) if umap_xy is not None else None,
            "sensitiveEntities": sensitive_entity_rows[index] if sensitive_entity_rows else None,
        })

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "inputGeneratedAt": input_payload.get("generatedAt"),
        "jurisdictionId": input_payload.get("jurisdictionId"),
        "model": model_name,
        "params": params,
        "topics": topics,
        "records": output_records,
        "semanticEmbeddings": semantic_embeddings or [],
        "warnings": warnings,
    }


def run_lightweight_self_check(output_path):
    from sklearn.cluster import KMeans
    from sklearn.decomposition import PCA
    from sklearn.feature_extraction.text import TfidfVectorizer

    records = [
        {"id": item_id, "analysisText": text, "affectedDomain": text.split()[0].lower(), "algorithmIds": []}
        for item_id, text in SYNTHETIC_RECORDS
    ]
    texts = [record["analysisText"] for record in records]
    embeddings = TfidfVectorizer(ngram_range=(1, 2), min_df=1).fit_transform(texts).toarray()
    xy = PCA(n_components=2, random_state=42).fit_transform(embeddings)
    clusters = KMeans(n_clusters=3, random_state=42, n_init=10).fit_predict(embeddings)
    topics = clusters
    topic_rows = build_topics(records, topics, texts)
    payload = make_payload(
        {"records": records, "generatedAt": datetime.now(timezone.utc).isoformat(), "jurisdictionId": "self-check"},
        embeddings,
        xy,
        clusters,
        topics,
        topic_rows,
        "self-check:tfidf+pca+kmeans",
        {"mode": "self-check", "randomState": 42},
        ["Self-check uses lightweight sklearn components; production mode uses SentenceTransformers, UMAP, HDBSCAN, and BERTopic."],
    )
    housing_clusters = {row["clusterId"] for row in payload["records"] if row["id"].startswith("housing")}
    if len(housing_clusters) > 2:
        raise AssertionError("self-check expected housing records to cluster together enough to catch broken output logic")
    if any(row["topicId"] is not None and row["topicId"] < 0 for row in payload["records"]):
        raise AssertionError("negative topic ids must be converted to null")
    cached = semantic_rows(records[:1], embeddings[:1], "testimony")[0]
    if len(cached["contentHash"]) != 64 or len(cached["vector"]) != embeddings.shape[1]:
        raise AssertionError("semantic embedding cache row is incomplete")
    write_json(output_path, payload)
    print(json.dumps({"outputPath": output_path, "records": len(payload["records"]), "topics": len(payload["topics"])}, indent=2))


def run_production(input_path, output_path, model_name, n_neighbors_arg=None, min_cluster_size_arg=None, min_samples_arg=None):
    from bertopic import BERTopic
    from hdbscan import HDBSCAN
    from keybert import KeyBERT
    from sentence_transformers import SentenceTransformer
    from sklearn.feature_extraction.text import CountVectorizer
    from umap import UMAP

    input_payload = read_json(input_path)
    records = input_payload.get("records") or []
    algorithms = input_payload.get("algorithms") or []
    peer_insights = input_payload.get("crossJurisdictionInsights") or []
    claims = [
        {**claim, "algorithmId": algorithm["id"]}
        for algorithm in algorithms
        for claim in algorithm.get("claims", [])
        if claim.get("id") and claim.get("text")
    ]
    texts = [record.get("analysisText", "").strip() for record in records]
    algorithm_texts = [algorithm.get("analysisText", "").strip() for algorithm in algorithms]
    claim_texts = [claim.get("text", "").strip() for claim in claims]
    peer_texts = [insight.get("analysisText", "").strip() for insight in peer_insights]
    warnings = []

    if len(records) < 5:
        warnings.append("Corpus has fewer than 5 records; clustering and topic modeling were skipped.")
        payload = make_payload(input_payload, None, None, None, None, [], model_name, {"minRecords": 5}, warnings)
        write_json(output_path, payload)
        print(json.dumps({"outputPath": output_path, "records": len(records), "topics": 0, "warnings": warnings}, indent=2))
        return

    model = SentenceTransformer(model_name)
    keyword_model = KeyBERT(model=model)
    all_texts = [*texts, *algorithm_texts, *claim_texts, *peer_texts]
    all_embeddings = model.encode(all_texts, batch_size=16, show_progress_bar=True, normalize_embeddings=True)
    all_embeddings = np.asarray(all_embeddings)
    record_end = len(records)
    algorithm_end = record_end + len(algorithms)
    claim_end = algorithm_end + len(claims)
    embeddings = all_embeddings[:record_end]
    semantic_embeddings = [
        *semantic_rows(records, embeddings, "testimony"),
        *semantic_rows(algorithms, all_embeddings[record_end:algorithm_end], "algorithm"),
        *semantic_rows(claims, all_embeddings[algorithm_end:claim_end], "claim"),
        *semantic_rows(peer_insights, all_embeddings[claim_end:], "cross_jurisdiction_insight"),
    ]
    sensitive_entity_rows, spacy_model = sensitive_entities(records, texts)

    neighbors = n_neighbors_arg or max(2, min(10, len(records) - 1))
    cluster_size = min_cluster_size_arg or min_cluster_size(len(records))
    min_samples = min_samples_arg or 1
    umap_model = UMAP(n_components=2, n_neighbors=neighbors, min_dist=0.0, metric="cosine", random_state=42)
    hdbscan_model = HDBSCAN(
        min_cluster_size=cluster_size,
        min_samples=min_samples,
        metric="euclidean",
        cluster_selection_method="eom",
        prediction_data=True,
    )
    vectorizer_model = CountVectorizer(stop_words="english", ngram_range=(1, 3), min_df=1)
    topic_model = BERTopic(
        embedding_model=None,
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        vectorizer_model=vectorizer_model,
        calculate_probabilities=False,
        verbose=True,
    )

    topic_ids, _probabilities = topic_model.fit_transform(texts, embeddings)
    umap_xy = topic_model.umap_model.embedding_
    cluster_ids = topic_model.hdbscan_model.labels_
    topics = build_topics(records, topic_ids, texts, topic_model, keyword_model)
    params = {
        "embeddingModel": model_name,
        "umap": {"metric": "cosine", "randomState": 42, "nNeighbors": neighbors, "nComponents": 2},
        "hdbscan": {"minClusterSize": cluster_size, "minSamples": min_samples, "metric": "euclidean", "clusterSelectionMethod": "eom"},
        "bertopic": {"topicMinusOneStoredAsNull": True},
        "keybert": {"keywordNgramRange": [1, 3], "topN": 10, "useMmr": True, "diversity": 0.45},
        "semanticCache": {
            "dimensions": int(all_embeddings.shape[1]),
            "testimonies": len(records),
            "algorithms": len(algorithms),
            "claims": len(claims),
            "crossJurisdictionInsights": len(peer_insights),
        },
        "spacy": {"model": spacy_model, "purpose": "public excerpt anonymization"},
    }
    payload = make_payload(
        input_payload,
        embeddings,
        umap_xy,
        cluster_ids,
        topic_ids,
        topics,
        model_name,
        params,
        warnings,
        semantic_embeddings,
        sensitive_entity_rows,
    )
    write_json(output_path, payload)
    print(json.dumps({
        "outputPath": output_path,
        "records": len(records),
        "algorithms": len(algorithms),
        "claims": len(claims),
        "crossJurisdictionInsights": len(peer_insights),
        "topics": len(topics),
        "semanticEmbeddings": len(semantic_embeddings),
        "warnings": warnings,
    }, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Run local Briefings corpus batch ML.")
    parser.add_argument("--input", default="task-briefings-results/corpus-batch-input.json")
    parser.add_argument("--output", default="task-briefings-results/corpus-batch-results.json")
    parser.add_argument("--model", default=os.environ.get("BRIEFINGS_EMBEDDING_MODEL", DEFAULT_MODEL))
    parser.add_argument("--n-neighbors", type=int)
    parser.add_argument("--min-cluster-size", type=int)
    parser.add_argument("--min-samples", type=int)
    parser.add_argument("--self-check", action="store_true")
    args = parser.parse_args()

    if args.self_check:
        run_lightweight_self_check(args.output)
    else:
        run_production(args.input, args.output, args.model, args.n_neighbors, args.min_cluster_size, args.min_samples)


if __name__ == "__main__":
    main()
