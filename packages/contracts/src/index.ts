export type UserRole = "ADMIN" | "USER";

export type MapStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export type MapEmbedJobStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

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
  user: UserDto | null;
}

export interface InvitationDto {
  id: string;
  email: string;
  invitationUrl: string;
  expiresAt: string;
  createdAt: string;
}

export interface InvitationRegistrationDto {
  email: string;
}

export interface TripDto {
  id: string;
  ownerId: string;
  name: string;
  autoTitle: boolean;
  routeKeyPoints: string[];
  description: string | null;
  googleMapsUrl: string;
  mapEmbedUrl: string | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  mapStatus: MapStatus;
  mapLastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripListDto {
  items: TripDto[];
  limit: number;
  page: number;
  total: number;
}
