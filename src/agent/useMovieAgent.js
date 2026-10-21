import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useNavigate } from "react-router-dom";
import { auth } from "../utils/Firebase";
import { streamAgent, AgentHttpError } from "./agentClient";
import { applyToolResult, TOOL_HANDLERS } from "./toolHandlers";
import { selectUiContext } from "./uiContext";
import {
  turnStarted, textDelta, toolStarted, toolFinished, turnCompleted, turnFailed, turnAborted, resetAgent,
} from "../utils/agentSlice";

/**
 * useMovieAgent — owns the chat loop between the drawer and the agent gateway.
 *
 *   user input ─► POST /api/agent/chat (history + uiContext + Firebase ID token)
 *            ◄─ SSE: text | tool_call | tool_result(directive) | done | error
 *   tool_result.directive ─► TOOL_HANDLERS[name].run() ─► dispatch(...) / navigate(...)
 *
 * The server runs the model↔tool loop (keys stay server-side); the client executes
 * only the UI half of each tool. Must be rendered inside <RouterProvider> and <Provider>.
 */
export default function useMovieAgent() {
  const dispatch = useDispatch();
  const store = useStore(); // read fresh state inside async callbacks (no stale closures)
  const navigate = useNavigate();
  const { messages, status, error } = useSelector((s) => s.agent);
  const abortRef = useRef(null);
  const lastInputRef = useRef("");

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (rawInput) => {
      const input = rawInput.trim();
      if (!input || store.getState().agent.status === "streaming") return;

      const user = auth.currentUser;
      if (!user) {
        dispatch(turnFailed("Please sign in to use the assistant."));
        return;
      }

      lastInputRef.current = input;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch(turnStarted(input));

      const ctx = { dispatch, navigate, getState: store.getState };
      let finished = false;

      const onEvent = (event, data) => {
        switch (event) {
          case "text":
            dispatch(textDelta(data.delta));
            break;
          case "tool_call":
            dispatch(toolStarted({ id: data.id, name: data.name, label: TOOL_HANDLERS[data.name]?.label || data.name }));
            break;
          case "tool_result": {
            // ← the tool execution callback: directive → Redux / router
            const label = applyToolResult(data, ctx);
            dispatch(toolFinished({ id: data.id, status: data.ok ? "done" : "error", ...(label && { label }) }));
            break;
          }
          case "done":
            finished = true;
            dispatch(turnCompleted(data.transcript || []));
            break;
          case "error":
            finished = true;
            dispatch(turnFailed(data.message));
            break;
          default:
        }
      };

      try {
        const token = await user.getIdToken(); // auto-refreshes when near expiry
        await streamAgent({
          token,
          signal: controller.signal,
          onEvent,
          body: {
            input,
            history: store.getState().agent.transcript,
            uiContext: selectUiContext(store.getState()),
          },
        });
        if (!finished) dispatch(turnFailed("The connection closed early."));
      } catch (err) {
        if (controller.signal.aborted) dispatch(turnAborted());
        else if (err instanceof AgentHttpError && err.status === 429) dispatch(turnFailed(err.message));
        else if (err instanceof AgentHttpError && err.status === 401) dispatch(turnFailed("Session expired — sign in again."));
        else dispatch(turnFailed("Couldn't reach the assistant. Check your connection."));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [dispatch, navigate, store]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const retry = useCallback(() => lastInputRef.current && send(lastInputRef.current), [send]);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch(resetAgent());
  }, [dispatch]);

  return { messages, status, error, isStreaming: status === "streaming", send, stop, retry, reset };
}
