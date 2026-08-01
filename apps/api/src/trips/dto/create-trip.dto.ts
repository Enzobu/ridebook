import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateTripDto {
  @ApiProperty({ example: "Boucle des Cévennes", minLength: 3, maxLength: 150 })
  @IsString()
  @MaxLength(150)
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional({ example: "Balade avec passage par le Vigan et l'Espérou." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: "https://www.google.com/maps/dir/..." })
  @IsUrl({ require_protocol: true, require_tld: true })
  googleMapsUrl!: string;

  @ApiPropertyOptional({ example: 224.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  distanceKm?: number;

  @ApiPropertyOptional({ example: 270 })
  @IsNumber()
  @IsOptional()
  @Max(10080)
  @Min(1)
  durationMinutes?: number;
}
