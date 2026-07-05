ALTER TABLE "testimonies"
  ADD COLUMN "cluster_id" INTEGER,
  ADD COLUMN "is_outlier" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "topic_id" INTEGER,
  ADD COLUMN "umap_x" DOUBLE PRECISION,
  ADD COLUMN "umap_y" DOUBLE PRECISION,
  ADD COLUMN "neighbourhood" VARCHAR(120);

CREATE TABLE "corpus_topics" (
  "topic_id" INTEGER NOT NULL,
  "label" TEXT,
  "top_keywords" JSONB,
  "size" INTEGER,
  "span_algorithms" INTEGER,
  "span_domains" INTEGER,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "corpus_topics_pkey" PRIMARY KEY ("topic_id")
);

ALTER TABLE "testimonies"
  ADD CONSTRAINT "testimonies_topic_id_fkey"
  FOREIGN KEY ("topic_id") REFERENCES "corpus_topics"("topic_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "theme_improvement_map" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jurisdiction_id" VARCHAR(50),
  "theme" VARCHAR(255) NOT NULL,
  "improvement_direction" TEXT,
  "policy_direction" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "theme_improvement_map_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "theme_improvement_map"
  ADD CONSTRAINT "theme_improvement_map_jurisdiction_id_fkey"
  FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "testimonies_cluster_id_idx" ON "testimonies"("cluster_id");
CREATE INDEX "testimonies_topic_id_idx" ON "testimonies"("topic_id");
CREATE INDEX "testimonies_neighbourhood_idx" ON "testimonies"("neighbourhood");
CREATE INDEX "theme_improvement_map_theme_idx" ON "theme_improvement_map"("theme");
CREATE UNIQUE INDEX "theme_improvement_map_jurisdiction_id_theme_key" ON "theme_improvement_map"("jurisdiction_id", "theme");
