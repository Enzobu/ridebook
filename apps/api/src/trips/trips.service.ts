import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MapEmbedJobStatus, MapStatus, Prisma, Trip } from "@prisma/client";

import { JwtUserPayload } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateTripDto } from "./dto/create-trip.dto.js";
import { ListTripsQueryDto } from "./dto/list-trips-query.dto.js";
import { TripListResponseDto, TripResponseDto } from "./dto/trip-response.dto.js";
import { UpdateTripDto } from "./dto/update-trip.dto.js";
import { assertGoogleMapsUrl } from "./google-maps-url.validator.js";
import { toTripResponseDto } from "./trip.mapper.js";

@Injectable()
export class TripsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(query: ListTripsQueryDto): Promise<TripListResponseDto> {
    const where: Prisma.TripWhereInput = {
      deletedAt: null,
      mapStatus: query.status,
      OR: query.search
        ? [
            { name: { contains: query.search } },
            { description: { contains: query.search } },
          ]
        : undefined,
    };
    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.trip.findMany({
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        where,
      }),
      this.prismaService.trip.count({ where }),
    ]);

    return {
      items: items.map(toTripResponseDto),
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async getById(id: string): Promise<TripResponseDto> {
    return toTripResponseDto(await this.getVisibleTrip(id));
  }

  async create(ownerId: string, dto: CreateTripDto): Promise<TripResponseDto> {
    assertGoogleMapsUrl(dto.googleMapsUrl);

    const trip = await this.prismaService.$transaction(async (transaction) => {
      const autoTitle = dto.autoTitle ?? false;
      const createdTrip = await transaction.trip.create({
        data: {
          autoTitle,
          description: dto.description,
          distanceKm: dto.distanceKm,
          durationMinutes: dto.durationMinutes,
          googleMapsUrl: dto.googleMapsUrl,
          mapStatus: MapStatus.PENDING,
          name: autoTitle ? dto.name?.trim() || "Balade en cours d’analyse" : dto.name!,
          ownerId,
        },
      });
      await transaction.mapEmbedJob.create({
        data: {
          maxAttempts: 3,
          nextAttemptAt: new Date(),
          status: MapEmbedJobStatus.PENDING,
          tripId: createdTrip.id,
        },
      });

      return createdTrip;
    });

    return toTripResponseDto(trip);
  }

  async update(id: string, actor: JwtUserPayload, dto: UpdateTripDto): Promise<TripResponseDto> {
    const trip = await this.getVisibleTrip(id);
    this.assertCanManageTrip(trip, actor);

    if (dto.googleMapsUrl) {
      assertGoogleMapsUrl(dto.googleMapsUrl);
    }

    const googleMapsUrlChanged =
      typeof dto.googleMapsUrl === "string" && dto.googleMapsUrl !== trip.googleMapsUrl;
    const updatedTrip = await this.prismaService.$transaction(async (transaction) => {
      const savedTrip = await transaction.trip.update({
        data: {
          description: dto.description,
          distanceKm: dto.distanceKm,
          durationMinutes: dto.durationMinutes,
          googleMapsUrl: dto.googleMapsUrl,
          mapEmbedUrl: googleMapsUrlChanged ? null : undefined,
          mapLastError: googleMapsUrlChanged ? null : undefined,
          mapStatus: googleMapsUrlChanged ? MapStatus.PENDING : undefined,
          name: dto.name,
        },
        where: { id },
      });

      if (googleMapsUrlChanged) {
        await transaction.mapEmbedJob.create({
          data: {
            maxAttempts: 3,
            nextAttemptAt: new Date(),
            status: MapEmbedJobStatus.PENDING,
            tripId: id,
          },
        });
      }

      return savedTrip;
    });

    return toTripResponseDto(updatedTrip);
  }

  async delete(id: string, actor: JwtUserPayload): Promise<void> {
    const trip = await this.getVisibleTrip(id);
    this.assertCanManageTrip(trip, actor);

    await this.prismaService.trip.update({
      data: { deletedAt: new Date() },
      where: { id },
    });
  }

  async retryMap(id: string, actor: JwtUserPayload): Promise<TripResponseDto> {
    const trip = await this.getVisibleTrip(id);
    this.assertCanManageTrip(trip, actor);

    const retriedTrip = await this.prismaService.$transaction(async (transaction) => {
      const activeJob = await transaction.mapEmbedJob.findFirst({
        where: {
          status: { in: [MapEmbedJobStatus.PENDING, MapEmbedJobStatus.PROCESSING] },
          tripId: id,
        },
      });

      if (activeJob) {
        throw new ConflictException("Une récupération de carte est déjà en cours.");
      }

      if (trip.mapStatus !== MapStatus.FAILED) {
        throw new ConflictException("La carte de cette balade n'est pas en échec.");
      }

      const savedTrip = await transaction.trip.update({
        data: {
          mapEmbedUrl: null,
          mapLastError: null,
          mapStatus: MapStatus.PENDING,
        },
        where: { id },
      });

      await transaction.mapEmbedJob.create({
        data: {
          maxAttempts: 3,
          nextAttemptAt: new Date(),
          status: MapEmbedJobStatus.PENDING,
          tripId: id,
        },
      });

      return savedTrip;
    });

    return toTripResponseDto(retriedTrip);
  }

  private async getVisibleTrip(id: string): Promise<Trip> {
    const trip = await this.prismaService.trip.findFirst({
      where: {
        deletedAt: null,
        id,
      },
    });

    if (!trip) {
      throw new NotFoundException("Balade introuvable.");
    }

    return trip;
  }

  private assertCanManageTrip(trip: Trip, actor: JwtUserPayload): void {
    if (actor.role === "ADMIN" || trip.ownerId === actor.sub) {
      return;
    }

    throw new ForbiddenException("Vous ne pouvez gérer que vos propres balades.");
  }
}
