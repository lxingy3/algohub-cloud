-- CreateEnum
CREATE TYPE "AlgorithmStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'DEPRECATED', 'PROPOSED');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "SubmissionMethod" AS ENUM ('WEB_FORM', 'FACILITATED_SESSION', 'AUDIO_TRANSCRIPTION', 'PAPER_SCAN');

-- CreateEnum
CREATE TYPE "SelfReportedImpact" AS ENUM ('POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TestimonyLinkType" AS ENUM ('AI_DETECTED', 'SUBMITTER_IDENTIFIED', 'FACILITATOR_TAGGED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WORKSHOP', 'TESTIMONY_SESSION', 'TOWN_HALL', 'TRAINING', 'PANEL', 'OFFICE_HOURS', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('PDF', 'WEBPAGE', 'TEXT', 'OTHER');

-- CreateEnum
CREATE TYPE "BriefingType" AS ENUM ('ALGORITHM_SPECIFIC', 'THEMATIC', 'SILENCE_REPORT', 'CROSS_CUTTING');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "NewsUpdateType" AS ENUM ('NEW_ALGORITHM', 'EVENT', 'NEWS', 'PLATFORM_UPDATE');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('EYE_OPENING', 'SUPPORT');

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "state" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'US',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_taxonomy" (
    "id" VARCHAR(100) NOT NULL,
    "jurisdiction_id" VARCHAR(50),
    "category" VARCHAR(50) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "algorithms" (
    "id" UUID NOT NULL,
    "source_id" TEXT,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "purpose" TEXT,
    "agency_name" VARCHAR(255),
    "agency_type" VARCHAR(100),
    "use_case" VARCHAR(100) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "data_used" TEXT,
    "decision_type" TEXT,
    "year_introduced" INTEGER,
    "year_deployed" INTEGER,
    "status" "AlgorithmStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_version" VARCHAR(50),
    "impact_level" "ImpactLevel",
    "official_documentation_url" TEXT,
    "storyboard_svg" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "algorithms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "algorithm_claims" (
    "id" UUID NOT NULL,
    "algorithm_id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "claim_text" TEXT NOT NULL,
    "claim_source" TEXT,
    "claim_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "algorithm_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "algorithm_documents" (
    "id" UUID NOT NULL,
    "algorithm_id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "source_type" "DocumentSourceType" NOT NULL DEFAULT 'PDF',
    "source_url" TEXT,
    "storage_url" TEXT,
    "raw_text" TEXT,
    "tokenized_text" JSONB,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "algorithm_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonies" (
    "id" UUID NOT NULL,
    "source_id" TEXT,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255),
    "summary" TEXT,
    "city" VARCHAR(255),
    "image_url" TEXT,
    "submitter_name" VARCHAR(255),
    "submitter_email" VARCHAR(255),
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "user_id" UUID,
    "partner_org_id" UUID,
    "facilitator_id" UUID,
    "narrative_text" TEXT NOT NULL,
    "submission_method" "SubmissionMethod",
    "audio_file_url" TEXT,
    "original_language" VARCHAR(50) NOT NULL DEFAULT 'en',
    "affected_domain" VARCHAR(100),
    "self_reported_impact" "SelfReportedImpact",
    "ai_impact_classification" VARCHAR(50),
    "ai_themes" JSONB,
    "ai_linked_algorithm_ids" UUID[],
    "ai_confidence_score" DOUBLE PRECISION,
    "ai_extracted_experiences" JSONB,
    "ai_processed_at" TIMESTAMPTZ(6),
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderator_id" UUID,
    "moderation_notes" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "testimonies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_briefs" (
    "id" UUID NOT NULL,
    "testimony_id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "summary" TEXT NOT NULL,
    "key_excerpts" JSONB NOT NULL,
    "model_name" VARCHAR(100),
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "testimony_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_algorithm_links" (
    "testimony_id" UUID NOT NULL,
    "algorithm_id" UUID NOT NULL,
    "link_type" "TestimonyLinkType" NOT NULL DEFAULT 'SUBMITTER_IDENTIFIED',
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "testimony_algorithm_links_pkey" PRIMARY KEY ("testimony_id","algorithm_id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "testimony_id" UUID NOT NULL,
    "user_id" UUID,
    "parent_comment_id" UUID,
    "author_name" VARCHAR(255),
    "content" TEXT NOT NULL,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_likes" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_reactions" (
    "id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "testimony_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reaction_type" "ReactionType" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimony_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" TIMESTAMPTZ(6),
    "name" VARCHAR(255) NOT NULL,
    "image" TEXT,
    "organization_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "contact_email" VARCHAR(255),
    "website_url" TEXT,
    "role" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_events" (
    "id" UUID NOT NULL,
    "source_id" TEXT,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "event_type" "EventType" NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6),
    "location" VARCHAR(255),
    "is_virtual" BOOLEAN NOT NULL DEFAULT false,
    "virtual_link" TEXT,
    "organizer_org_id" UUID,
    "max_attendees" INTEGER,
    "registration_required" BOOLEAN NOT NULL DEFAULT false,
    "registration_url" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "briefings" (
    "id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "briefing_type" "BriefingType" NOT NULL,
    "target_algorithm_id" UUID,
    "target_theme" VARCHAR(255),
    "date_range_start" DATE,
    "date_range_end" DATE,
    "testimony_count" INTEGER,
    "executive_summary" TEXT,
    "key_findings" JSONB,
    "pattern_analysis" TEXT,
    "silence_gaps" JSONB,
    "recommendations" JSONB,
    "claim_vs_experience" JSONB,
    "generated_by" VARCHAR(50),
    "reviewed_by" UUID,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "briefings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_updates" (
    "id" UUID NOT NULL,
    "jurisdiction_id" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "update_type" "NewsUpdateType" NOT NULL,
    "related_algorithm_id" UUID,
    "related_event_id" UUID,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_taxonomy_category_idx" ON "shared_taxonomy"("category");

-- CreateIndex
CREATE INDEX "shared_taxonomy_jurisdiction_id_idx" ON "shared_taxonomy"("jurisdiction_id");

-- CreateIndex
CREATE UNIQUE INDEX "algorithms_source_id_key" ON "algorithms"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "algorithms_slug_key" ON "algorithms"("slug");

-- CreateIndex
CREATE INDEX "algorithms_jurisdiction_id_idx" ON "algorithms"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "algorithms_use_case_idx" ON "algorithms"("use_case");

-- CreateIndex
CREATE INDEX "algorithms_location_idx" ON "algorithms"("location");

-- CreateIndex
CREATE INDEX "algorithms_status_idx" ON "algorithms"("status");

-- CreateIndex
CREATE INDEX "algorithm_claims_algorithm_id_idx" ON "algorithm_claims"("algorithm_id");

-- CreateIndex
CREATE INDEX "algorithm_claims_jurisdiction_id_idx" ON "algorithm_claims"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "algorithm_documents_algorithm_id_idx" ON "algorithm_documents"("algorithm_id");

-- CreateIndex
CREATE INDEX "algorithm_documents_jurisdiction_id_idx" ON "algorithm_documents"("jurisdiction_id");

-- CreateIndex
CREATE UNIQUE INDEX "testimonies_source_id_key" ON "testimonies"("source_id");

-- CreateIndex
CREATE INDEX "testimonies_jurisdiction_id_idx" ON "testimonies"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "testimonies_moderation_status_idx" ON "testimonies"("moderation_status");

-- CreateIndex
CREATE INDEX "testimonies_affected_domain_idx" ON "testimonies"("affected_domain");

-- CreateIndex
CREATE UNIQUE INDEX "testimony_briefs_testimony_id_key" ON "testimony_briefs"("testimony_id");

-- CreateIndex
CREATE INDEX "testimony_briefs_jurisdiction_id_idx" ON "testimony_briefs"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "testimony_briefs_review_status_idx" ON "testimony_briefs"("review_status");

-- CreateIndex
CREATE INDEX "testimony_algorithm_links_algorithm_id_idx" ON "testimony_algorithm_links"("algorithm_id");

-- CreateIndex
CREATE INDEX "comments_jurisdiction_id_idx" ON "comments"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "comments_testimony_id_idx" ON "comments"("testimony_id");

-- CreateIndex
CREATE INDEX "comments_moderation_status_idx" ON "comments"("moderation_status");

-- CreateIndex
CREATE UNIQUE INDEX "comment_likes_comment_id_user_id_key" ON "comment_likes"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "testimony_reactions_jurisdiction_id_idx" ON "testimony_reactions"("jurisdiction_id");

-- CreateIndex
CREATE UNIQUE INDEX "testimony_reactions_testimony_id_user_id_reaction_type_key" ON "testimony_reactions"("testimony_id", "user_id", "reaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_jurisdiction_id_idx" ON "users"("jurisdiction_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_jurisdiction_id_idx" ON "organizations"("jurisdiction_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_events_source_id_key" ON "community_events"("source_id");

-- CreateIndex
CREATE INDEX "community_events_jurisdiction_id_idx" ON "community_events"("jurisdiction_id");

-- CreateIndex
CREATE UNIQUE INDEX "briefings_slug_key" ON "briefings"("slug");

-- CreateIndex
CREATE INDEX "briefings_jurisdiction_id_idx" ON "briefings"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "briefings_briefing_type_idx" ON "briefings"("briefing_type");

-- CreateIndex
CREATE INDEX "briefings_review_status_idx" ON "briefings"("review_status");

-- CreateIndex
CREATE INDEX "news_updates_jurisdiction_id_idx" ON "news_updates"("jurisdiction_id");

-- AddForeignKey
ALTER TABLE "shared_taxonomy" ADD CONSTRAINT "shared_taxonomy_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_taxonomy" ADD CONSTRAINT "shared_taxonomy_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "shared_taxonomy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "algorithms" ADD CONSTRAINT "algorithms_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "algorithm_claims" ADD CONSTRAINT "algorithm_claims_algorithm_id_fkey" FOREIGN KEY ("algorithm_id") REFERENCES "algorithms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "algorithm_documents" ADD CONSTRAINT "algorithm_documents_algorithm_id_fkey" FOREIGN KEY ("algorithm_id") REFERENCES "algorithms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_partner_org_id_fkey" FOREIGN KEY ("partner_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_briefs" ADD CONSTRAINT "testimony_briefs_testimony_id_fkey" FOREIGN KEY ("testimony_id") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_briefs" ADD CONSTRAINT "testimony_briefs_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_algorithm_links" ADD CONSTRAINT "testimony_algorithm_links_testimony_id_fkey" FOREIGN KEY ("testimony_id") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_algorithm_links" ADD CONSTRAINT "testimony_algorithm_links_algorithm_id_fkey" FOREIGN KEY ("algorithm_id") REFERENCES "algorithms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_testimony_id_fkey" FOREIGN KEY ("testimony_id") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_reactions" ADD CONSTRAINT "testimony_reactions_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_reactions" ADD CONSTRAINT "testimony_reactions_testimony_id_fkey" FOREIGN KEY ("testimony_id") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_reactions" ADD CONSTRAINT "testimony_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_organizer_org_id_fkey" FOREIGN KEY ("organizer_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_target_algorithm_id_fkey" FOREIGN KEY ("target_algorithm_id") REFERENCES "algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_updates" ADD CONSTRAINT "news_updates_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_updates" ADD CONSTRAINT "news_updates_related_algorithm_id_fkey" FOREIGN KEY ("related_algorithm_id") REFERENCES "algorithms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_updates" ADD CONSTRAINT "news_updates_related_event_id_fkey" FOREIGN KEY ("related_event_id") REFERENCES "community_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

