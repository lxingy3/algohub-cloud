-- Track media storage provider separately from legacy public URL fields.
ALTER TABLE "testimonies"
ADD COLUMN "media_storage_provider" VARCHAR(50);

ALTER TABLE "transcription_jobs"
ADD COLUMN "storage_provider" VARCHAR(50) NOT NULL DEFAULT 'firebase-gcs';

ALTER TABLE "transcription_jobs"
ALTER COLUMN "provider" SET DEFAULT 'open-source-pipeline-pending';

UPDATE "transcription_jobs"
SET "provider" = 'open-source-pipeline-pending'
WHERE "provider" = 'openai-whisper-1';
