import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const RATE_LIMIT = { maxRequests: 3, windowMs: 60_000 }; // 3 req/min

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`models:${ip}`, RATE_LIMIT);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterMs);

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
  });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: `OpenRouter returned ${res.status}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const models = (data.data ?? []).map((m: any) => ({
    id: m.id as string,
    name: m.name as string,
    contextLength: m.context_length ?? 0,
    pricing: {
      prompt: m.pricing?.prompt ?? "0",
      completion: m.pricing?.completion ?? "0",
    },
  }));

  return new Response(JSON.stringify({ models }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
    },
  });
}
