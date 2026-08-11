import { MapPinned } from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";

import { ApiError, registerWithInvitation, resolveInvitation } from "./api.js";

export function InvitationAccept(): ReactElement {
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"loading" | "idle" | "sending" | "success" | "error">("loading");
  const [invitationReady, setInvitationReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedTheme = localStorage.getItem("ridebook-theme");
    document.documentElement.dataset["theme"] = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : "system";

    const controller = new AbortController();
    if (token.length < 32) {
      setMessage("Le lien d’invitation est invalide.");
      setState("error");
      return () => controller.abort();
    }

    resolveInvitation(token, controller.signal)
      .then((invitation) => {
        setEmail(invitation.email);
        setInvitationReady(true);
        setState("idle");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMessage(error instanceof ApiError ? error.message : "Impossible de vérifier l’invitation.");
        setState("error");
      });

    return () => controller.abort();
  }, [token]);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setMessage("");
    setState("sending");

    try {
      await registerWithInvitation(password, token);
      setState("success");
      window.history.replaceState({}, "", "/");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Impossible de créer le compte.");
      setState("error");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true"><MapPinned size={22} /></span>
          <span>Ridebook</span>
        </a>
      </header>

      <section className="content narrow">
        <p className="eyebrow">Invitation</p>
        <h1>Créer mon compte</h1>

        {state === "success" ? (
          <div className="form-panel">
            <p>Ton compte a bien été créé.</p>
            <a className="primary-action" href="/">Retour à Ridebook</a>
          </div>
        ) : (
          <form className="form-panel" noValidate onSubmit={(event) => void submit(event)}>
            <label>
              Email
              <input aria-label="Email" readOnly required type="email" value={email} />
            </label>
            <label>
              Mot de passe
              <input
                aria-describedby="password-requirements"
                autoComplete="new-password"
                disabled={!invitationReady || state === "sending"}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <span className="form-hint" id="password-requirements">
              12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
            </span>
            {state === "loading" && <p className="form-hint">Vérification de l’invitation...</p>}
            {message && <p className="form-hint" role="alert">{message}</p>}
            <button className="primary-action" disabled={!invitationReady || state === "sending"} type="submit">
              {state === "sending" ? "Création..." : "Créer mon compte"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
