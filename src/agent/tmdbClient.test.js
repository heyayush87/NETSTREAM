// Trailer lookup must keep working when the agent gateway is configured but unreachable.
const load = () => {
  let mod;
  jest.isolateModules(() => {
    mod = require("./tmdbClient");
  });
  return mod;
};

const videos = { results: [{ site: "YouTube", type: "Teaser", key: "tease" }, { site: "YouTube", type: "Trailer", official: true, key: "trail" }] };

afterEach(() => {
  delete process.env.REACT_APP_AGENT_URL;
});

test("with no gateway configured, trailers come from the proxy", async () => {
  delete process.env.REACT_APP_AGENT_URL; // .env may define it for local dev
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(videos) }));
  const { fetchTrailerKey } = load();
  expect(await fetchTrailerKey(1)).toBe("trail");
  expect(String(global.fetch.mock.calls[0][0])).toContain("workers.dev");
});

test("a down gateway falls back to the proxy instead of losing the trailer", async () => {
  process.env.REACT_APP_AGENT_URL = "http://localhost:8787/";
  global.fetch = jest.fn((url) =>
    String(url).startsWith("http://localhost:8787") ? Promise.reject(new TypeError("Failed to fetch")) : Promise.resolve({ ok: true, json: () => Promise.resolve(videos) })
  );
  const { fetchTrailerKey } = load();
  expect(await fetchTrailerKey(1)).toBe("trail");
  expect(String(global.fetch.mock.calls[0][0])).toBe("http://localhost:8787/api/tmdb/movie/1/videos");
  expect(String(global.fetch.mock.calls[1][0])).toContain("workers.dev");
});

test("returns null (not an exception) when both routes fail", async () => {
  process.env.REACT_APP_AGENT_URL = "http://localhost:8787";
  global.fetch = jest.fn(() => Promise.reject(new Error("offline")));
  const { fetchTrailerKey } = load();
  expect(await fetchTrailerKey(1)).toBeNull();
});
