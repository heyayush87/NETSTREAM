import { createSlice, nanoid } from "@reduxjs/toolkit";

// Chat state lives in Redux (not hook-local) so it survives route changes and so any
// component (e.g. an "Ask AI" button on a card) can open the drawer with a prefilled prompt.
const MAX_TRANSCRIPT = 40;

const agentSlice = createSlice({
  name: "agent",
  initialState: {
    isOpen: false,
    status: "idle", // idle | streaming | error
    error: null,
    messages: [], // UI messages: { id, role, text, tools: [{ id, name, status, label }] }
    transcript: [], // model-facing history returned by the gateway (opaque to the UI)
    draft: "",
  },
  reducers: {
    openAgent: (s, a) => {
      s.isOpen = true;
      if (typeof a.payload === "string") s.draft = a.payload;
    },
    closeAgent: (s) => {
      s.isOpen = false;
    },
    toggleAgent: (s) => {
      s.isOpen = !s.isOpen;
    },
    setDraft: (s, a) => {
      s.draft = a.payload;
    },
    turnStarted: {
      reducer: (s, a) => {
        s.status = "streaming";
        s.error = null;
        s.draft = "";
        s.messages.push({ id: a.payload.userId, role: "user", text: a.payload.text, tools: [] });
        s.messages.push({ id: a.payload.assistantId, role: "assistant", text: "", tools: [] });
      },
      prepare: (text) => ({ payload: { text, userId: nanoid(), assistantId: nanoid() } }),
    },
    textDelta: (s, a) => {
      const last = s.messages[s.messages.length - 1];
      if (last?.role === "assistant") last.text += a.payload;
    },
    toolStarted: (s, a) => {
      const last = s.messages[s.messages.length - 1];
      if (last?.role === "assistant") last.tools.push({ ...a.payload, status: "running" });
    },
    toolFinished: (s, a) => {
      const last = s.messages[s.messages.length - 1];
      const t = last?.tools.find((x) => x.id === a.payload.id);
      if (t) Object.assign(t, a.payload);
    },
    turnCompleted: (s, a) => {
      s.status = "idle";
      s.transcript = [...s.transcript, ...a.payload].slice(-MAX_TRANSCRIPT);
    },
    turnFailed: (s, a) => {
      s.status = "error";
      s.error = a.payload;
    },
    turnAborted: (s) => {
      s.status = "idle";
    },
    resetAgent: (s) => {
      s.messages = [];
      s.transcript = [];
      s.status = "idle";
      s.error = null;
    },
  },
});

export const {
  openAgent, closeAgent, toggleAgent, setDraft, turnStarted, textDelta, toolStarted,
  toolFinished, turnCompleted, turnFailed, turnAborted, resetAgent,
} = agentSlice.actions;
export default agentSlice.reducer;
