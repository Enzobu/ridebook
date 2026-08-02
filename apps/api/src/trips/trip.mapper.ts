import { Prisma, Trip } from "@prisma/client";

import { TripResponseDto } from "./dto/trip-response.dto.js";

export function toTripResponseDto(trip: Trip): TripResponseDto {
  return {
    createdAt: trip.createdAt.toISOString(),
    description: trip.description,
    distanceKm: decimalToNumber(trip.distanceKm),
    durationMinutes: trip.durationMinutes,
    googleMapsUrl: trip.googleMapsUrl,
    id: trip.id,
    mapEmbedUrl: trip.mapEmbedUrl,
    mapLastError: trip.mapLastError,
    mapStatus: trip.mapStatus,
    name: trip.name,
    ownerId: trip.ownerId,
    updatedAt: trip.updatedAt.toISOString(),
  };
}

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value ? value.toNumber() : null;
}
