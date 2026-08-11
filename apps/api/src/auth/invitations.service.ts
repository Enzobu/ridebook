import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Invitation } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service.js";
import { INVITATION_TTL_MS } from "./auth.constants.js";
import { AuthService } from "./auth.service.js";
import { InvitationResponseDto } from "./dto/invitation-response.dto.js";
import { createOpaqueToken, hashToken } from "./token.utils.js";

@Injectable()
export class InvitationsService {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async createInvitation(createdById: string): Promise<InvitationResponseDto> {
    const token = createOpaqueToken();
    const invitation = await this.prismaService.invitation.create({
      data: {
        createdById,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        tokenHash: hashToken(token),
      },
    });

    return this.toInvitationResponseDto(invitation, token);
  }

  async acceptInvitation(token: string, email: string, password: string): Promise<void> {
    await this.prismaService.$transaction(async (transaction) => {
      const invitation = await transaction.invitation.findUnique({
        where: { tokenHash: hashToken(token) },
      });

      if (!invitation) {
        throw new NotFoundException("Invitation introuvable.");
      }

      if (invitation.usedAt) {
        throw new ConflictException("Invitation déjà utilisée.");
      }

      if (invitation.expiresAt <= new Date()) {
        throw new GoneException("Invitation expirée.");
      }

      const user = await this.authService.createUserFromInvitation(
        email,
        password,
        transaction,
      );

      const consumed = await transaction.invitation.updateMany({
        data: {
          usedAt: new Date(),
          usedById: user.id,
        },
        where: {
          id: invitation.id,
          usedAt: null,
        },
      });

      if (consumed.count !== 1) {
        throw new ConflictException("Invitation déjà utilisée.");
      }
    });
  }

  private toInvitationResponseDto(invitation: Invitation, token: string): InvitationResponseDto {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3000");
    const invitationUrl = new URL("/invitations/accept", frontendUrl);
    invitationUrl.searchParams.set("token", token);

    return {
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      id: invitation.id,
      invitationUrl: invitationUrl.toString(),
    };
  }
}
