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
      $transaction: vi.fn().mockResolvedValue(undefined),
      mapEmbedJob: {
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
      trip: {
        update: vi.fn(),
      },
    };
    const repository = new JobRepository(prisma as never);

    await expect(repository.recoverStalledJobs(15, now)).resolves.toBe(1);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
