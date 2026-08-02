import type { AuthSessionDto, InvitationDto, MapStatus, TripDto, TripListDto } from "@ridebook/contracts";

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

  return requestJson<TripListDto>(`/api/v1/trips?${query.toString()}`, signal);
}

export async function getTrip(id: string, signal?: AbortSignal): Promise<TripDto> {
  return requestJson<TripDto>(`/api/v1/trips/${id}`, signal);
}

export interface TripFormPayload {
  description?: string;
  distanceKm?: number;
  durationMinutes?: number;
  googleMapsUrl: string;
  name: string;
}

export async function createTrip(payload: TripFormPayload): Promise<TripDto> {
  return requestJson<TripDto>("/api/v1/trips", undefined, {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export async function updateTrip(id: string, payload: TripFormPayload): Promise<TripDto> {
  return requestJson<TripDto>(`/api/v1/trips/${id}`, undefined, {
    body: JSON.stringify(payload),
    method: "PATCH",
  });
}

export async function deleteTrip(id: string): Promise<void> {
  await requestJson<void>(`/api/v1/trips/${id}`, undefined, { method: "DELETE" });
}

export async function retryTripMap(id: string): Promise<TripDto> {
  return requestJson<TripDto>(`/api/v1/trips/${id}/map/retry`, undefined, { method: "POST" });
}

export async function getSession(): Promise<AuthSessionDto> {
  return requestJson<AuthSessionDto>("/api/v1/auth/me");
}

export async function login(email: string, password: string): Promise<AuthSessionDto> {
  return requestJson<AuthSessionDto>("/api/v1/auth/login", undefined, {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });
}

export async function logout(): Promise<void> {
  await requestJson<void>("/api/v1/auth/logout", undefined, { method: "POST" });
}

export async function registerWithInvitation(email: string, password: string, token: string): Promise<void> {
  await requestJson<void>("/api/v1/auth/register", undefined, {
    body: JSON.stringify({ email, password, token }),
    method: "POST",
  });
}

export async function createInvitation(email?: string): Promise<InvitationDto> {
  return requestJson<InvitationDto>("/api/v1/invitations", undefined, {
    body: JSON.stringify(email ? { email } : {}),
    method: "POST",
  });
}

async function requestJson<T>(path: string, signal?: AbortSignal, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...init,
    signal,
  });

  if (!response.ok) {
    throw new Error("Impossible de charger les balades.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
