export type UserRole = "ADMIN" | "USER";

export type MapStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface HealthDto {
  status: "ok";
  service: string;
}

export interface UserDto {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionDto {
  user: UserDto;
}

export interface InvitationDto {
  id: string;
  invitationUrl: string;
  expiresAt: string;
  createdAt: string;
}

export interface TripDto {
  id: string;
  name: string;
  description: string | null;
  googleMapsUrl: string;
  mapEmbedUrl: string | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  mapStatus: MapStatus;
  createdAt: string;
  updatedAt: string;
}
