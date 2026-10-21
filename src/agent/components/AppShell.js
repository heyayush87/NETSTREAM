import React from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import AgentDrawer from "./AgentDrawer";
import PlayerModal from "./PlayerModal";

// Layout route: the drawer and player live above every page, inside the router
// (so the agent can navigate) and inside the Redux Provider (so it can dispatch).
const AppShell = () => {
  const user = useSelector((s) => s.user);
  return (
    <>
      <Outlet />
      <PlayerModal />
      {user && <AgentDrawer />}
    </>
  );
};

export default AppShell;
