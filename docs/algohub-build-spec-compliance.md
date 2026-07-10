# AlgoHub build-spec compliance notes

This note compares the current implementation with the active project requirements.

## Priority rule

1. Weekly assignments and live project direction are the highest priority because they are the latest requirements.
2. `AlgoHub_Build_Specification.md` is the second priority and is treated as the baseline architecture/design guide.
3. Big-spec features not requested by the current weekly assignment stay deferred.

## Current scope: Task 1-5 and Week 9 briefings

| Area | Big-spec expectation | Current decision |
| --- | --- | --- |
| Task 1 transcription | Run local/open-source Whisper, not hosted model APIs. | Compliant after local/self-hosted Task 1 path. Hosted Hugging Face ASR is removed. |
| Task 2 impact classification | Use local fine-tuned RoBERTa or local zero-shot BART-style classifier. | Compliant for current scope. Current path runs local BART-large-MNLI zero-shot when the Python model environment exists, with JS rules as fallback. Fine-tune is deferred until labeled review data exists. |
| Task 3 theme detection | Use local BART. | Compliant when local Python model environment exists, with JS theme rules as fallback. |
| Task 4 entity extraction | Use spaCy. | Compliant when local Python model environment exists; JS extraction remains a degraded fallback. |
| Task 5 keyword extraction | Use KeyBERT. | Compliant when local Python model environment exists; JS keyword extraction remains a degraded fallback. |
| Python dependencies | Provide the 4.14 `requirements.txt` stack for local ML service work. | Compliant. Root `requirements.txt` now includes openai-whisper, torch, transformers, sentence-transformers, spaCy, KeyBERT, BERTopic, HDBSCAN, scikit-learn, datasets, and service infrastructure packages. |
| External ML APIs | Run as much as possible locally; external APIs only for explicitly requested advanced generation. | Hosted model API calls are no longer part of Task 1-5. Self-hosted worker endpoints remain allowed. |
| Fine-tuning | Train periodically from facilitator corrections, admin moderation decisions, and manually labeled seed data. | Deferred. The required labeled review workflow is not in the current weekly scope. |
| Quick Test text limit | Demo limit is 12,000 characters for analysis. | Longer input is accepted and truncated for Task 2-5 analysis instead of failing with a query-length error. |
| Video upload | Use the audio track for transcription. | Supported through the Task 1 media path. |
| Week 9 corpus batch ML | Run corpus embeddings -> UMAP -> HDBSCAN -> BERTopic locally/offline, then write cached fields for the Briefings page. | Compliant. `scripts/briefings-corpus-batch.py` uses SentenceTransformers, UMAP, HDBSCAN, BERTopic, and KeyBERT. Current benchmarked default is `Qwen/Qwen3-Embedding-0.6B`; BGE/MiniLM remain override options. |
| Briefings schema additions | Store `cluster_id`, `is_outlier`, `topic_id`, `umap_x`, `umap_y`, and `corpus_topics`. | Compliant in Prisma schema and production read APIs. Live endpoints read these cached fields rather than running heavy models per request. |
| Briefings claim/narrative prose | Long-form synthesis is cached and reviewed before publication, not treated as a live factual judgment. | Implemented as offline draft tooling. Public claim-vs-experience API marks draft rows as `needs human review`; the page labels model outputs as interpretive/suggested. |
| Silence and recognition views | Use rule-based plus cached embedding/topic/cluster coverage for silence and similar-story retrieval. | Compliant for the current v1. `/api/explore/silence-map` exposes factor scores; `/api/explore/recognition` uses cached `topic_id`/`cluster_id` match basis. |

## Current scope: UI/design

| Area | Big-spec expectation | Current decision |
| --- | --- | --- |
| Brand colors | Preserve gold/amber around `#D4A017` and dark around `#1a1a2e`. | Brand tokens are defined in Tailwind. Public pages already use the amber/dark visual system. |
| Impact colors | High red, medium amber/yellow, low green. | Compliant in algorithm/testimony impact badges. |
| Admin UI | Admin should support moderation and management workflows. | Slate/white admin UI is kept because it is clearer for repeated admin work and does not conflict with current weekly direction. |

## Deferred from the big spec

Task 6 algorithm linking and Task 7 summarization are deferred because they were rolled back after Week 8. Full facilitator correction/fine-tune workflows remain deferred until labeled review data and a weekly assignment bring them back into scope. Week 9 briefings and silence/recognition exploration are now in scope.
