import type { MapStatus, TripDto, TripListDto } from "@ridebook/contracts";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface ListTripsParams {
  order: "asc" | "desc";
  page: number;
  search: string;
  sort: "createdAt" | "name" | "distanceKm" | "durationMinutes";
  status: MapStatus | "";
}

export async function listTrips(params: ListTripsParams, signal?: AbortSignal): Promise<TripListDto> {
  const query = new URLSearchParams({
    limit: "9",
    order: params.order,
    page: String(params.page),
    sort: params.sort,
  });

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  return fetchJson<TripListDto>(`/api/v1/trips?${query.toString()}`, signal);
}

export async function getTrip(id: string, signal?: AbortSignal): Promise<TripDto> {
  return fetchJson<TripDto>(`/api/v1/trips/${id}`, signal);
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error("Impossible de charger les balades.");
  }

  return response.json() as Promise<T>;
}
