import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AdminMailTest } from "./AdminMailTest.js";
import { App } from "./App.js";
import "./styles.css";
import "./admin-mail-test.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
    <AdminMailTest />
  </StrictMode>,
);
