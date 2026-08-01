import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CreateTripDto } from "./dto/create-trip.dto.js";
import { ListTripsQueryDto } from "./dto/list-trips-query.dto.js";
import { TripListResponseDto, TripResponseDto } from "./dto/trip-response.dto.js";
import { UpdateTripDto } from "./dto/update-trip.dto.js";
import { TripsService } from "./trips.service.js";

@ApiTags("trips")
@Controller("trips")
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @ApiOperation({ summary: "Lister les balades publiques" })
  @ApiOkResponse({ type: TripListResponseDto })
  list(@Query() query: ListTripsQueryDto): Promise<TripListResponseDto> {
    return this.tripsService.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Consulter une balade publique" })
  @ApiOkResponse({ type: TripResponseDto })
  getById(@Param("id") id: string): Promise<TripResponseDto> {
    return this.tripsService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Créer une balade" })
  @ApiCreatedResponse({ type: TripResponseDto })
  create(
    @Body() dto: CreateTripDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TripResponseDto> {
    return this.tripsService.create(request.user.sub, dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Modifier une balade" })
  @ApiOkResponse({ type: TripResponseDto })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTripDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TripResponseDto> {
    return this.tripsService.update(id, request.user, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer logiquement une balade" })
  @ApiNoContentResponse()
  delete(@Param("id") id: string, @Req() request: AuthenticatedRequest): Promise<void> {
    return this.tripsService.delete(id, request.user);
  }
}
