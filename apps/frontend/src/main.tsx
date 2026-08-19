import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AdminMailTest } from "./AdminMailTest.js";
import { App } from "./App.js";
import { InvitationAccept } from "./InvitationAccept.js";
import "./styles.css";
import "./admin-mail-test.css";
import "./style-fixes.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const isInvitationRoute = window.location.pathname === "/invitations/accept";

createRoot(root).render(
  <StrictMode>
    {isInvitationRoute ? (
      <InvitationAccept />
    ) : (
      <>
        <App />
        <AdminMailTest />
      </>
    )}
  </StrictMode>,
);
