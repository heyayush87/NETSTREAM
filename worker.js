export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const json = { ...corsHeaders, "Content-Type": "application/json" };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health / default route
    if (url.pathname !== "/api/suggestions") {
      return new Response(
        JSON.stringify({
          message: "Movie API Worker is running",
          usage: "POST /api/suggestions",
        }),
        { status: 200, headers: json }
      );
    }

    // Only POST allowed
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: json,
      });
    }

    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: json,
      });
    }

    const prompt = body?.prompt;
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: json,
      });
    }

    if (!env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY secret is not set on the worker" }),
        { status: 500, headers: json }
      );
    }

    // Call Groq
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const data = await groqResponse.json().catch(() => ({}));

    if (!groqResponse.ok) {
      // Shows the real reason in Workers logs and in the response
      console.error("Groq error", groqResponse.status, JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Groq request failed" }),
        { status: 502, headers: json }
      );
    }

    const result = data?.choices?.[0]?.message?.content;
    if (!result) {
      return new Response(JSON.stringify({ error: "Empty response from model" }), {
        status: 502,
        headers: json,
      });
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: json,
    });
  },
};
