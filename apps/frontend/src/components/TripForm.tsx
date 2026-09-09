import type { TripDto } from "@ridebook/contracts";
import { type FormEvent, type ReactElement, useState } from "react";

import { createTrip, updateTrip, type TripFormPayload } from "../api.js";
import type { ToastHandler } from "./AuthScreens.js";
import "./TripForm.css";

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
    autoTitle: false,
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
      name: form.autoTitle && !trip ? undefined : form.name,
      ...(trip ? {} : { autoTitle: form.autoTitle }),
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
        {!trip && (
          <label className="auto-title-option">
            <input
              checked={form.autoTitle}
              onChange={(event) => setForm({ ...form, autoTitle: event.target.checked })}
              type="checkbox"
            />
            <span>
              <strong>Définir le titre automatiquement</strong>
              <small>Le titre sera construit à partir des étapes clés détectées par Google Maps.</small>
            </span>
          </label>
        )}
        <label>
          Nom
          <input
            disabled={!trip && form.autoTitle}
            placeholder={!trip && form.autoTitle ? "Généré automatiquement après analyse" : undefined}
            required={Boolean(trip) || !form.autoTitle}
            value={!trip && form.autoTitle ? "" : form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
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
