# ML pipeline documentation

Current ML pipeline in AlgoStories.

## Scope

The primary pipeline covers Task 1 through Task 5. A separate downstream preview links the completed Task 4/5 output to one registry algorithm when its match score clears the review threshold.

- Task 1 transcribes audio stories.
- Task 2 classifies the story impact.
- Task 3 detects themes in the story.
- Task 4 extracts agencies, locations, systems, dates, and people roles.
- Task 5 extracts keywords.

The admin "ML Quick Test" tool is for testing. It does not create or update a formal story record. Formal results are stored on testimony records in the database, and both views use the same Task 1-5 result component, analysis-input preparation, and downstream registry matcher. Both paths analyze the transcript when present, otherwise the narrative; summary text is never mixed back into model input. A title is matcher context only.

## Task 1: transcription

Task 1 takes an uploaded audio or video file and returns a transcript. Video uploads are transcribed from the audio track only. The current path uses Whisper small through a local or self-hosted open-source transcription flow. The server keeps the raw transcript, detected language, and timestamped segments for the admin test output.

Supported formats are WAV, MP3, WebM, FLAC, OGG, and M4A. In the formal story flow, the submitted audio creates a `TranscriptionJob`. When the worker posts the completed transcript back to the app, the app saves:

- `Testimony.transcriptionStatus`
- `Testimony.transcriptionText`
- `Testimony.transcriptionError`
- `Testimony.transcribedAt`
- `TranscriptionJob.status`
- `TranscriptionJob.transcript`
- `TranscriptionJob.provider`
- `TranscriptionJob.processedAt`

If the original story text was only the voice placeholder, the transcript also becomes `Testimony.narrativeText`, and the app writes a short rule-based `Testimony.summary`. That fallback is labeled only `Summary`, not AI-generated. The public story page shows the transcript text, not the raw audio file.

## Task 2: impact classification

Task 2 classifies a story as positive, negative, mixed, or unclear. The current model path uses `facebook/bart-large-mnli` as the local/open-source zero-shot classifier through the Python runner or a self-hosted worker. The app also includes tuned phrase rules for Pittsburgh public service stories as a degraded fallback when the local model environment is unavailable.

The formal database fields are:

- `Testimony.aiImpactClassification`
- `Testimony.aiConfidenceScore`
- `Testimony.aiProcessedAt`

The admin page only displays the stored fields. If a stored value is missing, it shows `No stored result`; it does not generate a page estimate. A confidence score of `0.85` or lower requires human review.

## Task 3: theme detection

Task 3 detects themes such as data accuracy, opacity, delayed outcome, arbitrary outcome, lack of recourse, loss of dignity, positive experience, and process confusion.

The current model path uses `facebook/bart-large-mnli` as a multi-label zero-shot classifier through the local Python runner or a self-hosted worker. The app also has local theme rules that were tuned with Pittsburgh-style stories and the Week 7 test set. This gives the interface a useful result even when the local model environment is unavailable.

The formal database field is:

- `Testimony.aiThemes`

Each theme item stores a theme label and confidence score. Themes below `0.75` are displayed as `Suggested` while that provisional review threshold is evaluated against labeled data.

## Task 4: entity extraction

Task 4 extracts structured references from the story text. The current extraction uses spaCy NER, then adds public-service dictionaries and Pittsburgh-specific names gathered during testing.

The stored groups are:

- agencies
- locations
- systems
- dates
- people roles

The formal database field is:

- `Testimony.aiExtractedExperiences.entities`

An empty stored group means Task 4 completed and found no value for that group. A missing `entities` result means Task 4 has not produced a stored result.

Examples of the Pittsburgh-specific values include Pittsburgh Housing Authority, Pittsburgh Public Schools, Allegheny County Department of Human Services, OneStopPGH, PLI, PA CareerLink Pittsburgh, East Liberty, Homewood, Squirrel Hill, and Downtown Pittsburgh.

## Task 5: keyword extraction

Task 5 extracts short phrases that help reviewers identify what the story is about. The current implementation uses KeyBERT with MMR through the Python runner or self-hosted worker. It prefers phrases that carry meaning, such as "language access routing system" or "low priority score," instead of generic words.

The displayed output is limited to the top 10 one-to-three-word phrases.

The formal database field is:

- `Testimony.aiExtractedExperiences.keywords`

## Downstream related-algorithm preview

After Task 4 and Task 5, a shared deterministic matcher compares the story text, extracted systems/agencies, KeyBERT phrases, and affected domain with the algorithm registry. Its current weights are 45% registry-text similarity, 20% keyword overlap, 20% agency match, and 15% domain match. A narrow cue guardrail separates housing allocation, eviction, and inspection records when their shared domain wording would otherwise dominate. It stores only the top match when the score is at least `0.35`.

