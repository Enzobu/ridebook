import type { MapStatus, TripDto, UserDto } from "@ridebook/contracts";
import {
  AlertCircle,
  ArrowDownAZ,
  CalendarDays,
  Clock3,
  Edit3,
  ExternalLink,
  Gauge,
  ListFilter,
  Loader2,
  MapPinned,
  RefreshCw,
  Route,
  Search,
  Trash2,
} from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";

import {
  createTrip,
  deleteTrip,
  getTrip,
  listTrips,
  retryTripMap,
  updateTrip,
  type ListTripsParams,
  type TripFormPayload,
} from "../api.js";
import type { ToastHandler } from "./AuthScreens.js";

const STATUS_LABELS: Record<MapStatus, string> = {
  FAILED: "Carte en échec",
  PENDING: "Carte en attente",
  PROCESSING: "Carte en cours",
  SUCCESS: "Carte disponible",
};

export function TripList({ onOpenTrip }: { onOpenTrip: (tripId: string) => void }): ReactElement {
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

function TripFilters({ params, setParams }: { params: ListTripsParams; setParams: (params: ListTripsParams) => void }): ReactElement {
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
          onChange={(event) => setParams({ ...params, page: 1, sort: event.target.value as ListTripsParams["sort"] })}
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
      <button className="secondary-action" onClick={onOpen} type="button">Voir le détail</button>
    </article>
  );
}

export function TripDetail({
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
  onToast: ToastHandler;
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
      <button className="back-button" onClick={onBack} type="button">Retour aux balades</button>
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

export function TripForm({
  onCancel,
  onSaved,
  onToast,
  trip,
}: {
  onCancel: () => void;
  onSaved: (trip: TripDto) => void;
  onToast: ToastHandler;
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
      <div className="section-heading"><div><p className="eyebrow">{trip ? "Modifier" : "Créer"}</p><h1>{trip ? "Modifier la balade" : "Nouvelle balade"}</h1></div></div>
      <form className="form-panel" onSubmit={(event) => void submit(event)}>
        <label>
          Nom
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          Lien Google Maps
          <input required value={form.googleMapsUrl} onChange={(event) => setForm({ ...form, googleMapsUrl: event.target.value })} />
        </label>
        <label>
          Description
          <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <div className="form-grid">
          <label>
            Distance km
            <input min="0" step="0.1" type="number" value={form.distanceKm} onChange={(event) => setForm({ ...form, distanceKm: event.target.value })} />
          </label>
          <label>
            Durée minutes
            <input min="0" type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
          </label>
        </div>
        <div className="action-row">
          <button className="primary-action" type="submit">Enregistrer</button>
          <button className="secondary-action" onClick={onCancel} type="button">Annuler</button>
        </div>
      </form>
    </section>
  );
}

function TripStats({ trip }: { trip: TripDto }): ReactElement {
  return (
    <dl className="stats">
      <div><Gauge size={18} /><dt>Distance</dt><dd>{formatDistance(trip.distanceKm)}</dd></div>
      <div><Clock3 size={18} /><dt>Durée</dt><dd>{formatDuration(trip.durationMinutes)}</dd></div>
      <div><CalendarDays size={18} /><dt>Ajout</dt><dd>{formatDate(trip.createdAt)}</dd></div>
    </dl>
  );
}

function MapPanel({ canRetry, onRetry, trip }: { canRetry: boolean; onRetry: () => void; trip: TripDto }): ReactElement {
  if (trip.mapEmbedUrl && trip.mapStatus === "SUCCESS") {
    return (
      <iframe
        className="map-frame"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
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
  return <div className="state-message"><Loader2 className="spin" size={24} /><p>{label}</p></div>;
}

export function ErrorState(): ReactElement {
  return <div className="state-message error"><AlertCircle size={24} /><p>Impossible de charger les données. Réessaie dans un instant.</p></div>;
}

function EmptyState(): ReactElement {
  return <div className="state-message"><MapPinned size={24} /><p>Aucune balade disponible pour le moment.</p></div>;
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

async function confirmDelete(trip: TripDto, onDeleted: () => void, onToast: ToastHandler): Promise<void> {
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

async function retryMap(trip: TripDto, setTrip: (trip: TripDto) => void, onToast: ToastHandler): Promise<void> {
  try {
    setTrip(await retryTripMap(trip.id));
    onToast("Récupération relancée.", "success");
  } catch {
    onToast("Relance impossible.", "error");
  }
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
