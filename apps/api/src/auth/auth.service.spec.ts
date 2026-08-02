import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service.js";
import { AuthService } from "./auth.service.js";
import { hashToken } from "./token.utils.js";

const now = new Date("2026-08-01T12:00:00.000Z");

describe("AuthService", () => {
  const configService = {
    get: vi.fn((key: string, fallback: string) => {
      if (key === "JWT_ACCESS_EXPIRES_IN") {
        return "24h";
      }

      return fallback;
    }),
    getOrThrow: vi.fn((key: string) => `${key}-value`),
  } as unknown as ConfigService;
  const jwtService = {
    signAsync: vi.fn(async () => "access-token"),
  } as unknown as JwtService;
  const prismaService = {
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  it("should rotate refresh token when refreshing", async () => {
    const authService = new AuthService(configService, jwtService, prismaService);
    const user = {
      createdAt: now,
      email: "admin@example.com",
      id: "user-id",
      passwordHash: await bcrypt.hash("correct horse battery staple", 12),
      role: UserRole.ADMIN,
      updatedAt: now,
    };
    vi.mocked(prismaService.refreshToken.findUnique).mockResolvedValue({
      createdAt: now,
      expiresAt: new Date("2026-08-08T12:00:00.000Z"),
      id: "refresh-id",
      revokedAt: null,
      tokenHash: hashToken("refresh-token"),
      user,
      userId: user.id,
    } as never);
    vi.mocked(prismaService.refreshToken.update).mockResolvedValue({
      createdAt: now,
      expiresAt: new Date("2026-08-08T12:00:00.000Z"),
      id: "refresh-id",
      revokedAt: now,
      tokenHash: hashToken("refresh-token"),
      userId: user.id,
    });
    vi.mocked(prismaService.refreshToken.create).mockResolvedValue({
      createdAt: now,
      expiresAt: new Date("2026-08-08T12:00:00.000Z"),
      id: "new-refresh-id",
      revokedAt: null,
      tokenHash: "new-token-hash",
      userId: user.id,
    });

    const result = await authService.refresh("refresh-token");

    expect(result.user.id).toBe("user-id");
    expect(result.tokens.accessToken).toBe("access-token");
    expect(result.tokens.refreshToken).not.toBe("refresh-token");
    expect(prismaService.refreshToken.update).toHaveBeenCalledWith({
      data: { revokedAt: now },
      where: { id: "refresh-id" },
    });
    expect(prismaService.refreshToken.create).toHaveBeenCalledOnce();
  });
});
