import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AuthenticatedRequest } from "./auth.types.js";
import { CreateInvitationDto } from "./dto/create-invitation.dto.js";
import { InvitationResponseDto } from "./dto/invitation-response.dto.js";
import { InvitationsService } from "./invitations.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { Roles } from "./roles.decorator.js";
import { RolesGuard } from "./roles.guard.js";

@ApiTags("invitations")
@Controller("invitations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Créer et envoyer une invitation par email" })
  @ApiCreatedResponse({ type: InvitationResponseDto })
  @ApiForbiddenResponse({ description: "Réservé aux administrateurs" })
  async createInvitation(
    @Body() dto: CreateInvitationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.createInvitation(request.user.sub, dto.email);
  }
}
