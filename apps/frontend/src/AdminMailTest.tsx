import { Mail, X } from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";

import { getSession } from "./api.js";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function AdminMailTest(): ReactElement | null {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");

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

  if (!isAdmin) {
    return null;
  }

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setState("sending");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/mail/test`, {
        body: JSON.stringify({ recipient: recipient.trim(), type: "WORKER_FAILURE" }),
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        method: "POST",
      });

      setState(response.ok ? "success" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <>
      <button className="mail-test-trigger" onClick={() => { setOpen(true); setState("idle"); }} type="button">
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
              {state === "error" && <p className="mail-test-feedback error">Impossible d'envoyer l'email de test.</p>}
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
    </>
  );
}
