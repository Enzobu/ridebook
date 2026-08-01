import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MapStatus } from "@prisma/client";

export class TripResponseDto {
  @ApiProperty({ example: "clx0000000000000000000000" })
  id!: string;

  @ApiProperty({ example: "Boucle des Cévennes" })
  name!: string;

  @ApiPropertyOptional({ example: "Balade avec passage par le Vigan et l'Espérou." })
  description!: string | null;

  @ApiProperty({ example: "https://www.google.com/maps/dir/..." })
  googleMapsUrl!: string;

  @ApiPropertyOptional({ example: "https://www.google.com/maps/embed?pb=..." })
  mapEmbedUrl!: string | null;

  @ApiPropertyOptional({ example: 224.5 })
  distanceKm!: number | null;

  @ApiPropertyOptional({ example: 270 })
  durationMinutes!: number | null;

  @ApiProperty({ enum: MapStatus, example: MapStatus.PENDING })
  mapStatus!: MapStatus;

  @ApiPropertyOptional({ example: null })
  mapLastError!: string | null;

  @ApiProperty({ example: "2026-08-01T14:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-08-01T14:00:00.000Z" })
  updatedAt!: string;
}

export class TripListResponseDto {
  @ApiProperty({ type: [TripResponseDto] })
  items!: TripResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;
}
