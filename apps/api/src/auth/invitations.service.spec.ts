import { ConfigService } from "@nestjs/config";
import { ConflictException, GoneException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service.js";
import { AuthService } from "./auth.service.js";
import { InvitationsService } from "./invitations.service.js";

const now = new Date("2026-08-01T12:00:00.000Z");
const transaction = {
  invitation: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
};

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
    },
    $transaction: vi.fn(async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  it("should reject an already used invitation", async () => {
    const service = new InvitationsService(authService, configService, prismaService);
    transaction.invitation.findUnique.mockResolvedValue({
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
    transaction.invitation.findUnique.mockResolvedValue({
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

  it("should create the user and consume the invitation in the same transaction", async () => {
    const service = new InvitationsService(authService, configService, prismaService);
    transaction.invitation.findUnique.mockResolvedValue({
      createdAt: now,
      createdById: "admin-id",
      expiresAt: new Date("2026-08-01T13:00:00.000Z"),
      id: "invitation-id",
      tokenHash: "hash",
      usedAt: null,
      usedById: null,
    });
    vi.mocked(authService.createUserFromInvitation).mockResolvedValue({ id: "user-id" } as never);
    transaction.invitation.updateMany.mockResolvedValue({ count: 1 });

    await service.acceptInvitation("token", "user@example.com", "correct horse battery staple");

    expect(authService.createUserFromInvitation).toHaveBeenCalledWith(
      "user@example.com",
      "correct horse battery staple",
      transaction,
    );
    expect(transaction.invitation.updateMany).toHaveBeenCalledWith({
      data: {
        usedAt: now,
        usedById: "user-id",
      },
      where: {
        id: "invitation-id",
        usedAt: null,
      },
    });
    expect(prismaService.$transaction).toHaveBeenCalledOnce();
  });

  it("should reject if the invitation was consumed concurrently", async () => {
    const service = new InvitationsService(authService, configService, prismaService);
    transaction.invitation.findUnique.mockResolvedValue({
      createdAt: now,
      createdById: "admin-id",
      expiresAt: new Date("2026-08-01T13:00:00.000Z"),
      id: "invitation-id",
      tokenHash: "hash",
      usedAt: null,
      usedById: null,
    });
    vi.mocked(authService.createUserFromInvitation).mockResolvedValue({ id: "user-id" } as never);
    transaction.invitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.acceptInvitation("token", "user@example.com", "correct horse battery staple"),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
