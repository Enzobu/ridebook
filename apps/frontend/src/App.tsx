import type { MapStatus, TripDto, UserDto } from "@ridebook/contracts";
import {
  AlertCircle,
  ArrowDownAZ,
  CalendarDays,
  Clock3,
  Edit3,
  ExternalLink,
  Gauge,
  Link2,
  ListFilter,
  Loader2,
  LogOut,
  MapPinned,
  Moon,
  Plus,
  RefreshCw,
  Route,
  Search,
  Sun,
  SunMoon,
  Trash2,
} from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";

import {
  createTrip,
  createInvitation,
  deleteTrip,
  getSession,
  getTrip,
  listTrips,
  login,
  logout,
  registerWithInvitation,
  retryTripMap,
  updateTrip,
  type ListTripsParams,
  type TripFormPayload,
} from "./api.js";

type ThemeChoice = "light" | "dark" | "system";
type ToastTone = "success" | "error";
type Toast = { message: string; tone: "success" | "error" } | null;
type ViewState =
  | { name: "list" }
  | { name: "detail"; tripId: string }
  | { name: "form"; trip?: TripDto }
  | { name: "invitations" }
  | { name: "login" }
  | { name: "register" };

const STATUS_LABELS: Record<MapStatus, string> = {
  FAILED: "Carte en échec",
  PENDING: "Carte en attente",
  PROCESSING: "Carte en cours",
  SUCCESS: "Carte disponible",
};

const THEME_OPTIONS: Array<{ icon: ReactElement; label: string; value: ThemeChoice }> = [
  { icon: <Sun size={16} />, label: "Clair", value: "light" },
  { icon: <Moon size={16} />, label: "Sombre", value: "dark" },
  { icon: <SunMoon size={16} />, label: "Système", value: "system" },
];

export function App(): ReactElement {
  const [theme, setTheme] = usePersistentTheme();
  const [view, setView] = useState<ViewState>({ name: "list" });
  const [user, setUser] = useState<UserDto | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    getSession()
      .then((session) => setUser(session.user))
      .catch(() => setUser(null));
  }, []);

  const showToast = (message: string, tone: ToastTone): void => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    setUser(null);
    setView({ name: "list" });
    showToast("Déconnexion effectuée.", "success");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setView({ name: "list" })}>
          <span className="brand-mark" aria-hidden="true">
            <MapPinned size={22} />
          </span>
          <span>Ridebook</span>
        </button>
        <div className="topbar-actions">
          {user ? (
            <>
              <button className="secondary-action compact" onClick={() => setView({ name: "form" })} type="button">
                <Plus size={16} />
                Nouvelle balade
              </button>
              {user.role === "ADMIN" && (
                <button className="secondary-action compact" onClick={() => setView({ name: "invitations" })} type="button">
                  <Link2 size={16} />
                  Invitations
                </button>
              )}
              <button className="icon-button" onClick={handleLogout} title="Déconnexion" type="button">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button className="secondary-action compact" onClick={() => setView({ name: "login" })} type="button">
              Connexion
            </button>
          )}
          <div className="theme-switcher" aria-label="Thème">
            {THEME_OPTIONS.map((option) => (
              <button
                aria-label={option.label}
                className={theme === option.value ? "icon-button active" : "icon-button"}
                key={option.value}
                onClick={() => setTheme(option.value)}
                title={option.label}
                type="button"
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>
      </header>

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
          onBack={() => setView({ name: "login" })}
          onSuccess={() => {
            setView({ name: "login" });
            showToast("Compte créé. Tu peux te connecter.", "success");
          }}
          onToast={showToast}
        />
      )}
      {view.name === "invitations" && (
        <InvitationsScreen
          onToast={showToast}
          user={user}
        />
      )}
    </main>
  );
}

