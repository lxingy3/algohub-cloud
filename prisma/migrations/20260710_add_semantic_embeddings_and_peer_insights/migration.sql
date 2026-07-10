CREATE TABLE "semantic_embeddings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jurisdiction_id" VARCHAR(50) NOT NULL,
  "entity_type" VARCHAR(30) NOT NULL,
  "entity_id" VARCHAR(100) NOT NULL,
  "model" VARCHAR(255) NOT NULL,
  "vector" JSONB NOT NULL,
  "content_hash" VARCHAR(64) NOT NULL,
  "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "semantic_embeddings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "semantic_embeddings"
  ADD CONSTRAINT "semantic_embeddings_jurisdiction_id_fkey"
  FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "semantic_embeddings_jurisdiction_id_entity_type_entity_id_model_key"
  ON "semantic_embeddings"("jurisdiction_id", "entity_type", "entity_id", "model");
CREATE INDEX "semantic_embeddings_jurisdiction_id_entity_type_model_idx"
  ON "semantic_embeddings"("jurisdiction_id", "entity_type", "model");

CREATE TABLE "cross_jurisdiction_insights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_jurisdiction_id" VARCHAR(50),
  "use_case" VARCHAR(100) NOT NULL,
  "insight_type" VARCHAR(50),
  "insight_data" JSONB NOT NULL,
  "is_approved" BOOLEAN NOT NULL DEFAULT false,
  "approved_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "cross_jurisdiction_insights_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cross_jurisdiction_insights"
  ADD CONSTRAINT "cross_jurisdiction_insights_source_jurisdiction_id_fkey"
  FOREIGN KEY ("source_jurisdiction_id") REFERENCES "jurisdictions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cross_jurisdiction_insights"
  ADD CONSTRAINT "cross_jurisdiction_insights_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "cross_jurisdiction_insights_use_case_idx"
  ON "cross_jurisdiction_insights"("use_case");
CREATE INDEX "cross_jurisdiction_insights_is_approved_idx"
  ON "cross_jurisdiction_insights"("is_approved");
