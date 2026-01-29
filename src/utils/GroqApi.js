const GROQ_WORKER_URL =
  "https://little-voice-4b18.heyayush0709.workers.dev/api/suggestions";

export const GroqApi = async (prompt) => {
  const res = await fetch(GROQ_WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Groq suggestions");
  }

  const data = await res.json();

  // Worker returns: { result: "movie1, movie2, movie3" }
  return data.result || "";
};