function TripList({ onOpenTrip }: { onOpenTrip: (tripId: string) => void }): ReactElement {
  const [params, setParams] = useState<ListTripsParams>({
    order: "desc",
    page: 1,
    search: "",
    sort: "createdAt",
    status: "",
  });
  const [trips, setTrips] = useState<TripDto[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    listTrips(params, controller.signal)
      .then((result) => {
        setTrips((currentTrips) => (params.page === 1 ? result.items : [...currentTrips, ...result.items]));
        setTotal(result.total);
        setState("idle");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setState("error");
      });

    return () => controller.abort();
  }, [params]);

  return (
    <section className="content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Balades publiques</p>
          <h1>Choisir un trajet</h1>
        </div>
        <p className="result-count">{total} balade{total > 1 ? "s" : ""}</p>
      </div>
      <TripFilters params={params} setParams={setParams} />
      {state === "loading" && <LoadingState label="Chargement des balades" />}
      {state === "error" && <ErrorState />}
      {state === "idle" && trips.length === 0 && <EmptyState />}
      {state === "idle" && trips.length > 0 && (
        <>
          <div className="trip-grid">
            {trips.map((trip) => (
              <TripCard key={trip.id} onOpen={() => onOpenTrip(trip.id)} trip={trip} />
            ))}
          </div>
          {trips.length < total && (
            <button className="load-more" onClick={() => setParams({ ...params, page: params.page + 1 })} type="button">
              Charger plus
            </button>
          )}
        </>
      )}
    </section>
  );
}

function TripFilters({
  params,
  setParams,
}: {
  params: ListTripsParams;
  setParams: (params: ListTripsParams) => void;
}): ReactElement {
  return (
    <div className="filters" aria-label="Filtres">
      <label className="search-field">
        <Search size={18} />
        <input
          onChange={(event) => setParams({ ...params, page: 1, search: event.target.value })}
          placeholder="Rechercher une balade"
          value={params.search}
        />
      </label>
      <label className="select-field">
        <ListFilter size={18} />
        <select
          onChange={(event) => setParams({ ...params, page: 1, status: event.target.value as MapStatus | "" })}
          value={params.status}
        >
          <option value="">Tous statuts</option>
          <option value="SUCCESS">Carte disponible</option>
          <option value="PENDING">En attente</option>
          <option value="PROCESSING">En cours</option>
          <option value="FAILED">En échec</option>
        </select>
      </label>
      <label className="select-field">
        <ArrowDownAZ size={18} />
        <select
          onChange={(event) =>
            setParams({ ...params, page: 1, sort: event.target.value as ListTripsParams["sort"] })
          }
          value={params.sort}
        >
          <option value="createdAt">Plus récentes</option>
          <option value="name">Nom</option>
          <option value="distanceKm">Distance</option>
          <option value="durationMinutes">Durée</option>
        </select>
      </label>
    </div>
  );
}

function TripCard({ onOpen, trip }: { onOpen: () => void; trip: TripDto }): ReactElement {
  return (
    <article className="trip-card">
      <div className="trip-card-header">
        <h2>{trip.name}</h2>
        <StatusBadge status={trip.mapStatus} />
      </div>
      <p className="trip-description">{trip.description ?? "Aucune description renseignée."}</p>
      <TripStats trip={trip} />
      <button className="secondary-action" onClick={onOpen} type="button">
        Voir le détail
      </button>
    </article>
  );
}

