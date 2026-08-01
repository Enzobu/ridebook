import { ForbiddenException } from "@nestjs/common";
import { MapStatus, Prisma, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service.js";
import { TripsService } from "./trips.service.js";

const now = new Date("2026-08-01T12:00:00.000Z");
const baseTrip = {
  createdAt: now,
  deletedAt: null,
  description: "Description",
  distanceKm: new Prisma.Decimal(120.5),
  durationMinutes: 180,
  googleMapsUrl: "https://www.google.com/maps/dir/example",
  id: "trip-id",
  mapEmbedUrl: null,
  mapLastError: null,
  mapStatus: MapStatus.PENDING,
  name: "Boucle test",
  ownerId: "owner-id",
  updatedAt: now,
};

describe("TripsService", () => {
  const prismaService = {
    $transaction: vi.fn(),
    trip: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject updates from a non owner user", async () => {
    const service = new TripsService(prismaService);
    vi.mocked(prismaService.trip.findFirst).mockResolvedValue(baseTrip);

    await expect(
      service.update(
        "trip-id",
        { email: "user@example.com", role: UserRole.USER, sub: "other-user-id" },
        { name: "Nouveau nom" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("should allow admin to update any trip", async () => {
    const service = new TripsService(prismaService);
    vi.mocked(prismaService.trip.findFirst).mockResolvedValue(baseTrip);
    vi.mocked(prismaService.$transaction).mockImplementation(async (callback) =>
      callback({
        mapEmbedJob: { create: vi.fn() },
        trip: { update: vi.fn().mockResolvedValue({ ...baseTrip, name: "Nouveau nom" }) },
      } as never),
    );

    const result = await service.update(
      "trip-id",
      { email: "admin@example.com", role: UserRole.ADMIN, sub: "admin-id" },
      { name: "Nouveau nom" },
    );

    expect(result.name).toBe("Nouveau nom");
  });
});
