const CLOUDFLARE_PROXY =
  "https://huggingface-proxy.yourname.workers.dev";

const HF_MODEL_URL =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

export const fetchMovieSuggestionsHF = async (prompt) => {
  try {
    const response = await fetch(
      `${CLOUDFLARE_PROXY}?url=${encodeURIComponent(HF_MODEL_URL)}`,
      {
        method: "POST",
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 120,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();

    if (data?.error) {
      throw new Error(data.error);
    }

    return data[0]?.generated_text || "";
  } catch (error) {
    console.error("HF proxy error:", error);
    return null;
  }
};
