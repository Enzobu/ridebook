import { Mail, X } from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { getSession } from "./api.js";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface ApiErrorPayload {
  message?: string;
}

export function AdminMailTest(): ReactElement | null {
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getSession()
      .then((session) => {
        setIsAdmin(session.user?.role === "ADMIN");
        if (session.user?.role === "ADMIN") {
          setRecipient(session.user.email);
        }
      })
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const topbar = document.querySelector(".topbar-actions");
    if (!(topbar instanceof HTMLElement)) {
      return;
    }

    const slot = document.createElement("div");
    slot.className = "mail-test-slot";
    const logoutButton = topbar.querySelector('button[title="Déconnexion"]');
    topbar.insertBefore(slot, logoutButton ?? null);
    setPortalTarget(slot);

    return () => {
      slot.remove();
      setPortalTarget(null);
    };
  }, [isAdmin]);

  if (!isAdmin || !portalTarget) {
    return null;
  }

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setState("sending");
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/mail/test`, {
        body: JSON.stringify({ recipient: recipient.trim(), type: "WORKER_FAILURE" }),
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        method: "POST",
      });

      if (response.ok) {
        setState("success");
        return;
      }

      let message = "Impossible d'envoyer l'email de test.";
      try {
        const payload = (await response.json()) as ApiErrorPayload;
        if (payload.message) {
          message = payload.message;
        }
      } catch {
        // Keep the stable fallback when the API response is not JSON.
      }

      setErrorMessage(message);
      setState("error");
    } catch {
      setErrorMessage("API indisponible pendant l'envoi du test.");
      setState("error");
    }
  };

  return createPortal(
    <>
      <button
        className="secondary-action compact mail-test-trigger"
        onClick={() => {
          setOpen(true);
          setState("idle");
          setErrorMessage("");
        }}
        type="button"
      >
        <Mail size={17} />
        Tester l'envoi de mail
      </button>
      {open && (
        <div className="mail-test-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div aria-labelledby="mail-test-title" aria-modal="true" className="mail-test-dialog" role="dialog">
            <div className="mail-test-header">
              <div>
                <p className="eyebrow">Administration</p>
                <h2 id="mail-test-title">Tester l'envoi de mail</h2>
              </div>
              <button aria-label="Fermer" className="mail-test-close" onClick={() => setOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(event) => void submit(event)}>
              <label>
                Destinataire
                <input required type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} />
              </label>
              <label>
                Type de mail
                <select defaultValue="WORKER_FAILURE">
                  <option value="WORKER_FAILURE">Défaillance du worker</option>
                </select>
              </label>
              {state === "success" && <p className="mail-test-feedback success">Email envoyé avec succès.</p>}
              {state === "error" && <p className="mail-test-feedback error">{errorMessage}</p>}
              <div className="mail-test-actions">
                <button className="secondary-action" onClick={() => setOpen(false)} type="button">Annuler</button>
                <button className="primary-action" disabled={state === "sending"} type="submit">
                  {state === "sending" ? "Envoi..." : "Envoyer le test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>,
    portalTarget,
  );
}
