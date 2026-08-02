import { MapEmbedJobStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { JobRepository } from "./job-repository.js";

const now = new Date("2026-08-01T12:00:00.000Z");

describe("JobRepository", () => {
  it("should not claim a job when the conditional update loses the race", async () => {
    const prisma = {
      mapEmbedJob: {
        findFirst: vi.fn().mockResolvedValue({
          id: "job-id",
          status: MapEmbedJobStatus.PENDING,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const repository = new JobRepository(prisma as never);

    await expect(repository.claimNextJob(now)).resolves.toBeNull();
  });

  it("should recover stalled processing jobs through the failure path", async () => {
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (callback) =>
        callback({
          mapEmbedJob: {
            update: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          trip: { update: vi.fn() },
        }),
      ),
      mapEmbedJob: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          attempts: 3,
          id: "job-id",
          lastError: "Traitement interrompu ou bloqué.",
          maxAttempts: 3,
          trip: {
            googleMapsUrl: "https://www.google.com/maps/dir/example",
            name: "Boucle test",
          },
          tripId: "trip-id",
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            attempts: 3,
            id: "job-id",
            maxAttempts: 3,
            tripId: "trip-id",
          },
        ]),
        update: vi.fn(),
      },
    };
    const repository = new JobRepository(prisma as never);

    await expect(repository.recoverStalledJobs(15, now)).resolves.toHaveLength(1);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("should not emit a second notification for an already notified definitive failure", async () => {
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (callback) =>
        callback({
          mapEmbedJob: {
            update: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          trip: { update: vi.fn() },
        }),
      ),
    };
    const repository = new JobRepository(prisma as never);

    const result = await repository.markFailure(
      {
        attempts: 3,
        completedAt: null,
        createdAt: now,
        failedAt: null,
        failureNotifiedAt: now,
        id: "job-id",
        lastError: null,
        maxAttempts: 3,
        nextAttemptAt: now,
        requestedAt: now,
        startedAt: now,
        status: MapEmbedJobStatus.PROCESSING,
        tripId: "trip-id",
        updatedAt: now,
      },
      new Error("Erreur définitive"),
      now,
    );

    expect(result).toBeNull();
  });
});
