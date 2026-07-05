import argparse
import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


DEFAULT_MODEL = "BAAI/bge-small-en-v1.5"
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
        if word and not word.isdigit() and word.lower() not in {
            "the", "and", "for", "that", "this", "with", "from", "was", "were", "our", "your", "their", "into",
        }
    ]
    label = " / ".join(useful[:4]).strip()
    return label or "suggested topic"


def topic_id_or_none(topic_id):
    return None if topic_id is None or int(topic_id) < 0 else int(topic_id)


def min_cluster_size(count):
    return max(3, min(10, round(count * 0.08)))


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
        "about", "after", "algorithm", "automated", "because", "before", "could", "from", "have",
        "system", "that", "their", "there", "this", "with", "without", "worker", "score", "said",
    }
    ranked = [word for word, _count in Counter(word for word in words if word not in stop).most_common(6)]
    return clean_label(ranked)


def build_topics(records, topic_ids, texts, topic_model=None):
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
        label = (clean_label(words) if words else None) or info.get("Name") or keyword_label(texts, indexes)
        algorithm_ids = {algorithm_id for index in indexes for algorithm_id in records[index].get("algorithmIds", [])}
        domains = {records[index].get("affectedDomain") for index in indexes if records[index].get("affectedDomain")}
        topics.append({
            "topicId": topic_id,
            "label": label,
            "topKeywords": words[:8] or label.split(" / "),
            "size": len(indexes),
            "spanAlgorithms": len(algorithm_ids),
            "spanDomains": len(domains),
        })
    return topics


def make_payload(input_payload, embeddings, umap_xy, cluster_ids, topic_ids, topics, model_name, params, warnings):
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
        })

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "inputGeneratedAt": input_payload.get("generatedAt"),
        "jurisdictionId": input_payload.get("jurisdictionId"),
        "model": model_name,
        "params": params,
        "topics": topics,
        "records": output_records,
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
    write_json(output_path, payload)
    print(json.dumps({"outputPath": output_path, "records": len(payload["records"]), "topics": len(payload["topics"])}, indent=2))


def run_production(input_path, output_path, model_name):
    from bertopic import BERTopic
    from hdbscan import HDBSCAN
    from sentence_transformers import SentenceTransformer
    from sklearn.feature_extraction.text import CountVectorizer
    from umap import UMAP

    input_payload = read_json(input_path)
    records = input_payload.get("records") or []
    texts = [record.get("analysisText", "").strip() for record in records]
    warnings = []

    if len(records) < 5:
        warnings.append("Corpus has fewer than 5 records; clustering and topic modeling were skipped.")
        payload = make_payload(input_payload, None, None, None, None, [], model_name, {"minRecords": 5}, warnings)
        write_json(output_path, payload)
        print(json.dumps({"outputPath": output_path, "records": len(records), "topics": 0, "warnings": warnings}, indent=2))
        return

    model = SentenceTransformer(model_name)
    embeddings = model.encode(texts, batch_size=16, show_progress_bar=True, normalize_embeddings=True)
    embeddings = np.asarray(embeddings)

    neighbors = max(2, min(15, len(records) - 1))
    cluster_size = min_cluster_size(len(records))
    umap_model = UMAP(n_components=2, n_neighbors=neighbors, min_dist=0.0, metric="cosine", random_state=42)
    hdbscan_model = HDBSCAN(
        min_cluster_size=cluster_size,
        min_samples=2,
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
    topics = build_topics(records, topic_ids, texts, topic_model)
    params = {
        "embeddingModel": model_name,
        "umap": {"metric": "cosine", "randomState": 42, "nNeighbors": neighbors, "nComponents": 2},
        "hdbscan": {"minClusterSize": cluster_size, "minSamples": 2, "metric": "euclidean", "clusterSelectionMethod": "eom"},
        "bertopic": {"topicMinusOneStoredAsNull": True},
    }
    payload = make_payload(input_payload, embeddings, umap_xy, cluster_ids, topic_ids, topics, model_name, params, warnings)
    write_json(output_path, payload)
    print(json.dumps({"outputPath": output_path, "records": len(records), "topics": len(topics), "warnings": warnings}, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Run local Briefings corpus batch ML.")
    parser.add_argument("--input", default="task-briefings-results/corpus-batch-input.json")
    parser.add_argument("--output", default="task-briefings-results/corpus-batch-results.json")
    parser.add_argument("--model", default=os.environ.get("BRIEFINGS_EMBEDDING_MODEL", DEFAULT_MODEL))
    parser.add_argument("--self-check", action="store_true")
    args = parser.parse_args()

    if args.self_check:
        run_lightweight_self_check(args.output)
    else:
        run_production(args.input, args.output, args.model)


if __name__ == "__main__":
    main()
