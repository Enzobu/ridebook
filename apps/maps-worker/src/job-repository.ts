import { MapEmbedJob, MapEmbedJobStatus, MapStatus, PrismaClient } from "@prisma/client";

import { MapFailureNotification } from "./failure-notifier.js";
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

  async markFailure(job: MapEmbedJob, error: Error, now = new Date()): Promise<MapFailureNotification | null> {
    const lastError = error.message;

    if (shouldFailPermanently(job.attempts, job.maxAttempts)) {
      const notificationClaim = await this.prisma.$transaction(async (transaction) => {
        await transaction.trip.update({
          data: {
            mapLastError: lastError,
            mapStatus: MapStatus.FAILED,
          },
          where: { id: job.tripId },
        });
        await transaction.mapEmbedJob.update({
          data: {
            failedAt: now,
            lastError,
            status: MapEmbedJobStatus.FAILED,
          },
          where: { id: job.id },
        });

        return transaction.mapEmbedJob.updateMany({
          data: { failureNotifiedAt: now },
          where: { failureNotifiedAt: null, id: job.id },
        });
      });

      if (notificationClaim.count !== 1) {
        return null;
      }

      const failedJob = await this.prisma.mapEmbedJob.findUniqueOrThrow({
        include: { trip: true },
        where: { id: job.id },
      });

      return {
        attempts: failedJob.attempts,
        failedAt: now,
        googleMapsUrl: failedJob.trip.googleMapsUrl,
        jobId: failedJob.id,
        lastError,
        maxAttempts: failedJob.maxAttempts,
        tripId: failedJob.tripId,
        tripName: failedJob.trip.name,
      };
    }

    await this.prisma.mapEmbedJob.update({
      data: {
        lastError,
        nextAttemptAt: new Date(now.getTime() + getNextAttemptDelayMs(job.attempts)),
        status: MapEmbedJobStatus.PENDING,
      },
      where: { id: job.id },
    });

    return null;
  }

  async recoverStalledJobs(timeoutMinutes: number, now = new Date()): Promise<MapFailureNotification[]> {
    const stalledBefore = new Date(now.getTime() - timeoutMinutes * 60_000);
    const stalledJobs = await this.prisma.mapEmbedJob.findMany({
      where: {
        startedAt: { lt: stalledBefore },
        status: MapEmbedJobStatus.PROCESSING,
      },
    });

    const notifications = await Promise.all(
      stalledJobs.map((job) =>
        this.markFailure(job, new Error("Traitement interrompu ou bloqué."), now),
      ),
    );

    return notifications.filter((notification): notification is MapFailureNotification => notification !== null);
  }
}
