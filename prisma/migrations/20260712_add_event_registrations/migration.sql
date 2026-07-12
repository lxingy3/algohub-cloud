CREATE TABLE "event_registrations" (
  "id" UUID NOT NULL,
  "jurisdiction_id" VARCHAR(50) NOT NULL,
  "event_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_registrations_event_id_email_key" ON "event_registrations"("event_id", "email");
CREATE INDEX "event_registrations_jurisdiction_id_idx" ON "event_registrations"("jurisdiction_id");
CREATE INDEX "event_registrations_event_id_idx" ON "event_registrations"("event_id");

ALTER TABLE "event_registrations"
  ADD CONSTRAINT "event_registrations_jurisdiction_id_fkey"
  FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "event_registrations"
  ADD CONSTRAINT "event_registrations_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
