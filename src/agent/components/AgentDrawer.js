import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import useMovieAgent from "../useMovieAgent";
import { closeAgent, toggleAgent, setDraft } from "../../utils/agentSlice";

const SUGGESTIONS = [
  "Mind-bending sci-fi from the 2010s",
  "Feel-good movies under 100 minutes",
  "Play the trailer for Interstellar",
  "A horror marathon that escalates, 5 films",
  "Something like Parasite but less dark",
];

function ToolChip({ tool }) {
  const tone =
    tool.status === "running" ? "border-gray-600 text-gray-300" :
    tool.status === "error" ? "border-red-700 text-red-300" : "border-green-700 text-green-300";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${tone}`}>
      {tool.status === "running" ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" aria-hidden />
      ) : (
        <span aria-hidden>{tool.status === "error" ? "!" : "✓"}</span>
      )}
      {tool.label}
    </div>
  );
}

function Message({ msg, streaming }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      {msg.tools?.length > 0 && (
        <div className="flex flex-wrap gap-2">{msg.tools.map((t) => <ToolChip key={t.id} tool={t} />)}</div>
      )}
      {(msg.text || (streaming && !msg.tools?.length)) && (
        <div
          className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
            isUser ? "rounded-br-sm bg-red-600 text-white" : "rounded-bl-sm bg-gray-800 text-gray-100"
          }`}
        >
          {msg.text}
          {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gray-300 align-middle" />}
        </div>
      )}
    </div>
  );
}

/**
 * Slide-over assistant. Non-modal on purpose: the page stays interactive so the user
 * watches rows appear and the player open as the agent works.
 */
const AgentDrawer = () => {
  const dispatch = useDispatch();
  const { isOpen, draft } = useSelector((s) => s.agent);
  const { messages, error, isStreaming, send, stop, retry, reset } = useMovieAgent();
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Cmd/Ctrl+K toggles, Esc closes.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        dispatch(toggleAgent());
      } else if (e.key === "Escape" && isOpen) {
        dispatch(closeAgent());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = (text = draft) => {
    if (!text.trim()) return;
    send(text);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => dispatch(toggleAgent())}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-red-900/40 transition hover:scale-105 hover:bg-red-700"
          aria-label="Open NETSTREAM assistant"
        >
          <span aria-hidden>✦</span> Ask NETSTREAM
          <kbd className="ml-1 hidden rounded bg-black/30 px-1.5 text-[10px] sm:inline">⌘K</kbd>
        </button>
      )}

      <aside
        role="dialog"
        aria-label="NETSTREAM assistant"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-white/10 bg-gray-950/95 text-white shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out sm:w-[420px] ${
          isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">NETSTREAM Assistant</h2>
            <p className="text-xs text-gray-400">Finds, plays and curates for you</p>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={reset} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-white">
                New chat
              </button>
            )}
            <button
              onClick={() => dispatch(closeAgent())}
              className="rounded p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Close assistant"
            >
              ✕
            </button>
          </div>
        </header>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="space-y-3 pt-6">
              <p className="text-sm text-gray-400">Tell me a mood, a movie you loved, or what you want to watch.</p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-gray-200 transition hover:border-red-600 hover:bg-white/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <Message key={m.id} msg={m} streaming={isStreaming && i === messages.length - 1 && m.role === "assistant"} />
            ))
          )}
          {error && (
            <div className="flex items-center justify-between rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">
              <span>{error}</span>
              <button onClick={retry} className="ml-3 font-semibold underline">Retry</button>
            </div>
          )}
        </div>

        <form
          className="border-t border-white/10 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-end gap-2 rounded-xl bg-gray-900 p-2 ring-1 ring-white/10 focus-within:ring-red-600">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={1000}
              onChange={(e) => dispatch(setDraft(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. cozy 90s rom-coms, then play the best one"
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-base text-white placeholder-gray-500 outline-none sm:text-sm"
            />
            {isStreaming ? (
              <button type="button" onClick={stop} className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium hover:bg-gray-600">
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40"
              >
                Send
              </button>
            )}
          </div>
        </form>
      </aside>
    </>
  );
};

export default AgentDrawer;
