# ML pipeline documentation

This document describes the current ML pipeline in AlgoStories. It is written for the project team, so it focuses on what runs, where the result is stored, and what still needs attention before a public demo.

## Scope

The pipeline covers Task 1 through Task 5 from the Week 7 ML work.

- Task 1 transcribes audio stories.
- Task 2 classifies the story impact.
- Task 3 detects themes in the story.
- Task 4 extracts agencies, locations, systems, dates, and people roles.
- Task 5 extracts keywords.

The admin "ML Quick Test" tool is for testing. It does not create or update a formal story record. Formal results are stored on testimony records in the database.

## Task 1: transcription

Task 1 takes an uploaded audio file and returns a transcript. The current worker path uses Whisper small through an open-source transcription flow. The server keeps the raw transcript, detected language, and timestamped segments for the admin test output.

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

Task 2 classifies a story as positive, negative, mixed, or unclear. The current model path uses the open-source zero-shot classifier `MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33` through Hugging Face inference. The app also includes tuned phrase rules for Pittsburgh public service stories so that common story patterns are not missed when a model call is slow or unavailable.

The formal database fields are:

- `Testimony.aiImpactClassification`
- `Testimony.aiConfidenceScore`
- `Testimony.aiProcessedAt`

The admin page reads those stored fields first. If a stored value is missing, the page can still show a local fallback estimate for review. The label now makes clear that the result is not stored yet.

## Task 3: theme detection

Task 3 detects themes such as data accuracy, opacity, delayed outcome, arbitrary outcome, lack of recourse, loss of dignity, positive experience, and process confusion.

The current model path uses `facebook/bart-large-mnli` as a zero-shot classifier. The app also has local theme rules that were tuned with Pittsburgh-style stories and the Week 7 test set. This gives the interface a useful result even when the hosted model is unavailable.

The formal database field is:

- `Testimony.aiThemes`

Each theme item stores a theme label and confidence score.

## Task 4: entity extraction

Task 4 extracts structured references from the story text. The current extraction combines pattern matching, public-service dictionaries, and Pittsburgh-specific names gathered during testing.

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

Task 5 extracts short phrases that help reviewers identify what the story is about. The current implementation uses a backend keyword extraction flow tuned for public service narratives. It prefers phrases that carry meaning, such as "language access routing system" or "low priority score," instead of generic words.

The formal database field is:

- `Testimony.aiExtractedExperiences.keywords`

## How results are stored

Formal stories store Task 1 through Task 5 on the `Testimony` table and related `TranscriptionJob` table.

For text stories, an admin can run the refresh endpoint to write Task 2 through Task 5 results:

- `POST /api/admin/testimonies/refresh-ml`

For voice stories, Task 1 completion now also triggers Task 2 through Task 5 storage on the same testimony record:

- `POST /api/transcription/process` with `action: "complete"`

This update is fail-safe. If Task 2 or Task 3 times out because of a hosted model limit, the transcript still saves. Any completed Task 2 through Task 5 result is written back without blocking Task 1.

## Quick Test

The admin Quick Test route is:

- `POST /api/ml/quick-test`

Text input runs Task 2 through Task 5. Audio input runs Task 1 first, then feeds the transcript into Task 2 through Task 5. Quick Test is useful for demos and debugging, but it does not store results in the database.

## Current limits

Task 2 and Task 3 can hit Hugging Face inference quota or timeout limits. The models are open source, but the hosted inference provider has account limits. Task 4 and Task 5 are more stable because they rely on backend logic and dictionaries.

The next stable option is to move more inference into our own worker process using open-source packages and cached models. That would avoid hosted inference quota during demos.

Long audio should still be tested before a meeting. The transcript can be accurate, but long files produce long output, so the admin page now uses collapsible story details and an ML Pipeline panel.

## Files and routes to know

- `prisma/schema.prisma`: database fields for Testimony and TranscriptionJob
- `app/api/testimonies/route.js`: formal story creation
- `app/api/transcription/process/route.js`: Task 1 completion and formal Task 2 through Task 5 storage after voice transcription
- `app/api/admin/testimonies/refresh-ml/route.js`: formal Task 2 through Task 5 refresh for stored stories
- `app/api/ml/quick-test/route.js`: admin test route
- `lib/mlFullAnalysis.js`: Task 2 through Task 5 analysis logic
- `app/admin/testimonies/ExpandablePanels.js`: admin display for story details and the ML Pipeline panel
