import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { MechanicContext } from "@/lib/mechanic-types";

const SYSTEM_PROMPT = `You are Gearhead Gary, a grizzled mechanic NPC in an incremental racing game called "Rags to Races". Players scavenge parts from junkyards, build vehicles, and race them through progressively harder circuits.

You speak in short, punchy sentences with car and racing metaphors. You've been turning wrenches since before the player was born. You give strategic advice based on the player's current game state — what to upgrade, what to fix, whether they're ready for the next circuit, when to scavenge for better parts.

Keep it to 2-4 sentences. Be opinionated but helpful. Never break character. Never use markdown formatting.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const context: MechanicContext = await request.json();

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
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
}
