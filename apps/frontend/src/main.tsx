import { MapPinned } from "lucide-react";
import { type ReactElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

function App(): ReactElement {
  return (
    <main className="app-shell">
      <section className="intro">
        <div className="brand-mark" aria-hidden="true">
          <MapPinned size={32} strokeWidth={2.2} />
        </div>
        <div>
          <p className="eyebrow">Ridebook</p>
          <h1>Balades moto centralisées</h1>
          <p className="lead">
            Le socle frontend est prêt. Les listes, détails et formulaires seront ajoutés avec les tickets métier.
          </p>
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
