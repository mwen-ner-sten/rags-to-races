import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { MechanicContext } from "@/lib/mechanic-types";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `You are Gearhead Gary, a grizzled mechanic NPC in an incremental racing game called "Rags to Races". Players scavenge parts from junkyards, build vehicles, and race them through progressively harder circuits.

You speak in short, punchy sentences with car and racing metaphors. You've been turning wrenches since before the player was born. You give strategic advice based on the player's current game state — what to upgrade, what to fix, whether they're ready for the next circuit, when to scavenge for better parts.

Keep it to 2-4 sentences. Be opinionated but helpful. Never break character. Never use markdown formatting.`;

export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const context: MechanicContext = await request.json();

  try {
    const result = streamText({
      model: openrouter("anthropic/claude-3.5-haiku"),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here's my current situation:\n${JSON.stringify(context, null, 2)}\n\nWhat should I focus on?`,
        },
      ],
      maxOutputTokens: 200,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Mechanic advisor error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
