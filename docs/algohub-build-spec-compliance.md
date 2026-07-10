# AlgoHub build-spec compliance notes

This note compares the current implementation with the active project requirements.

## Priority rule

1. Weekly assignments and live project direction are the highest priority because they are the latest requirements.
2. `AlgoHub_Build_Specification.md` is the second priority and is treated as the baseline architecture/design guide.
3. Big-spec features not requested by the current weekly assignment stay deferred.

## Current scope: Task 1-5 and Week 9 briefings

| Area | Big-spec expectation | Current decision |
| --- | --- | --- |
| Task 1 transcription | Run local/open-source Whisper, not hosted model APIs. | Uses open-source Whisper small either on the local machine or in the project-owned worker. It does not use a third-party inference model API. |
| Task 2 impact classification | Use local fine-tuned RoBERTa or local zero-shot BART-style classifier. | The local BART-large-MNLI implementation matches the specified labels and review threshold. Release accuracy is not yet certified because the research team has not supplied or approved the required 50-example benchmark. JS rules are a clearly identified degraded fallback, not a model result. |
| Task 3 theme detection | Use local BART. | The local multi-label BART implementation uses the specified 0.5 inclusion and 0.75 suggested-review thresholds. Release recall still requires the same research-team benchmark. |
| Task 4 entity extraction | Use spaCy. | Compliant when local Python model environment exists; JS extraction remains a degraded fallback. |
| Task 5 keyword extraction | Use KeyBERT. | Compliant when local Python model environment exists; JS keyword extraction remains a degraded fallback. |
| Python dependencies | Provide the 4.14 `requirements.txt` stack for local ML service work. | Compliant. Root `requirements.txt` now includes openai-whisper, torch, transformers, sentence-transformers, spaCy, KeyBERT, BERTopic, HDBSCAN, scikit-learn, datasets, and service infrastructure packages. |
| External ML APIs | Run as much as possible locally; external APIs only for explicitly requested advanced generation. | Task 1-5 use local model code; the website may call the project-owned worker when the deployment cannot host those models. Claude remains optional for offline briefing rewrites. |
| Fine-tuning | Train periodically from facilitator corrections, admin moderation decisions, and manually labeled seed data. | Deferred until the research team supplies or approves enough labeled records. Existing development fixtures are not treated as training labels. |
| Quick Test text limit | Demo limit is 12,000 characters for analysis. | Longer input is accepted and truncated for Task 2-5 analysis instead of failing with a query-length error. |
| Video upload | Use the audio track for transcription. | Supported through the Task 1 media path. |
| Week 9 corpus batch ML | Run corpus embeddings -> UMAP -> HDBSCAN -> BERTopic locally/offline, then write cached fields for the Briefings page. | Implemented. `scripts/briefings-corpus-batch.py` runs the four outputs together and uses KeyBERT/c-TF-IDF for suggested labels. The current embedding model is `Qwen/Qwen3-Embedding-0.6B`; BGE/MiniLM remain override options. Domain-bucket scores are diagnostic only, not a research-team benchmark. |
| Briefings schema additions | Store `cluster_id`, `is_outlier`, `topic_id`, `umap_x`, `umap_y`, and `corpus_topics`. | Compliant in Prisma schema and production read APIs. Live endpoints read these cached fields rather than running heavy models per request. |
| Briefings claim/narrative prose | Long-form synthesis is cached and reviewed before publication, not treated as a live factual judgment. | Implemented as offline draft tooling. Public claim-vs-experience API marks draft rows as `needs human review`; the page labels model outputs as interpretive/suggested. |
| Silence and recognition views | Use rule-based plus cached embedding/topic/cluster coverage for silence and similar-story retrieval. | Implemented. `/api/explore/silence-map` exposes the four factors and uses cached embedding cosine coverage; `/api/explore/recognition` uses cached embedding cosine, with topic/cluster/UMAP only as an explicit fallback. |

## Current scope: UI/design

| Area | Big-spec expectation | Current decision |
| --- | --- | --- |
| Brand colors | Preserve gold/amber around `#D4A017` and dark around `#1a1a2e`. | Brand tokens are defined in Tailwind. Public pages already use the amber/dark visual system. |
| Impact colors | High red, medium amber/yellow, low green. | Compliant in algorithm/testimony impact badges. |
| Admin UI | Admin should support moderation and management workflows. | Slate/white admin UI is kept because it is clearer for repeated admin work and does not conflict with current weekly direction. |

## Deferred from the big spec

Task 6 algorithm linking and Task 7 summarization are deferred because they were rolled back after Week 8. Full facilitator correction/fine-tune workflows remain deferred until labeled review data and a weekly assignment bring them back into scope. Week 9 briefings and silence/recognition exploration are now in scope.
