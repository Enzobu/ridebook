import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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

  async createInvitation(createdById: string, email: string): Promise<InvitationResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.prismaService.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      throw new ConflictException("Un compte existe déjà avec cet email.");
    }

    const token = createOpaqueToken();
    const invitation = await this.prismaService.invitation.create({
      data: {
        createdById,
        email: normalizedEmail,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        tokenHash: hashToken(token),
      },
    });
    const response = this.toInvitationResponseDto(invitation, token);

    try {
      await this.sendInvitationEmail(normalizedEmail, response.invitationUrl);
    } catch (error) {
      await this.prismaService.invitation.delete({ where: { id: invitation.id } });
      throw error;
    }

    return response;
  }

  async resolveInvitation(token: string): Promise<{ email: string }> {
    const invitation = await this.getUsableInvitation(token);
    return { email: invitation.email };
  }

  async acceptInvitation(token: string, password: string): Promise<void> {
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
        invitation.email,
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

  private async getUsableInvitation(token: string): Promise<Invitation> {
    const invitation = await this.prismaService.invitation.findUnique({
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

    return invitation;
  }

  private async sendInvitationEmail(recipient: string, invitationUrl: string): Promise<void> {
    const workerUrl = this.configService.get<string>("MAPS_WORKER_URL") ?? "http://maps-worker:3002";

    let response: Response;
    try {
      response = await fetch(`${workerUrl}/internal/mail/test`, {
        body: JSON.stringify({ invitationUrl, recipient, type: "INVITATION" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    } catch {
      throw new ServiceUnavailableException("Maps worker indisponible pour envoyer l'invitation.");
    }

    if (!response.ok) {
      let message = "Impossible d'envoyer l'email d'invitation.";
      try {
        const payload = (await response.json()) as { message?: string };
        message = payload.message ?? message;
      } catch {
        // Keep the stable fallback message.
      }
      throw new ServiceUnavailableException(message);
    }
  }

  private toInvitationResponseDto(invitation: Invitation, token: string): InvitationResponseDto {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3000");
    const invitationUrl = new URL("/invitations/accept", frontendUrl);
    invitationUrl.searchParams.set("token", token);

    return {
      createdAt: invitation.createdAt.toISOString(),
      email: invitation.email,
      expiresAt: invitation.expiresAt.toISOString(),
      id: invitation.id,
      invitationUrl: invitationUrl.toString(),
    };
  }
}
