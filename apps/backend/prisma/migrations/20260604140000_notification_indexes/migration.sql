CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_idx"
  ON "notifications"("user_id", "read_at");

CREATE INDEX IF NOT EXISTS "notifications_type_idx"
  ON "notifications"("type");