The result is labeled `Open-source ML suggested match` and the number is a match score, not a calibrated probability. Formal processing stores the explanation under `Testimony.aiExtractedExperiences.algorithmMatching`, including matcher version and registry-content fingerprint, synchronizes `Testimony.aiLinkedAlgorithmIds`, and replaces only `AI_DETECTED` relations. Submitter-identified and facilitator-tagged links are never overwritten. A changed matcher version or algorithm catalog makes the stored result eligible for refresh.

This is the currently deployable subset of the older Task 6 proposal. It does not claim to be the full sentence-transformer implementation. The internal 16-story reviewed synthetic fixture checks ranking behavior; it is not an independent research evaluation.

## Story summary provenance

The Story and Admin pages use `Testimony.summary` as the current display text. A one-time OpenAI Codex batch authorized by the user on July 14, 2026 writes summaries only for approved stories whose submitters allowed public posting. The matching `TestimonyBrief.modelName`, generation time, and `DRAFT` review state preserve provenance, and those records display `OpenAI-generated summary`. Rule/seed summaries without that provenance display the neutral label `Summary`.

The website does not automatically send new testimony text to OpenAI or another LLM. New stories keep the local rule-based fallback until a separately authorized and reviewed generation run occurs.

## How results are stored

Formal stories store Task 1 through Task 5 on the `Testimony` table and related `TranscriptionJob` table.

## Briefings corpus batch

The Briefings page reads stored model output rather than running heavy models inside a page request. The local batch path exports approved stories, runs sentence-transformer embeddings, UMAP, HDBSCAN, BERTopic, and KeyBERT labels, then writes:

- `Testimony.clusterId`
- `Testimony.isOutlier`
- `Testimony.topicId`
- `Testimony.umapX`
- `Testimony.umapY`
- `CorpusTopic`

These fields feed the story map, emergent topics, recognition/similar-story rows, representative/minority excerpts, evidence strength, and silence coverage. The online API computes counts and filters from those saved fields.

## Briefing prose and claim comparison

The chart data is local/model-backed as described above. `scripts/briefings-narrative-draft.mjs` builds deterministic staff drafts from stored counts and locally computed similarity matches. External LLM rewriting is paused; the public claim-vs-experience endpoint recomputes rows from reviewed claims, approved stories, and the open-source embedding cache instead of serving legacy assisted prose.

For text stories, an admin can run the refresh endpoint to write Task 2 through Task 5 results:

- `POST /api/admin/testimonies/refresh-ml`

For voice stories, Task 1 completion now also triggers Task 2 through Task 5 storage on the same testimony record:

- `POST /api/transcription/process` with `action: "complete"`

This update is fail-safe. If Task 2 through Task 5 cannot run because the local model environment is unavailable, the transcript still saves and the backend can return degraded local-rule results without blocking Task 1.

## Quick Test

The admin Quick Test route is:

- `POST /api/ml/quick-test`

Text input runs Task 2 through Task 5. Audio input runs Task 1 first, then feeds the transcript into Task 2 through Task 5. Selecting the affected domain and, when available, entering the Story title runs the same downstream registry matcher with the same formal inputs. Quick Test is convenient for demos and debugging, but it does not store results in the database. Its primary Task cards and related-algorithm preview match the formal stored-story display; file names, models, and timestamp segments remain optional technical details. Summary generation is not part of the Task 1-5 Quick Test output.

## Current limits

The expected demo limits are now 30 minutes for audio input and 12,000 characters for ML text analysis. Longer narrative text is accepted but both Quick Test and formal processing truncate it before Task 2 through Task 5 analysis. Non-English text is translated only when the project has a configured translation provider; ML paths never use the public Google/MyMemory fallback.

The admin Quick Test audio path has been changed to match that approach. It uploads the audio file to media storage first, then sends the stored object key to the ML endpoint. This avoids Vercel's function payload limit, which is what caused the `FUNCTION_PAYLOAD_TOO_LARGE` error on a 29-minute audio test.

Task 2 through Task 5 use open-source packages and cached models locally or through the project-owned worker. Third-party LLM APIs are not part of the production Task 1-5 pipeline. Long audio can still produce long transcript output, so the admin page uses collapsible story details and an ML Pipeline panel.

## Files and routes to know

- `prisma/schema.prisma`: database fields for Testimony and TranscriptionJob
- `app/api/testimonies/route.js`: formal story creation
- `app/api/transcription/process/route.js`: Task 1 completion and formal Task 2 through Task 5 storage after voice transcription
- `app/api/admin/testimonies/refresh-ml/route.js`: formal Task 2 through Task 5 refresh for stored stories
- `app/api/ml/quick-test/route.js`: admin test route
- `lib/mlFullAnalysis.js`: Task 2 through Task 5 analysis logic
- `lib/mlAnalysisInput.js`: shared transcript/narrative selection, safe translation, and text limit
- `lib/algorithmMatcher.js`: shared formal/Quick Test registry matcher
- `lib/testimonyMlPersistence.js`: preserves human links while replacing stored ML suggestions
- `app/admin/testimonies/ExpandablePanels.js`: admin display for story details and the ML Pipeline panel
