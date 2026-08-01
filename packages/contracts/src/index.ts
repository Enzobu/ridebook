export type UserRole = "ADMIN" | "USER";

export type MapStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface HealthDto {
  status: "ok";
  service: string;
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
