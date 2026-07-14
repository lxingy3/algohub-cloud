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
| Task 2 impact classification | Use local fine-tuned RoBERTa or local zero-shot BART-style classifier. | The local BART-large-MNLI implementation matches the specified labels and review threshold. It scored accuracy 1.0000 and macro-F1 1.0000 on the 70-story internally reviewed calibration set. This is a development baseline, not an independent external test set. JS rules are a clearly identified degraded fallback, not a model result. |
| Task 3 theme detection | Use local BART. | The local multi-label BART implementation uses the specified 0.5 inclusion and 0.75 suggested-review thresholds. On the 70-story internal set, precision is 0.6681, recall is 0.8182, and F1 is 0.7356. The separate 16-story synthetic check produced precision 0.6613, recall 0.7736, and F1 0.7130. An independent labelled test set is still needed for a release-quality estimate. |
| Task 4 entity extraction | Use spaCy. | The current stored run uses spaCy `en_core_web_sm`; those entities also drive excerpt redaction. The JS extractor remains a clearly identified degraded fallback. |
| Task 5 keyword extraction | Use KeyBERT. | The current stored run uses KeyBERT with `sentence-transformers/all-MiniLM-L6-v2`; the saved phrases feed excerpt and topic context. The JS extractor remains a clearly identified degraded fallback. |
| Downstream algorithm linking | Combine text, keywords, agency, and domain signals, then keep reviewable matches. | A July 14 direction re-opened a limited top-1 matcher. Formal stories and Quick Test use the same transcript/narrative preparation and versioned Task 4/5 + registry-text scorer (0.35 threshold); submitter/facilitator links are preserved. Full pair-embedding scoring remains deferred until the project-owned worker can deploy it. |
| Story summary provenance | Generated summaries must identify their actual source and remain reviewable. | A user-authorized one-time OpenAI Codex batch is limited to approved, publicly shareable stories and stores `TestimonyBrief.modelName`, generation time, and `DRAFT` state. Public-posting permission is not described as separate LLM-processing consent. New submissions are not automatically sent to an LLM and use a neutral rule-based fallback. |
| Python dependencies | Provide the 4.14 `requirements.txt` stack for local ML service work. | Compliant. Root `requirements.txt` now includes openai-whisper, torch, transformers, sentence-transformers, spaCy, KeyBERT, BERTopic, HDBSCAN, scikit-learn, datasets, and service infrastructure packages. |
| External ML APIs | Run as much as possible locally; external APIs only for explicitly requested advanced generation. | Task 1-5 use local model code; the website may call the project-owned worker when the deployment cannot host those models. External LLM briefing rewrites are paused pending data-governance approval. |
| Fine-tuning | Train periodically from facilitator corrections, admin moderation decisions, and manually labeled seed data. | Deferred until the research team supplies or approves enough labeled records. Existing development fixtures are not treated as training labels. |
| Quick Test text limit | Demo limit is 12,000 characters for analysis. | Longer input is accepted and truncated for Task 2-5 analysis instead of failing with a query-length error. |
| Video upload | Use the audio track for transcription. | Supported through the Task 1 media path. |
| Week 9 corpus batch ML | Run corpus embeddings -> UMAP -> HDBSCAN -> BERTopic locally/offline, then write cached fields for the Briefings page. | Implemented for 49 approved stories. `scripts/briefings-corpus-batch.py` runs the four outputs together and uses KeyBERT/c-TF-IDF for suggested labels. The current embedding model is `Qwen/Qwen3-Embedding-0.6B`; BGE/MiniLM remain override options. The selected run has 5 topics and 1 outlier. Domain-bucket pairwise F1 is 0.73, while a stricter 16-story cross-cutting synthetic check is only 0.23, so topic labels remain suggested rather than findings. |
| Briefings schema additions | Store `cluster_id`, `is_outlier`, `topic_id`, `umap_x`, `umap_y`, and `corpus_topics`. | Compliant in Prisma schema and production read APIs. Live endpoints read these cached fields rather than running heavy models per request. |
| Briefings claim/narrative prose | Long-form synthesis is cached and reviewed before publication, not treated as a live factual judgment. | Implemented as offline draft tooling. Public claim-vs-experience API marks draft rows as `needs human review`; the page labels model outputs as interpretive/suggested. |
| Silence and recognition views | Use rule-based plus cached embedding/topic/cluster coverage for silence and similar-story retrieval. | Implemented. `/api/explore/silence-map` exposes the four factors and uses cached embedding cosine coverage; `/api/explore/recognition` uses cached embedding cosine, with topic/cluster/UMAP only as an explicit fallback. |
| Briefing operations | Generate drafts outside web requests, record review provenance, support partner comments, and publish reviewed material. | Implemented with a persistent generation queue, local worker, partner review notes, `reviewed_at`, and canonical briefing links. Optional language polishing falls back to the local draft when the provider is unavailable. Single-Briefing PDF export remains incomplete. |

## Current scope: UI/design

| Area | Big-spec expectation | Current decision |
| --- | --- | --- |
| Brand colors | Preserve gold/amber around `#D4A017` and dark around `#1a1a2e`. | Brand tokens are defined in Tailwind. Public pages already use the amber/dark visual system. |
| Impact colors | High red, medium amber/yellow, low green. | Compliant in algorithm/testimony impact badges. |
| Admin UI | Admin should support moderation and management workflows. | Slate/white admin UI is kept because it is clearer for repeated admin work and does not conflict with current weekly direction. |

## Deferred from the big spec

The full sentence-transformer Task 6 linker and automatic Task 7 summary service remain deferred. The July 14 direction re-opened only the shared, reviewable top-1 registry matcher and a user-authorized one-time OpenAI summary batch for approved, publicly shareable stories. Full facilitator correction/fine-tune workflows remain deferred until labeled review data and a weekly assignment bring them back into scope.
