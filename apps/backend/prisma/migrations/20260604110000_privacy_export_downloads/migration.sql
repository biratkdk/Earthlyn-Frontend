-- Privacy settings and data export logs.
CREATE TABLE IF NOT EXISTS "privacy_settings" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "data_collection" BOOLEAN NOT NULL DEFAULT true,
  "marketing" BOOLEAN NOT NULL DEFAULT true,
  "analytics" BOOLEAN NOT NULL DEFAULT true,
  "consent_given_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletion_requested" TIMESTAMP(3),
  "deletion_at" TIMESTAMP(3),
  CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'privacy_settings_user_id_fkey'
  ) THEN
    ALTER TABLE "privacy_settings"
      ADD CONSTRAINT "privacy_settings_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "privacy_settings_user_id_key"
  ON "privacy_settings"("user_id");
CREATE INDEX IF NOT EXISTS "privacy_settings_user_id_idx"
  ON "privacy_settings"("user_id");

CREATE TABLE IF NOT EXISTS "data_export_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "exported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "download_url" TEXT,
  "downloaded_at" TIMESTAMP(3),
  CONSTRAINT "data_export_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "data_export_logs"
  ADD COLUMN IF NOT EXISTS "downloaded_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "data_export_logs_user_id_idx"
  ON "data_export_logs"("user_id");
CREATE INDEX IF NOT EXISTS "data_export_logs_expires_at_idx"
  ON "data_export_logs"("expires_at");
