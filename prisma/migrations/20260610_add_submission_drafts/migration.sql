CREATE TABLE "submission_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "user_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "submission_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submission_drafts_jurisdiction_id_user_id_key" ON "submission_drafts"("jurisdiction_id", "user_id");
CREATE INDEX "submission_drafts_user_id_idx" ON "submission_drafts"("user_id");

ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
