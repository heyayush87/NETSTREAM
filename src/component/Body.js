import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Header from "./Header";
import Browse from "./Browse";
import AppShell from "../agent/components/AppShell";
import { RequireAuth, RedirectIfAuthed } from "./AuthGate";
import WatchParty from "../agent/components/WatchParty";

// Created once at module scope: building the router inside render recreated it on every
// Body re-render and reset navigation state.
const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: "/",
        element: (
          <RedirectIfAuthed>
            <Header />
          </RedirectIfAuthed>
        ),
      },
      {
        path: "/browse",
        element: (
          <RequireAuth>
            <Browse />
          </RequireAuth>
        ),
      },
      { path: "/party/:partyId", element: <WatchParty /> },
    ],
  },
]);

const Body = () => <RouterProvider router={appRouter} />;

export default Body;