function TripDetail({
  onBack,
  onDeleted,
  onEdit,
  onToast,
  tripId,
  user,
}: {
  onBack: () => void;
  onDeleted: () => void;
  onEdit: (trip: TripDto) => void;
  onToast: (message: string, tone: "success" | "error") => void;
  tripId: string;
  user: UserDto | null;
}): ReactElement {
  const [trip, setTrip] = useState<TripDto | null>(null);
  const [state, setState] = useState<"loading" | "error" | "idle">("loading");

  useEffect(() => {
    const controller = new AbortController();
    void loadTrip(tripId, controller.signal, setTrip, setState);
    return () => controller.abort();
  }, [tripId]);

  useEffect(() => {
    if (!trip || (trip.mapStatus !== "PENDING" && trip.mapStatus !== "PROCESSING")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void getTrip(tripId).then(setTrip).catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [trip, tripId]);

  if (state === "loading") {
    return <LoadingState label="Chargement de la balade" />;
  }

  if (state === "error" || !trip) {
    return <ErrorState />;
  }

  const canManage = Boolean(user && (user.role === "ADMIN" || user.id === trip.ownerId));

  return (
    <section className="content detail-layout">
      <button className="back-button" onClick={onBack} type="button">
        Retour aux balades
      </button>
      <div className="detail-header">
        <div>
          <p className="eyebrow">Détail balade</p>
          <h1>{trip.name}</h1>
        </div>
        <div className="action-row">
          {canManage && (
            <>
              <button className="secondary-action compact" onClick={() => onEdit(trip)} type="button">
                <Edit3 size={16} />
                Modifier
              </button>
              <button className="secondary-action compact danger" onClick={() => void confirmDelete(trip, onDeleted, onToast)} type="button">
                <Trash2 size={16} />
                Supprimer
              </button>
            </>
          )}
          <a className="primary-action" href={trip.googleMapsUrl} rel="noopener noreferrer" target="_blank">
            <ExternalLink size={18} />
            Ouvrir dans Google Maps
          </a>
        </div>
      </div>
      <TripStats trip={trip} />
      <p className="detail-description">{trip.description ?? "Aucune description renseignée."}</p>
      <MapPanel onRetry={() => void retryMap(trip, setTrip, onToast)} trip={trip} canRetry={canManage} />
    </section>
  );
}

async function loadTrip(
  tripId: string,
  signal: AbortSignal,
  setTrip: (trip: TripDto) => void,
  setState: (state: "loading" | "error" | "idle") => void,
): Promise<void> {
  setState("loading");
  try {
    setTrip(await getTrip(tripId, signal));
    setState("idle");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    setState("error");
  }
}

async function confirmDelete(
  trip: TripDto,
  onDeleted: () => void,
  onToast: (message: string, tone: "success" | "error") => void,
): Promise<void> {
  if (!window.confirm(`Supprimer la balade "${trip.name}" ?`)) {
    return;
  }

  try {
    await deleteTrip(trip.id);
    onDeleted();
  } catch {
    onToast("Suppression impossible.", "error");
  }
}

async function retryMap(
  trip: TripDto,
  setTrip: (trip: TripDto) => void,
  onToast: (message: string, tone: "success" | "error") => void,
): Promise<void> {
  try {
    setTrip(await retryTripMap(trip.id));
    onToast("Récupération relancée.", "success");
  } catch {
    onToast("Relance impossible.", "error");
  }
}

function TripForm({
  onCancel,
  onSaved,
  onToast,
  trip,
}: {
  onCancel: () => void;
  onSaved: (trip: TripDto) => void;
  onToast: (message: string, tone: "success" | "error") => void;
  trip?: TripDto;
}): ReactElement {
  const [form, setForm] = useState({
    description: trip?.description ?? "",
    distanceKm: trip?.distanceKm?.toString() ?? "",
    durationMinutes: trip?.durationMinutes?.toString() ?? "",
    googleMapsUrl: trip?.googleMapsUrl ?? "",
    name: trip?.name ?? "",
  });

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const payload: TripFormPayload = {
      description: form.description || undefined,
      distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      googleMapsUrl: form.googleMapsUrl,
      name: form.name,
    };

    try {
      onSaved(trip ? await updateTrip(trip.id, payload) : await createTrip(payload));
    } catch {
      onToast("Enregistrement impossible. Vérifie les champs.", "error");
    }
  };

  return (
    <section className="content narrow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{trip ? "Modifier" : "Créer"}</p>
          <h1>{trip ? "Modifier la balade" : "Nouvelle balade"}</h1>
        </div>
      </div>
      <form className="form-panel" onSubmit={(event) => void submit(event)}>
        <label>
          Nom
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          Lien Google Maps
          <input
            required
            value={form.googleMapsUrl}
            onChange={(event) => setForm({ ...form, googleMapsUrl: event.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            Distance km
            <input
              min="0"
              step="0.1"
              type="number"
              value={form.distanceKm}
              onChange={(event) => setForm({ ...form, distanceKm: event.target.value })}
            />
          </label>
          <label>
            Durée minutes
            <input
              min="0"
              type="number"
              value={form.durationMinutes}
              onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
            />
          </label>
        </div>
        <div className="action-row">
          <button className="primary-action" type="submit">
            Enregistrer
          </button>
          <button className="secondary-action" onClick={onCancel} type="button">
            Annuler
          </button>
        </div>
      </form>
    </section>
  );
}

function LoginScreen({
  onRegister,
  onSuccess,
  onToast,
}: {
  onRegister: () => void;
  onSuccess: (user: UserDto) => void;
  onToast: (message: string, tone: "success" | "error") => void;
}): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      onSuccess((await login(email, password)).user);
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
          <button className="primary-action" type="submit">
            Se connecter
          </button>
          <button className="secondary-action" type="button" onClick={onRegister}>
            Créer via invitation
          </button>
        </div>
      </form>
    </section>
  );
}

function RegisterScreen({
  onBack,
  onSuccess,
  onToast,
}: {
  onBack: () => void;
  onSuccess: () => void;
  onToast: (message: string, tone: "success" | "error") => void;
}): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      await registerWithInvitation(email, password, extractInvitationToken(token));
      onSuccess();
    } catch {
      onToast("Invitation invalide ou expirée.", "error");
    }
  };

  return (
    <section className="content narrow">
      <h1>Créer un compte</h1>
      <form className="form-panel" onSubmit={(event) => void submit(event)}>
        <label>
          Email
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Mot de passe
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label>
          Lien ou token d'invitation
          <input required value={token} onChange={(event) => setToken(event.target.value)} />
        </label>
        <div className="action-row">
          <button className="primary-action" type="submit">
            Créer le compte
          </button>
          <button className="secondary-action" type="button" onClick={onBack}>
            Retour
          </button>
        </div>
      </form>
    </section>
  );
}

