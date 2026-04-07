export async function GET() {
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
  const models = (data.data ?? []).map((m: { id: string; name: string }) => ({
    id: m.id,
    name: m.name,
  }));

  return new Response(JSON.stringify({ models }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
    },
  });
}
