CREATE TYPE "BriefingPartnerReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'CONCERN', 'REVISION_REQUESTED');

ALTER TABLE "briefings"
ADD COLUMN "partner_review_override_reason" TEXT,
ADD COLUMN "partner_review_overridden_by" UUID,
ADD COLUMN "partner_review_overridden_at" TIMESTAMPTZ(6);

ALTER TABLE "briefing_review_notes"
ADD COLUMN "partner_review_status" "BriefingPartnerReviewStatus";

CREATE TABLE "briefing_partner_reviews" (
  "id" UUID NOT NULL,
  "jurisdiction_id" VARCHAR(50) NOT NULL,
  "briefing_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "assigned_by" UUID NOT NULL,
  "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadline" TIMESTAMPTZ(6) NOT NULL,
  "status" "BriefingPartnerReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "briefing_partner_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "briefing_partner_reviews_briefing_id_organization_id_key"
ON "briefing_partner_reviews"("briefing_id", "organization_id");

CREATE INDEX "briefing_partner_reviews_jurisdiction_id_status_idx"
ON "briefing_partner_reviews"("jurisdiction_id", "status");

CREATE INDEX "briefing_partner_reviews_organization_id_deadline_idx"
ON "briefing_partner_reviews"("organization_id", "deadline");

ALTER TABLE "briefings"
ADD CONSTRAINT "briefings_partner_review_overridden_by_fkey"
FOREIGN KEY ("partner_review_overridden_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "briefing_partner_reviews"
ADD CONSTRAINT "briefing_partner_reviews_jurisdiction_id_fkey"
FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "briefing_partner_reviews"
ADD CONSTRAINT "briefing_partner_reviews_briefing_id_fkey"
FOREIGN KEY ("briefing_id") REFERENCES "briefings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "briefing_partner_reviews"
ADD CONSTRAINT "briefing_partner_reviews_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "briefing_partner_reviews"
ADD CONSTRAINT "briefing_partner_reviews_assigned_by_fkey"
FOREIGN KEY ("assigned_by") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "briefing_partner_reviews"
ADD CONSTRAINT "briefing_partner_reviews_reviewed_by_fkey"
FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