function InvitationsScreen({
  onToast,
  user,
}: {
  onToast: (message: string, tone: "success" | "error") => void;
  user: UserDto | null;
}): ReactElement {
  const [email, setEmail] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");

  if (user?.role !== "ADMIN") {
    return (
      <section className="content narrow">
        <ErrorState />
      </section>
    );
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
      <div className="section-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Invitations</h1>
        </div>
      </div>
      <form className="form-panel" onSubmit={(event) => void submit(event)}>
        <p className="form-hint">Le lien est valide 1 heure et utilisable une seule fois.</p>
        <label>
          Email optionnel
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button className="primary-action" type="submit">
          Générer un lien
        </button>
        {invitationUrl && (
          <div className="copy-row">
            <input readOnly value={invitationUrl} aria-label="Lien d'invitation généré" />
            <button className="secondary-action compact" onClick={() => void copy()} type="button">
              Copier
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

function TripStats({ trip }: { trip: TripDto }): ReactElement {
  return (
    <dl className="stats">
      <div>
        <Gauge size={18} />
        <dt>Distance</dt>
        <dd>{formatDistance(trip.distanceKm)}</dd>
      </div>
      <div>
        <Clock3 size={18} />
        <dt>Durée</dt>
        <dd>{formatDuration(trip.durationMinutes)}</dd>
      </div>
      <div>
        <CalendarDays size={18} />
        <dt>Ajout</dt>
        <dd>{formatDate(trip.createdAt)}</dd>
      </div>
    </dl>
  );
}

function MapPanel({
  canRetry,
  onRetry,
  trip,
}: {
  canRetry: boolean;
  onRetry: () => void;
  trip: TripDto;
}): ReactElement {
  if (trip.mapEmbedUrl && trip.mapStatus === "SUCCESS") {
    return <iframe className="map-frame" loading="lazy" src={trip.mapEmbedUrl} title={`Carte de ${trip.name}`} />;
  }

  return (
    <div className="map-placeholder">
      <Route size={28} />
      <StatusBadge status={trip.mapStatus} />
      {trip.mapLastError ? <p>{trip.mapLastError}</p> : <p>La carte sera affichée dès que le worker aura terminé.</p>}
      {canRetry && trip.mapStatus === "FAILED" && (
        <button className="secondary-action compact" onClick={onRetry} type="button">
          <RefreshCw size={16} />
          Réessayer
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MapStatus }): ReactElement {
  return <span className={`status-badge ${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>;
}

function LoadingState({ label }: { label: string }): ReactElement {
  return (
    <div className="state-message">
      <Loader2 className="spin" size={24} />
      <p>{label}</p>
    </div>
  );
}

function ErrorState(): ReactElement {
  return (
    <div className="state-message error">
      <AlertCircle size={24} />
      <p>Impossible de charger les données. Réessaie dans un instant.</p>
    </div>
  );
}

function EmptyState(): ReactElement {
  return (
    <div className="state-message">
      <MapPinned size={24} />
      <p>Aucune balade disponible pour le moment.</p>
    </div>
  );
}

function usePersistentTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const storedTheme = localStorage.getItem("ridebook-theme");
    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
  });

  useEffect(() => {
    localStorage.setItem("ridebook-theme", theme);
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  return [theme, setTheme];
}

function formatDistance(distanceKm: number | null): string {
  return distanceKm === null ? "Non renseignée" : `${distanceKm.toLocaleString("fr-FR")} km`;
}

function formatDuration(durationMinutes: number | null): string {
  if (durationMinutes === null) {
    return "Non renseignée";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return hours === 0 ? `${minutes} min` : `${hours} h ${minutes.toString().padStart(2, "0")}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function extractInvitationToken(value: string): string {
  try {
    const parsed = new URL(value);
    return parsed.searchParams.get("token") ?? value;
  } catch {
    return value;
  }
}
