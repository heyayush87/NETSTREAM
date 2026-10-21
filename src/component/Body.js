import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Header from "./Header";
import Browse from "./Browse";
import AppShell from "../agent/components/AppShell";

// Created once at module scope: building the router inside render recreated it on every
// Body re-render and reset navigation state.
const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Header /> },
      { path: "/browse", element: <Browse /> },
    ],
  },
]);

const Body = () => <RouterProvider router={appRouter} />;

export default Body;
