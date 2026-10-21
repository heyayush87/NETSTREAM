// Provider-agnostic streaming client for any OpenAI-compatible Chat Completions API
// (Groq, OpenAI, Together, OpenRouter, a local vLLM…). Swap via LLM_BASE_URL / LLM_MODEL.

export async function* streamChat(env, { messages, tools, signal }) {
  const res = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.LLM_API_KEY}` },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      messages,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: true,
      temperature: 0.4,
      max_tokens: 800,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`LLM ${res.status}: ${detail.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const toolCalls = []; // accumulated by index across deltas
  let buffer = "";
  let finishReason = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      let chunk;
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const d = choice.delta || {};
      if (d.content) yield { type: "text", text: d.content };
      for (const tc of d.tool_calls || []) {
        const slot = (toolCalls[tc.index] ||= { id: "", type: "function", function: { name: "", arguments: "" } });
        if (tc.id) slot.id = tc.id;
        if (tc.function?.name) slot.function.name += tc.function.name;
        if (tc.function?.arguments) slot.function.arguments += tc.function.arguments;
      }
      if (choice.finish_reason) finishReason = choice.finish_reason;
    }
  }
  yield { type: "end", finishReason, toolCalls: toolCalls.filter(Boolean) };
}
