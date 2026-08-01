import { MapEmbedJob, MapEmbedJobStatus, MapStatus, PrismaClient } from "@prisma/client";

import { getNextAttemptDelayMs, shouldFailPermanently } from "./retry-policy.js";

export class JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getTripGoogleMapsUrl(tripId: string): Promise<string> {
    const trip = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
    });

    return trip.googleMapsUrl;
  }

  async claimNextJob(now = new Date()): Promise<MapEmbedJob | null> {
    const candidate = await this.prisma.mapEmbedJob.findFirst({
      orderBy: { nextAttemptAt: "asc" },
      where: {
        nextAttemptAt: { lte: now },
        status: MapEmbedJobStatus.PENDING,
        trip: { deletedAt: null },
      },
    });

    if (!candidate) {
      return null;
    }

    const result = await this.prisma.mapEmbedJob.updateMany({
      data: {
        attempts: { increment: 1 },
        startedAt: now,
        status: MapEmbedJobStatus.PROCESSING,
      },
      where: {
        id: candidate.id,
        status: MapEmbedJobStatus.PENDING,
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return this.prisma.mapEmbedJob.findUniqueOrThrow({ where: { id: candidate.id } });
  }

  async markSuccess(job: MapEmbedJob, mapEmbedUrl: string, now = new Date()): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.trip.update({
        data: {
          mapEmbedUrl,
          mapLastError: null,
          mapStatus: MapStatus.SUCCESS,
        },
        where: { id: job.tripId },
      }),
      this.prisma.mapEmbedJob.update({
        data: {
          completedAt: now,
          lastError: null,
          status: MapEmbedJobStatus.SUCCESS,
        },
        where: { id: job.id },
      }),
    ]);
  }

  async markFailure(job: MapEmbedJob, error: Error, now = new Date()): Promise<void> {
    const lastError = error.message;

    if (shouldFailPermanently(job.attempts, job.maxAttempts)) {
      await this.prisma.$transaction([
        this.prisma.trip.update({
          data: {
            mapLastError: lastError,
            mapStatus: MapStatus.FAILED,
          },
          where: { id: job.tripId },
        }),
        this.prisma.mapEmbedJob.update({
          data: {
            failedAt: now,
            lastError,
            status: MapEmbedJobStatus.FAILED,
          },
          where: { id: job.id },
        }),
      ]);
      return;
    }

    await this.prisma.mapEmbedJob.update({
      data: {
        lastError,
        nextAttemptAt: new Date(now.getTime() + getNextAttemptDelayMs(job.attempts)),
        status: MapEmbedJobStatus.PENDING,
      },
      where: { id: job.id },
    });
  }

  async recoverStalledJobs(timeoutMinutes: number, now = new Date()): Promise<number> {
    const stalledBefore = new Date(now.getTime() - timeoutMinutes * 60_000);
    const stalledJobs = await this.prisma.mapEmbedJob.findMany({
      where: {
        startedAt: { lt: stalledBefore },
        status: MapEmbedJobStatus.PROCESSING,
      },
    });

    await Promise.all(
      stalledJobs.map((job) =>
        this.markFailure(job, new Error("Traitement interrompu ou bloqué."), now),
      ),
    );

    return stalledJobs.length;
  }
}
