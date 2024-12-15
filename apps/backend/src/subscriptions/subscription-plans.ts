export const SUBSCRIPTION_INTERVALS = [
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
] as const;

export type SubscriptionInterval = (typeof SUBSCRIPTION_INTERVALS)[number];

export interface SubscriptionPlanView {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  interval: SubscriptionInterval | string;
  benefits: string[];
  stripePriceId?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlanView[] = [
  {
    id: "plan_seed_box",
    code: "SEED_BOX",
    name: "Seed Box",
    description: "Starter monthly bundle for low-waste household essentials.",
    price: 19,
    interval: "MONTHLY",
    benefits: [
      "3 biodegradable staples",
      "Starter eco-impact bonus",
      "Flexible cancellation",
    ],
    isActive: true,
    sortOrder: 10,
  },
  {
    id: "plan_bloom_box",
    code: "BLOOM_BOX",
    name: "Bloom Box",
    description:
      "Balanced monthly bundle for recurring pantry and personal-care swaps.",
    price: 39,
    interval: "MONTHLY",
    benefits: [
      "6 curated sustainable products",
      "Higher reward multiplier",
      "Priority seasonal drops",
    ],
    isActive: true,
    sortOrder: 20,
  },
  {
    id: "plan_evergreen_box",
    code: "EVERGREEN_BOX",
    name: "Evergreen Box",
    description: "Premium monthly bundle for committed eco-first households.",
    price: 69,
    interval: "MONTHLY",
    benefits: [
      "10 premium products",
      "Maximum eco reward multiplier",
      "Early access to new sellers",
    ],
    isActive: true,
    sortOrder: 30,
  },
];

export function normalizePlanBenefits(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function toMonthlyPrice(price: number, interval: string) {
  if (interval === "ANNUAL") {
    return price / 12;
  }

  if (interval === "QUARTERLY") {
    return price / 3;
  }

  return price;
}
