-- Growth campaign history and subscription plan catalog
CREATE TABLE IF NOT EXISTS "marketing_campaigns" (
  "id" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "recipient_count" INTEGER NOT NULL DEFAULT 0,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "marketing_campaigns"
  ADD CONSTRAINT "marketing_campaigns_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "marketing_campaigns_created_by_id_idx" ON "marketing_campaigns"("created_by_id");
CREATE INDEX IF NOT EXISTS "marketing_campaigns_audience_idx" ON "marketing_campaigns"("audience");
CREATE INDEX IF NOT EXISTS "marketing_campaigns_status_idx" ON "marketing_campaigns"("status");

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "interval" TEXT NOT NULL DEFAULT 'MONTHLY',
  "benefits" JSONB,
  "stripe_price_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");
CREATE INDEX IF NOT EXISTS "subscription_plans_is_active_idx" ON "subscription_plans"("is_active");
CREATE INDEX IF NOT EXISTS "subscription_plans_sort_order_idx" ON "subscription_plans"("sort_order");

INSERT INTO "subscription_plans" (
  "id",
  "code",
  "name",
  "description",
  "price",
  "interval",
  "benefits",
  "sort_order"
) VALUES
  (
    'plan_seed_box',
    'SEED_BOX',
    'Seed Box',
    'Starter monthly bundle for low-waste household essentials.',
    19.00,
    'MONTHLY',
    '["3 biodegradable staples", "Starter eco-impact bonus", "Flexible cancellation"]'::jsonb,
    10
  ),
  (
    'plan_bloom_box',
    'BLOOM_BOX',
    'Bloom Box',
    'Balanced monthly bundle for recurring pantry and personal-care swaps.',
    39.00,
    'MONTHLY',
    '["6 curated sustainable products", "Higher reward multiplier", "Priority seasonal drops"]'::jsonb,
    20
  ),
  (
    'plan_evergreen_box',
    'EVERGREEN_BOX',
    'Evergreen Box',
    'Premium monthly bundle for committed eco-first households.',
    69.00,
    'MONTHLY',
    '["10 premium products", "Maximum eco reward multiplier", "Early access to new sellers"]'::jsonb,
    30
  )
ON CONFLICT ("code") DO NOTHING;
