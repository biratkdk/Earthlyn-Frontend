import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Leaf, the friendly AI assistant for Earthlyn — a sustainability-first marketplace where verified sellers offer biodegradable, zero-waste, and eco-friendly products.

Your role:
- Help shoppers discover the right eco products (Personal Care, Kitchen, Drinkware, Tech Accessories, Outdoor & Garden)
- Explain product eco scores (0–100, higher = greener)
- Answer questions about sustainable living, eco certifications, and plastic-free alternatives
- Help with order issues, account questions, and seller onboarding
- Be concise, warm, and genuinely knowledgeable about sustainability

Key facts about Earthlyn:
- Products are curated and require admin approval before listing
- Sellers earn tiered rewards (Sprout → Growth → Impact tiers)
- Buyers earn eco points on every purchase, redeemable for discounts
- Payments are Stripe-powered with automated processing fees
- Demo accounts: buyer@earthlyn.com / Buyer@12345, seller@earthlyn.com / Seller@12345

Keep responses short (2–4 sentences max unless a list is genuinely useful). Never make up specific product prices or availability — direct users to browse the /products page for live inventory.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI assistant is not configured." },
      { status: 503 },
    );
  }

  let messages: Array<{ role: "user" | "assistant"; content: string }>;
  try {
    const body = (await request.json()) as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error("empty");
    }
    messages = body.messages;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages.slice(-10),
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[chat] Anthropic error:", err);
    return NextResponse.json(
      { error: "Failed to get a response. Please try again." },
      { status: 500 },
    );
  }
}
