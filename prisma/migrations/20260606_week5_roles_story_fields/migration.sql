-- Add story submission fields used by the Week 5 share-story form.
ALTER TABLE "testimonies"
ADD COLUMN "zip_code" VARCHAR(20),
ADD COLUMN "referral_source" TEXT,
ADD COLUMN "public_posting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "followup_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "story_type" VARCHAR(20) NOT NULL DEFAULT 'text',
ADD COLUMN "video_file_url" TEXT;

-- Allow the same email address to be used for separate role-based accounts.
ALTER TABLE "users"
ADD COLUMN "primary_role_name" VARCHAR(50) NOT NULL DEFAULT 'COMMUNITY_MEMBER';

UPDATE "users"
SET "primary_role_name" = COALESCE(
  (
    SELECT "roles"."name"
    FROM "user_roles"
    JOIN "roles" ON "roles"."id" = "user_roles"."role_id"
    WHERE "user_roles"."user_id" = "users"."id"
    ORDER BY
      CASE "roles"."name"
        WHEN 'ADMIN' THEN 1
        WHEN 'FACILITATOR' THEN 2
        WHEN 'ORG_MEMBER' THEN 3
        WHEN 'RESEARCHER' THEN 4
        ELSE 5
      END
    LIMIT 1
  ),
  'COMMUNITY_MEMBER'
);

DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_jurisdiction_id_email_primary_role_name_key"
ON "users"("jurisdiction_id", "email", "primary_role_name");
