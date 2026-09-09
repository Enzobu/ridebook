import type { TripDto, UserDto } from "@ridebook/contracts";
import { type ReactElement, useEffect, useState } from "react";

import { getSession, logout } from "./api.js";
import { AppHeader } from "./components/AppHeader.js";
import { InvitationsScreen, LoginScreen, RegisterScreen, type ToastHandler } from "./components/AuthScreens.js";
import { TripDetail, TripForm, TripList } from "./components/TripComponents.js";
import { usePersistentTheme } from "./hooks/usePersistentTheme.js";

type Toast = { message: string; tone: "success" | "error" } | null;
type ViewState =
  | { name: "list" }
  | { name: "detail"; tripId: string }
  | { name: "form"; trip?: TripDto }
  | { name: "invitations" }
  | { name: "login" }
  | { name: "register"; token?: string };

export function App(): ReactElement {
  const [theme, setTheme] = usePersistentTheme();
  const [view, setView] = useState<ViewState>(getInitialView);
  const [user, setUser] = useState<UserDto | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    getSession()
      .then((session) => setUser(session.user))
      .catch(() => setUser(null));
  }, []);

  const showToast: ToastHandler = (message, tone): void => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    setUser(null);
    setView({ name: "list" });
    showToast("Déconnexion effectuée.", "success");
  };

  const goHome = (): void => {
    clearInvitationUrl();
    setView({ name: "list" });
  };

  return (
    <main className="app-shell">
      <AppHeader
        onGoHome={goHome}
        onLogin={() => setView({ name: "login" })}
        onLogout={() => void handleLogout()}
        onNewTrip={() => setView({ name: "form" })}
        onOpenInvitations={() => setView({ name: "invitations" })}
        onThemeChange={setTheme}
        theme={theme}
        user={user}
      />

      {toast && <div className={`toast ${toast.tone}`}>{toast.message}</div>}

      {view.name === "list" && <TripList onOpenTrip={(tripId) => setView({ name: "detail", tripId })} />}
      {view.name === "detail" && (
        <TripDetail
          onBack={() => setView({ name: "list" })}
          onDeleted={() => {
            setView({ name: "list" });
            showToast("Balade supprimée.", "success");
          }}
          onEdit={(trip) => setView({ name: "form", trip })}
          onToast={showToast}
          tripId={view.tripId}
          user={user}
        />
      )}
      {view.name === "form" && (
        <TripForm
          onCancel={() => setView({ name: "list" })}
          onSaved={(trip) => {
            setView({ name: "detail", tripId: trip.id });
            showToast("Balade enregistrée.", "success");
          }}
          onToast={showToast}
          trip={view.trip}
        />
      )}
      {view.name === "login" && (
        <LoginScreen
          onRegister={() => setView({ name: "register" })}
          onSuccess={(sessionUser) => {
            setUser(sessionUser);
            setView({ name: "list" });
            showToast("Connexion réussie.", "success");
          }}
          onToast={showToast}
        />
      )}
      {view.name === "register" && (
        <RegisterScreen
          initialToken={view.token}
          onBack={() => {
            clearInvitationUrl();
            setView({ name: "login" });
          }}
          onSuccess={() => {
            clearInvitationUrl();
            setView({ name: "login" });
            showToast("Compte créé. Tu peux te connecter.", "success");
          }}
          onToast={showToast}
        />
      )}
      {view.name === "invitations" && <InvitationsScreen onToast={showToast} user={user} />}
    </main>
  );
}

function getInitialView(): ViewState {
  if (window.location.pathname === "/invitations/accept") {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    return { name: "register", token };
  }

  return { name: "list" };
}

function clearInvitationUrl(): void {
  if (window.location.pathname === "/invitations/accept") {
    window.history.replaceState({}, "", "/");
  }
}
