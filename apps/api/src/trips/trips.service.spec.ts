import { ConflictException, ForbiddenException } from "@nestjs/common";
import { MapEmbedJobStatus, MapStatus, Prisma, UserRole } from "@prisma/client";
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

  it("should reject map retry when an active job already exists", async () => {
    const service = new TripsService(prismaService);
    vi.mocked(prismaService.trip.findFirst).mockResolvedValue({ ...baseTrip, mapStatus: MapStatus.FAILED });
    vi.mocked(prismaService.$transaction).mockImplementation(async (callback) =>
      callback({
        mapEmbedJob: {
          findFirst: vi.fn().mockResolvedValue({ id: "active-job", status: MapEmbedJobStatus.PENDING }),
        },
        trip: { update: vi.fn() },
      } as never),
    );

    await expect(
      service.retryMap("trip-id", { email: "owner@example.com", role: UserRole.USER, sub: "owner-id" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("should reject map retry from a non owner user", async () => {
    const service = new TripsService(prismaService);
    vi.mocked(prismaService.trip.findFirst).mockResolvedValue({ ...baseTrip, mapStatus: MapStatus.FAILED });

    await expect(
      service.retryMap("trip-id", { email: "user@example.com", role: UserRole.USER, sub: "other-user-id" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("should allow the owner to retry a failed map", async () => {
    const service = new TripsService(prismaService);
    const failedTrip = { ...baseTrip, mapLastError: "Erreur", mapStatus: MapStatus.FAILED };
    const mapEmbedJobCreate = vi.fn();
    vi.mocked(prismaService.trip.findFirst).mockResolvedValue(failedTrip);
    vi.mocked(prismaService.$transaction).mockImplementation(async (callback) =>
      callback({
        mapEmbedJob: {
          create: mapEmbedJobCreate,
          findFirst: vi.fn().mockResolvedValue(null),
        },
        trip: { update: vi.fn().mockResolvedValue({ ...failedTrip, mapLastError: null, mapStatus: MapStatus.PENDING }) },
      } as never),
    );

    const result = await service.retryMap("trip-id", {
      email: "owner@example.com",
      role: UserRole.USER,
      sub: "owner-id",
    });

    expect(result.mapStatus).toBe(MapStatus.PENDING);
    expect(mapEmbedJobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: MapEmbedJobStatus.PENDING,
        tripId: "trip-id",
      }),
    });
  });
});
