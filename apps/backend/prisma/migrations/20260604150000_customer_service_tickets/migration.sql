-- Customer service tickets and threaded responses.
DO $$ BEGIN
  CREATE TYPE "TicketType" AS ENUM ('ORDER', 'PRODUCT', 'PAYMENT', 'COMPLAINT', 'GENERAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tickets" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "cs_user_id" TEXT,
  "issue_type" "TicketType" NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "resolution" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_user_id_fkey'
  ) THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_cs_user_id_fkey'
  ) THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_cs_user_id_fkey"
      FOREIGN KEY ("cs_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "tickets_user_id_idx" ON "tickets"("user_id");
CREATE INDEX IF NOT EXISTS "tickets_cs_user_id_idx" ON "tickets"("cs_user_id");
CREATE INDEX IF NOT EXISTS "tickets_status_idx" ON "tickets"("status");

CREATE TABLE IF NOT EXISTS "ticket_responses" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_responses_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_responses_ticket_id_fkey'
  ) THEN
    ALTER TABLE "ticket_responses"
      ADD CONSTRAINT "ticket_responses_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_responses_user_id_fkey'
  ) THEN
    ALTER TABLE "ticket_responses"
      ADD CONSTRAINT "ticket_responses_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ticket_responses_ticket_id_idx"
  ON "ticket_responses"("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_responses_user_id_idx"
  ON "ticket_responses"("user_id");
