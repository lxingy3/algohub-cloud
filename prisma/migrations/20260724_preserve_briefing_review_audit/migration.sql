ALTER TABLE "briefings"
DROP CONSTRAINT "briefings_partner_review_overridden_by_fkey",
ADD CONSTRAINT "briefings_partner_review_overridden_by_fkey"
FOREIGN KEY ("partner_review_overridden_by") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "briefing_review_notes"
DROP CONSTRAINT "briefing_review_notes_user_id_fkey",
ADD CONSTRAINT "briefing_review_notes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
DROP CONSTRAINT "briefing_review_notes_organization_id_fkey",
ADD CONSTRAINT "briefing_review_notes_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "briefing_partner_reviews"
DROP CONSTRAINT "briefing_partner_reviews_organization_id_fkey",
ADD CONSTRAINT "briefing_partner_reviews_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
DROP CONSTRAINT "briefing_partner_reviews_reviewed_by_fkey",
ADD CONSTRAINT "briefing_partner_reviews_reviewed_by_fkey"
FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
