CREATE TABLE IF NOT EXISTS "dispute_messages" (
  "id" TEXT NOT NULL,
  "dispute_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispute_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "dispute_messages"
  ADD CONSTRAINT "dispute_messages_dispute_id_fkey"
  FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dispute_messages"
  ADD CONSTRAINT "dispute_messages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "dispute_messages_dispute_id_idx" ON "dispute_messages"("dispute_id");
CREATE INDEX IF NOT EXISTS "dispute_messages_user_id_idx" ON "dispute_messages"("user_id");
