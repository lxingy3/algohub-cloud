-- Enforce the Week 7 identity rule: one user account per email in a jurisdiction,
-- with at most one linked account per OAuth provider.
ALTER TABLE "users"
DROP CONSTRAINT IF EXISTS "users_jurisdiction_id_email_primary_role_name_key";

UPDATE "users"
SET "email" = LOWER("email")
WHERE "email" <> LOWER("email");

CREATE TEMP TABLE "duplicate_user_map" ON COMMIT DROP AS
WITH "ranked_users" AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "jurisdiction_id", "email"
      ORDER BY
        CASE "primary_role_name"
          WHEN 'ADMIN' THEN 1
          WHEN 'FACILITATOR' THEN 2
          WHEN 'ORG_MEMBER' THEN 3
          WHEN 'RESEARCHER' THEN 4
          WHEN 'COMMUNITY_MEMBER' THEN 5
          ELSE 6
        END,
        "created_at",
        "id"
    ) AS "canonical_id",
    ROW_NUMBER() OVER (
      PARTITION BY "jurisdiction_id", "email"
      ORDER BY
        CASE "primary_role_name"
          WHEN 'ADMIN' THEN 1
          WHEN 'FACILITATOR' THEN 2
          WHEN 'ORG_MEMBER' THEN 3
          WHEN 'RESEARCHER' THEN 4
          WHEN 'COMMUNITY_MEMBER' THEN 5
          ELSE 6
        END,
        "created_at",
        "id"
    ) AS "rank"
  FROM "users"
)
SELECT "id" AS "duplicate_id", "canonical_id"
FROM "ranked_users"
WHERE "rank" > 1;

UPDATE "testimonies" "t"
SET "user_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "t"."user_id" = "m"."duplicate_id";

UPDATE "testimonies" "t"
SET "facilitator_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "t"."facilitator_id" = "m"."duplicate_id";

UPDATE "testimonies" "t"
SET "moderator_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "t"."moderator_id" = "m"."duplicate_id";

UPDATE "testimony_briefs" "tb"
SET "reviewed_by" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "tb"."reviewed_by" = "m"."duplicate_id";

UPDATE "briefings" "b"
SET "reviewed_by" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "b"."reviewed_by" = "m"."duplicate_id";

UPDATE "comments" "c"
SET "user_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "c"."user_id" = "m"."duplicate_id";

DELETE FROM "comment_likes" "cl"
USING (
  SELECT
    "cl"."id",
    ROW_NUMBER() OVER (
      PARTITION BY "cl"."comment_id", COALESCE("m"."canonical_id", "cl"."user_id")
      ORDER BY "cl"."created_at", "cl"."id"
    ) AS "rank"
  FROM "comment_likes" "cl"
  LEFT JOIN "duplicate_user_map" "m" ON "m"."duplicate_id" = "cl"."user_id"
) "ranked"
WHERE "cl"."id" = "ranked"."id"
  AND "ranked"."rank" > 1;

UPDATE "comment_likes" "cl"
SET "user_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "cl"."user_id" = "m"."duplicate_id";

DELETE FROM "testimony_reactions" "tr"
USING (
  SELECT
    "tr"."id",
    ROW_NUMBER() OVER (
      PARTITION BY "tr"."testimony_id", COALESCE("m"."canonical_id", "tr"."user_id"), "tr"."reaction_type"
      ORDER BY "tr"."created_at", "tr"."id"
    ) AS "rank"
  FROM "testimony_reactions" "tr"
  LEFT JOIN "duplicate_user_map" "m" ON "m"."duplicate_id" = "tr"."user_id"
) "ranked"
WHERE "tr"."id" = "ranked"."id"
  AND "ranked"."rank" > 1;

UPDATE "testimony_reactions" "tr"
SET "user_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "tr"."user_id" = "m"."duplicate_id";

UPDATE "password_reset_tokens" "prt"
SET "user_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "prt"."user_id" = "m"."duplicate_id";

DELETE FROM "submission_drafts" "sd"
USING (
  SELECT
    "sd"."id",
    ROW_NUMBER() OVER (
      PARTITION BY "sd"."jurisdiction_id", COALESCE("m"."canonical_id", "sd"."user_id")
      ORDER BY "sd"."updated_at" DESC, "sd"."id"
    ) AS "rank"
  FROM "submission_drafts" "sd"
  LEFT JOIN "duplicate_user_map" "m" ON "m"."duplicate_id" = "sd"."user_id"
) "ranked"
WHERE "sd"."id" = "ranked"."id"
  AND "ranked"."rank" > 1;

UPDATE "submission_drafts" "sd"
SET "user_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "sd"."user_id" = "m"."duplicate_id";

DELETE FROM "accounts" "a"
USING (
  SELECT
    "a"."id",
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE("m"."canonical_id", "a"."user_id"), "a"."provider"
      ORDER BY "a"."expires_at" DESC NULLS LAST, "a"."id"
    ) AS "rank"
  FROM "accounts" "a"
  LEFT JOIN "duplicate_user_map" "m" ON "m"."duplicate_id" = "a"."user_id"
) "ranked"
WHERE "a"."id" = "ranked"."id"
  AND "ranked"."rank" > 1;

UPDATE "accounts" "a"
SET "user_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "a"."user_id" = "m"."duplicate_id";

UPDATE "sessions" "s"
SET "user_id" = "m"."canonical_id"
FROM "duplicate_user_map" "m"
WHERE "s"."user_id" = "m"."duplicate_id";

DELETE FROM "user_roles" "ur"
USING "duplicate_user_map" "m"
WHERE "ur"."user_id" = "m"."duplicate_id";

DELETE FROM "users" "u"
USING "duplicate_user_map" "m"
WHERE "u"."id" = "m"."duplicate_id";

DELETE FROM "user_roles" "ur"
USING "users" "u"
WHERE "ur"."user_id" = "u"."id"
  AND NOT EXISTS (
    SELECT 1
    FROM "roles" "r"
    WHERE "r"."id" = "ur"."role_id"
      AND "r"."name" = "u"."primary_role_name"
  );

INSERT INTO "user_roles" ("user_id", "role_id")
SELECT "u"."id", "r"."id"
FROM "users" "u"
JOIN "roles" "r" ON "r"."name" = "u"."primary_role_name"
ON CONFLICT DO NOTHING;

ALTER TABLE "users"
ADD CONSTRAINT "users_jurisdiction_id_email_key" UNIQUE ("jurisdiction_id", "email");

ALTER TABLE "accounts"
ADD CONSTRAINT "accounts_user_id_provider_key" UNIQUE ("user_id", "provider");
