-- Create enums
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ModerationStatus" AS ENUM ('FLAGGED', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Alter orders table
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "payment_intent_id" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "orders_buyer_id_idx" ON "orders"("buyer_id");
CREATE INDEX IF NOT EXISTS "orders_product_id_idx" ON "orders"("product_id");

-- Admin audit logs
CREATE TABLE IF NOT EXISTS "admin_audits" (
  "id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audits_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "admin_audits"
  ADD CONSTRAINT "admin_audits_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "admin_audits_admin_id_idx" ON "admin_audits"("admin_id");

-- Transaction references
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "reference_type" TEXT,
  ADD COLUMN IF NOT EXISTS "reference_id" TEXT;

CREATE INDEX IF NOT EXISTS "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX IF NOT EXISTS "transactions_reference_id_idx" ON "transactions"("reference_id");

-- Message moderation
CREATE TABLE IF NOT EXISTS "message_moderations" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "flagged_by_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ModerationStatus" NOT NULL DEFAULT 'FLAGGED',
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_moderations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "message_moderations"
  ADD CONSTRAINT "message_moderations_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_moderations"
  ADD CONSTRAINT "message_moderations_flagged_by_id_fkey"
  FOREIGN KEY ("flagged_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "message_moderations_message_id_idx" ON "message_moderations"("message_id");
CREATE INDEX IF NOT EXISTS "message_moderations_flagged_by_id_idx" ON "message_moderations"("flagged_by_id");

-- Add message indexes
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages"("sender_id");
CREATE INDEX IF NOT EXISTS "messages_receiver_id_idx" ON "messages"("receiver_id");

-- Add eco impact indexes
CREATE INDEX IF NOT EXISTS "eco_impacts_user_id_idx" ON "eco_impacts"("user_id");
CREATE INDEX IF NOT EXISTS "eco_impacts_product_id_idx" ON "eco_impacts"("product_id");
CREATE INDEX IF NOT EXISTS "eco_impacts_order_id_idx" ON "eco_impacts"("order_id");
