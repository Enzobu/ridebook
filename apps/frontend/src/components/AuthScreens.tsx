import type { UserDto } from "@ridebook/contracts";
import { type FormEvent, type ReactElement, useState } from "react";

import { ApiError, createInvitation, login, registerWithInvitation } from "../api.js";
import { ErrorState } from "./TripComponents.js";

export interface ToastHandler {
  (message: string, tone: "success" | "error"): void;
}

export function LoginScreen({
  onRegister,
  onSuccess,
  onToast,
}: {
  onRegister: () => void;
  onSuccess: (user: UserDto) => void;
  onToast: ToastHandler;
}): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      const session = await login(email, password);
      if (!session.user) {
        throw new Error("Missing authenticated user.");
      }
      onSuccess(session.user);
    } catch {
      onToast("Identifiants invalides.", "error");
    }
  };

  return (
    <section className="content narrow">
      <h1>Connexion</h1>
      <form className="form-panel" onSubmit={(event) => void submit(event)}>
        <label>
          Email
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Mot de passe
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <div className="action-row">
          <button className="primary-action" type="submit">Se connecter</button>
          <button className="secondary-action" type="button" onClick={onRegister}>Créer via invitation</button>
        </div>
      </form>
    </section>
  );
}

export function RegisterScreen({
  initialToken = "",
  onBack,
  onSuccess,
  onToast,
}: {
  initialToken?: string;
  onBack: () => void;
  onSuccess: () => void;
  onToast: ToastHandler;
}): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(initialToken);
  const [formError, setFormError] = useState("");

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedToken = extractInvitationToken(token.trim());

    if (!isValidEmail(normalizedEmail)) {
      setFormError("L’adresse email est invalide.");
      return;
    }
    if (password.length < 12) {
      setFormError("Le mot de passe doit contenir au moins 12 caractères.");
      return;
    }
    if (normalizedToken.length < 32) {
      setFormError("Le lien ou token d’invitation est invalide.");
      return;
    }

    setFormError("");
    try {
      await registerWithInvitation(normalizedEmail, password, normalizedToken);
      onSuccess();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Impossible de créer le compte.";
      setFormError(message);
      onToast(message, "error");
    }
  };

  return (
    <section className="content narrow">
      <h1>Créer un compte</h1>
      <form className="form-panel" noValidate onSubmit={(event) => void submit(event)}>
        <label>
          Email
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Mot de passe
          <input aria-describedby="password-hint" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <span className="form-hint" id="password-hint">12 caractères minimum.</span>
        <label>
          Lien ou token d'invitation
          <input required value={token} onChange={(event) => setToken(event.target.value)} />
        </label>
        {formError && <p className="form-hint" role="alert">{formError}</p>}
        <div className="action-row">
          <button className="primary-action" type="submit">Créer le compte</button>
          <button className="secondary-action" type="button" onClick={onBack}>Retour</button>
        </div>
      </form>
    </section>
  );
}

export function InvitationsScreen({ onToast, user }: { onToast: ToastHandler; user: UserDto | null }): ReactElement {
  const [email, setEmail] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");

  if (user?.role !== "ADMIN") {
    return <section className="content narrow"><ErrorState /></section>;
  }

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      const invitation = await createInvitation(email || undefined);
      setInvitationUrl(invitation.invitationUrl);
      onToast("Invitation générée.", "success");
    } catch {
      onToast("Impossible de générer l'invitation.", "error");
    }
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      onToast("Lien copié.", "success");
    } catch {
      onToast("Copie impossible.", "error");
    }
  };

  return (
    <section className="content narrow">
      <div className="section-heading"><div><p className="eyebrow">Administration</p><h1>Invitations</h1></div></div>
      <form className="form-panel" onSubmit={(event) => void submit(event)}>
        <p className="form-hint">Le lien est valide 1 heure et utilisable une seule fois.</p>
        <label>
          Email optionnel
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button className="primary-action" type="submit">Générer un lien</button>
        {invitationUrl && (
          <div className="copy-row">
            <input readOnly value={invitationUrl} aria-label="Lien d'invitation généré" />
            <button className="secondary-action compact" onClick={() => void copy()} type="button">Copier</button>
          </div>
        )}
      </form>
    </section>
  );
}

function extractInvitationToken(value: string): string {
  try {
    const parsed = new URL(value);
    return parsed.searchParams.get("token") ?? value;
  } catch {
    return value;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}
