import { ApiPropertyOptional } from "@nestjs/swagger";
import { MapStatus } from "@prisma/client";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListTripsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @IsOptional()
  @Max(100)
  @Min(1)
  @Type(() => Number)
  limit = 20;

  @ApiPropertyOptional({ example: "cevennes" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MapStatus })
  @IsEnum(MapStatus)
  @IsOptional()
  status?: MapStatus;

  @ApiPropertyOptional({ enum: ["createdAt", "name", "distanceKm", "durationMinutes"] })
  @IsIn(["createdAt", "name", "distanceKm", "durationMinutes"])
  @IsOptional()
  sort: "createdAt" | "name" | "distanceKm" | "durationMinutes" = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsIn(["asc", "desc"])
  @IsOptional()
  order: "asc" | "desc" = "desc";
}
