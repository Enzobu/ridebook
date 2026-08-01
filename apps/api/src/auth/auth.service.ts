import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service.js";
import { addDays, createOpaqueToken, hashToken } from "./token.utils.js";
import { JwtUserPayload } from "./auth.types.js";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async login(email: string, password: string): Promise<{ tokens: TokenPair; user: User }> {
    const user = await this.prismaService.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    return { tokens: await this.issueTokenPair(user), user };
  }

  async refresh(refreshToken: string | undefined): Promise<{ tokens: TokenPair; user: User }> {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token manquant.");
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await this.prismaService.refreshToken.findUnique({
      include: { user: true },
      where: { tokenHash },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException("Refresh token invalide.");
    }

    await this.prismaService.refreshToken.update({
      data: { revokedAt: new Date() },
      where: { id: storedToken.id },
    });

    return {
      tokens: await this.issueTokenPair(storedToken.user),
      user: storedToken.user,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prismaService.refreshToken.updateMany({
      data: { revokedAt: new Date() },
      where: {
        revokedAt: null,
        tokenHash: hashToken(refreshToken),
      },
    });
  }

  async getAuthenticatedUser(userId: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("Utilisateur introuvable.");
    }

    return user;
  }

  async createUserFromInvitation(email: string, password: string): Promise<User> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException("Un compte existe déjà avec cet email.");
    }

    return this.prismaService.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        role: UserRole.USER,
      },
    });
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const payload: JwtUserPayload = {
      email: user.email,
      role: user.role,
      sub: user.id,
    };
    const refreshToken = createOpaqueToken();

    await this.prismaService.refreshToken.create({
      data: {
        expiresAt: addDays(new Date(), 7),
        tokenHash: hashToken(refreshToken),
        userId: user.id,
      },
    });

    return {
      accessToken: await this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<"24h">("JWT_ACCESS_EXPIRES_IN", "24h"),
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      }),
      refreshToken,
    };
  }
}
