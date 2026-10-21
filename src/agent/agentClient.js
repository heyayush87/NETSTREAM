// Minimal SSE-over-fetch reader. EventSource can't POST or send an Authorization header,
// so we parse the text/event-stream framing ourselves.

export const AGENT_URL =
  (process.env.REACT_APP_AGENT_URL || "http://localhost:8787").replace(/\/$/, "") + "/api/agent/chat";

export class AgentHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function streamAgent({ token, body, signal, onEvent }) {
  const res = await fetch(AGENT_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new AgentHttpError(res.status, data.error || `Request failed (${res.status})`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    // Events are separated by a blank line.
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trimStart();
      }
      if (!data) continue;
      try {
        onEvent(event, JSON.parse(data));
      } catch (e) {
        console.error("Bad agent frame", e, frame);
      }
    }
  }
}
