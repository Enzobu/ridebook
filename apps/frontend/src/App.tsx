import type { MapStatus, TripDto } from "@ridebook/contracts";
import {
  AlertCircle,
  ArrowDownAZ,
  CalendarDays,
  Clock3,
  ExternalLink,
  Gauge,
  ListFilter,
  Loader2,
  MapPinned,
  Moon,
  Route,
  Search,
  Sun,
  SunMoon,
} from "lucide-react";
import { type ReactElement, useEffect, useMemo, useState } from "react";

import { getTrip, listTrips, type ListTripsParams } from "./api.js";

type ThemeChoice = "light" | "dark" | "system";
type ViewState =
  | { name: "list" }
  | { name: "detail"; tripId: string };

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

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setView({ name: "list" })}>
          <span className="brand-mark" aria-hidden="true">
            <MapPinned size={22} />
          </span>
          <span>Ridebook</span>
        </button>
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
      </header>

      {view.name === "list" ? (
        <TripList onOpenTrip={(tripId) => setView({ name: "detail", tripId })} />
      ) : (
        <TripDetail onBack={() => setView({ name: "list" })} tripId={view.tripId} />
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

  const canLoadMore = trips.length < total;

  return (
    <section className="content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Balades publiques</p>
          <h1>Choisir un trajet</h1>
        </div>
        <p className="result-count">{total} balade{total > 1 ? "s" : ""}</p>
      </div>

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
            onChange={(event) =>
              setParams({ ...params, page: 1, status: event.target.value as MapStatus | "" })
            }
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
          {canLoadMore && (
            <button
              className="load-more"
              onClick={() => setParams({ ...params, page: params.page + 1 })}
              type="button"
            >
              Charger plus
            </button>
          )}
        </>
      )}
    </section>
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

function TripDetail({ onBack, tripId }: { onBack: () => void; tripId: string }): ReactElement {
  const [trip, setTrip] = useState<TripDto | null>(null);
  const [state, setState] = useState<"loading" | "error" | "idle">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    getTrip(tripId, controller.signal)
      .then((result) => {
        setTrip(result);
        setState("idle");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setState("error");
      });

    return () => controller.abort();
  }, [tripId]);

  if (state === "loading") {
    return <LoadingState label="Chargement de la balade" />;
  }

  if (state === "error" || !trip) {
    return <ErrorState />;
  }

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
        <a className="primary-action" href={trip.googleMapsUrl} rel="noopener noreferrer" target="_blank">
          <ExternalLink size={18} />
          Ouvrir dans Google Maps
        </a>
      </div>
      <TripStats trip={trip} />
      <p className="detail-description">{trip.description ?? "Aucune description renseignée."}</p>
      <MapPanel trip={trip} />
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

function MapPanel({ trip }: { trip: TripDto }): ReactElement {
  if (trip.mapEmbedUrl && trip.mapStatus === "SUCCESS") {
    return (
      <iframe
        className="map-frame"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={trip.mapEmbedUrl}
        title={`Carte de ${trip.name}`}
      />
    );
  }

  return (
    <div className="map-placeholder">
      <Route size={28} />
      <StatusBadge status={trip.mapStatus} />
      {trip.mapLastError ? <p>{trip.mapLastError}</p> : <p>La carte sera affichée dès que le worker aura terminé.</p>}
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

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} h ${minutes.toString().padStart(2, "0")}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}
