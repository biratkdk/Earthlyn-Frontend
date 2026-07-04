import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
- Featured demo accounts: buyer@earthlyn.com, seller@earthlyn.com

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
    const body = await request.json() as { messages?: unknown };
    messages = body.messages as typeof messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: messages.slice(-10),
        });

        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch {
        controller.enqueue(encoder.encode("\n\n[Sorry, something went wrong. Please try again.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
