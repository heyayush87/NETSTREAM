import React from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import AgentDrawer from "./AgentDrawer";
import PlayerModal from "./PlayerModal";

// The "Ask NETSTREAM" assistant is off unless REACT_APP_ENABLE_ASSISTANT=true is set at build time.
// Everything else (AI Search page, browse, player, trailers) works without it.
const assistantEnabled = () => process.env.REACT_APP_ENABLE_ASSISTANT === "true";

// Layout route: the drawer and player live above every page, inside the router
// (so the agent can navigate) and inside the Redux Provider (so it can dispatch).
const AppShell = () => {
  const user = useSelector((s) => s.user);
  return (
    <>
      <Outlet />
      <PlayerModal />
      {assistantEnabled() && user && <AgentDrawer />}
    </>
  );
};

export default AppShell;
