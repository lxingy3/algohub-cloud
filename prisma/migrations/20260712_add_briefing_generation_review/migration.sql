CREATE TYPE "GenerationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "briefing_generation_jobs" (
  "id" UUID NOT NULL,
  "jurisdiction_id" VARCHAR(50) NOT NULL,
  "requested_by" UUID NOT NULL,
  "briefing_type" "BriefingType" NOT NULL,
  "target_algorithm_id" UUID,
  "result_briefing_id" UUID,
  "status" "GenerationJobStatus" NOT NULL DEFAULT 'PENDING',
  "use_claude" BOOLEAN NOT NULL DEFAULT false,
  "message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  CONSTRAINT "briefing_generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "briefing_review_notes" (
  "id" UUID NOT NULL,
  "jurisdiction_id" VARCHAR(50) NOT NULL,
  "briefing_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "organization_id" UUID,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "briefing_review_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "briefing_generation_jobs_jurisdiction_id_status_idx" ON "briefing_generation_jobs"("jurisdiction_id", "status");
CREATE INDEX "briefing_review_notes_briefing_id_created_at_idx" ON "briefing_review_notes"("briefing_id", "created_at");
CREATE INDEX "briefing_review_notes_organization_id_idx" ON "briefing_review_notes"("organization_id");

ALTER TABLE "briefing_generation_jobs" ADD CONSTRAINT "briefing_generation_jobs_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "briefing_generation_jobs" ADD CONSTRAINT "briefing_generation_jobs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "briefing_generation_jobs" ADD CONSTRAINT "briefing_generation_jobs_target_algorithm_id_fkey" FOREIGN KEY ("target_algorithm_id") REFERENCES "algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "briefing_generation_jobs" ADD CONSTRAINT "briefing_generation_jobs_result_briefing_id_fkey" FOREIGN KEY ("result_briefing_id") REFERENCES "briefings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "briefing_review_notes" ADD CONSTRAINT "briefing_review_notes_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "briefing_review_notes" ADD CONSTRAINT "briefing_review_notes_briefing_id_fkey" FOREIGN KEY ("briefing_id") REFERENCES "briefings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "briefing_review_notes" ADD CONSTRAINT "briefing_review_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "briefing_review_notes" ADD CONSTRAINT "briefing_review_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
