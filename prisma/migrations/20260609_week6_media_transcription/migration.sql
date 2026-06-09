-- Add media storage and transcription tracking for Week 6 testimony uploads.
ALTER TABLE "testimonies"
ADD COLUMN "media_object_key" TEXT,
ADD COLUMN "media_mime_type" VARCHAR(100),
ADD COLUMN "media_duration_seconds" INTEGER,
ADD COLUMN "occurred_at_text" VARCHAR(100),
ADD COLUMN "contact_email" VARCHAR(255),
ADD COLUMN "facilitator_code" VARCHAR(100),
ADD COLUMN "transcription_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "transcription_text" TEXT,
ADD COLUMN "transcription_error" TEXT,
ADD COLUMN "transcribed_at" TIMESTAMPTZ(6);

CREATE TABLE "transcription_jobs" (
    "id" UUID NOT NULL,
    "testimony_id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "media_kind" VARCHAR(20) NOT NULL,
    "object_key" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "mime_type" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(100) NOT NULL DEFAULT 'openai-whisper-1',
    "transcript" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "transcription_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transcription_jobs_jurisdiction_id_idx" ON "transcription_jobs"("jurisdiction_id");
CREATE INDEX "transcription_jobs_status_idx" ON "transcription_jobs"("status");
CREATE INDEX "transcription_jobs_testimony_id_idx" ON "transcription_jobs"("testimony_id");

ALTER TABLE "transcription_jobs"
ADD CONSTRAINT "transcription_jobs_testimony_id_fkey"
FOREIGN KEY ("testimony_id") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
