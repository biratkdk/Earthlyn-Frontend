-- Fulfillment operations event trail for automated and manual marketplace logistics.
CREATE TABLE "fulfillment_events" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fulfillment_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "fulfillment_events"
  ADD CONSTRAINT "fulfillment_events_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fulfillment_events"
  ADD CONSTRAINT "fulfillment_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "fulfillment_events_order_id_idx" ON "fulfillment_events"("order_id");
CREATE INDEX "fulfillment_events_actor_id_idx" ON "fulfillment_events"("actor_id");
CREATE INDEX "fulfillment_events_type_idx" ON "fulfillment_events"("type");
CREATE INDEX "fulfillment_events_status_idx" ON "fulfillment_events"("status");
CREATE INDEX "fulfillment_events_created_at_idx" ON "fulfillment_events"("created_at");
