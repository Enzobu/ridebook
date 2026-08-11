import type { AuthSessionDto, InvitationDto, MapStatus, TripDto, TripListDto } from "@ridebook/contracts";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiErrorPayload {
  message?: string | string[];
}

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
  const passwordError = getPasswordPolicyError(password);
  if (passwordError) {
    throw new ApiError(0, passwordError);
  }

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
    throw await createApiError(response);
  }

  const body = await response.text();
  if (!body) {
    return undefined as T;
  }

  return JSON.parse(body) as T;
}

async function createApiError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    // Empty/malformed error body: use a stable fallback below.
  }

  const rawMessages = Array.isArray(payload?.message)
    ? payload.message
    : payload?.message
      ? [payload.message]
      : [];

  const message = rawMessages.length
    ? rawMessages.map(translateValidationMessage).join(" ")
    : response.status >= 500
      ? "Une erreur serveur est survenue."
      : "La requête a échoué.";

  return new ApiError(response.status, message);
}

function translateValidationMessage(message: string): string {
  const translations: Record<string, string> = {
    "email must be an email": "L’adresse email est invalide.",
    "password must be longer than or equal to 12 characters":
      "Le mot de passe doit contenir au moins 12 caractères.",
    "token must be longer than or equal to 32 characters":
      "Le lien ou token d’invitation est invalide.",
  };

  return translations[message] ?? message;
}

function getPasswordPolicyError(password: string): string | null {
  if (password.length < 12) {
    return "Le mot de passe doit contenir au moins 12 caractères.";
  }

  if (!/\p{Lu}/u.test(password)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }

  if (!/\p{Ll}/u.test(password)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }

  if (!/\p{N}/u.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }

  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    return "Le mot de passe doit contenir au moins un caractère spécial.";
  }

  return null;
}
