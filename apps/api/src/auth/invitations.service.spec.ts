import { ConfigService } from "@nestjs/config";
import { ConflictException, GoneException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service.js";
import { AuthService } from "./auth.service.js";
import { InvitationsService } from "./invitations.service.js";

const now = new Date("2026-08-01T12:00:00.000Z");

describe("InvitationsService", () => {
  const authService = {
    createUserFromInvitation: vi.fn(),
  } as unknown as AuthService;
  const configService = {
    get: vi.fn(() => "http://localhost:3000"),
  } as unknown as ConfigService;
  const prismaService = {
    invitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  it("should reject an already used invitation", async () => {
    const service = new InvitationsService(authService, configService, prismaService);
    vi.mocked(prismaService.invitation.findUnique).mockResolvedValue({
      createdAt: now,
      createdById: "admin-id",
      expiresAt: new Date("2026-08-01T13:00:00.000Z"),
      id: "invitation-id",
      tokenHash: "hash",
      usedAt: now,
      usedById: "user-id",
    });

    await expect(
      service.acceptInvitation("token", "user@example.com", "correct horse battery staple"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("should reject an expired invitation", async () => {
    const service = new InvitationsService(authService, configService, prismaService);
    vi.mocked(prismaService.invitation.findUnique).mockResolvedValue({
      createdAt: now,
      createdById: "admin-id",
      expiresAt: new Date("2026-08-01T11:59:59.000Z"),
      id: "invitation-id",
      tokenHash: "hash",
      usedAt: null,
      usedById: null,
    });

    await expect(
      service.acceptInvitation("token", "user@example.com", "correct horse battery staple"),
    ).rejects.toBeInstanceOf(GoneException);
  });
});
