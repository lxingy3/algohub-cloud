# ML pipeline documentation

Current ML pipeline in AlgoStories.

## Scope

The pipeline covers Task 1 through Task 5 currently.

- Task 1 transcribes audio stories.
- Task 2 classifies the story impact.
- Task 3 detects themes in the story.
- Task 4 extracts agencies, locations, systems, dates, and people roles.
- Task 5 extracts keywords.

The admin "ML Quick Test" tool is for testing. It does not create or update a formal story record. Formal results are stored on testimony records in the database.

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

If the original story text was only the voice placeholder, the transcript also becomes `Testimony.narrativeText`, and the app writes a short `Testimony.summary`. The public story page shows the transcript text, not the raw audio file.

## Task 2: impact classification

Task 2 classifies a story as positive, negative, mixed, or unclear. The current model path uses `facebook/bart-large-mnli` as the local/open-source zero-shot classifier through the Python runner or a self-hosted worker. The app also includes tuned phrase rules for Pittsburgh public service stories as a degraded fallback when the local model environment is unavailable.

The formal database fields are:

- `Testimony.aiImpactClassification`
- `Testimony.aiConfidenceScore`
- `Testimony.aiProcessedAt`

The admin page reads those stored fields first. If a stored value is missing, the page can still show a local fallback estimate for review. The label now makes clear that the result is not stored yet, rather than showing `Page estimate`.

## Task 3: theme detection

Task 3 detects themes such as data accuracy, opacity, delayed outcome, arbitrary outcome, lack of recourse, loss of dignity, positive experience, and process confusion.

The current model path uses `facebook/bart-large-mnli` as a multi-label zero-shot classifier through the local Python runner or a self-hosted worker. The app also has local theme rules that were tuned with Pittsburgh-style stories and the Week 7 test set. This gives the interface a useful result even when the local model environment is unavailable.

The formal database field is:

- `Testimony.aiThemes`

Each theme item stores a theme label and confidence score.

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

Examples of the Pittsburgh-specific values include Pittsburgh Housing Authority, Pittsburgh Public Schools, Allegheny County Department of Human Services, OneStopPGH, PLI, PA CareerLink Pittsburgh, East Liberty, Homewood, Squirrel Hill, and Downtown Pittsburgh.

## Task 5: keyword extraction

Task 5 extracts short phrases that help reviewers identify what the story is about. The current implementation uses KeyBERT with MMR through the Python runner or self-hosted worker. It prefers phrases that carry meaning, such as "language access routing system" or "low priority score," instead of generic words.

The formal database field is:

- `Testimony.aiExtractedExperiences.keywords`

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

The chart data is local/model-backed as described above. Longer briefing prose and claim-vs-experience text can be drafted offline with `scripts/briefings-narrative-draft.mjs`. By default the script writes a local rules-based draft. With `--claude` and `ANTHROPIC_API_KEY`, it can ask Claude for a draft rewrite, then store it as a briefing draft for review. The public page reads only stored briefing rows and does not call Claude during page load.

For text stories, an admin can run the refresh endpoint to write Task 2 through Task 5 results:

- `POST /api/admin/testimonies/refresh-ml`

For voice stories, Task 1 completion now also triggers Task 2 through Task 5 storage on the same testimony record:

- `POST /api/transcription/process` with `action: "complete"`

This update is fail-safe. If Task 2 through Task 5 cannot run because the local model environment is unavailable, the transcript still saves and the backend can return degraded local-rule results without blocking Task 1.

## Quick Test

The admin Quick Test route is:

- `POST /api/ml/quick-test`

Text input runs Task 2 through Task 5. Audio input runs Task 1 first, then feeds the transcript into Task 2 through Task 5. Quick Test is convenient for demos and debugging, but it does not store results in the database.

## Current limits

The expected demo limits are now 30 minutes for audio input and 12,000 characters for ML text analysis. Longer narrative text is accepted by Quick Test but truncated for Task 2 through Task 5 analysis instead of returning a query-length error. Formal story uploads already use signed media upload, so the audio file does not pass through the app server as a large request body.

The admin Quick Test audio path has been changed to match that approach. It uploads the audio file to media storage first, then sends the stored object key to the ML endpoint. This avoids Vercel's function payload limit, which is what caused the `FUNCTION_PAYLOAD_TOO_LARGE` error on a 29-minute audio test.

Task 2 through Task 5 use local open-source packages and cached models. External hosted model APIs are not part of the production pipeline. Long audio can still produce long transcript output, so the admin page uses collapsible story details and an ML Pipeline panel.

## Files and routes to know

- `prisma/schema.prisma`: database fields for Testimony and TranscriptionJob
- `app/api/testimonies/route.js`: formal story creation
- `app/api/transcription/process/route.js`: Task 1 completion and formal Task 2 through Task 5 storage after voice transcription
- `app/api/admin/testimonies/refresh-ml/route.js`: formal Task 2 through Task 5 refresh for stored stories
- `app/api/ml/quick-test/route.js`: admin test route
- `lib/mlFullAnalysis.js`: Task 2 through Task 5 analysis logic
- `app/admin/testimonies/ExpandablePanels.js`: admin display for story details and the ML Pipeline panel
