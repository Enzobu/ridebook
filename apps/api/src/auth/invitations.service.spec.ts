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

const invitation = {
  createdAt: now,
  createdById: "admin-id",
  email: "user@example.com",
  expiresAt: new Date("2026-08-01T13:00:00.000Z"),
  id: "invitation-id",
  tokenHash: "hash",
  usedAt: null,
  usedById: null,
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
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
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
    transaction.invitation.findUnique.mockResolvedValue({ ...invitation, usedAt: now, usedById: "user-id" });

    await expect(service.acceptInvitation("token", "RidebookTest1!")).rejects.toBeInstanceOf(ConflictException);
  });

  it("should reject an expired invitation", async () => {
    const service = new InvitationsService(authService, configService, prismaService);
    transaction.invitation.findUnique.mockResolvedValue({
      ...invitation,
      expiresAt: new Date("2026-08-01T11:59:59.000Z"),
    });

    await expect(service.acceptInvitation("token", "RidebookTest1!")).rejects.toBeInstanceOf(GoneException);
  });

  it("should create the user with the invitation email and consume it in the same transaction", async () => {
    const service = new InvitationsService(authService, configService, prismaService);
    transaction.invitation.findUnique.mockResolvedValue(invitation);
    vi.mocked(authService.createUserFromInvitation).mockResolvedValue({ id: "user-id" } as never);
    transaction.invitation.updateMany.mockResolvedValue({ count: 1 });

    await service.acceptInvitation("token", "RidebookTest1!");

    expect(authService.createUserFromInvitation).toHaveBeenCalledWith(
      "user@example.com",
      "RidebookTest1!",
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
    transaction.invitation.findUnique.mockResolvedValue(invitation);
    vi.mocked(authService.createUserFromInvitation).mockResolvedValue({ id: "user-id" } as never);
    transaction.invitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.acceptInvitation("token", "RidebookTest1!")).rejects.toBeInstanceOf(ConflictException);
  });

  it("should resolve the email from a valid invitation token", async () => {
    const service = new InvitationsService(authService, configService, prismaService);
    vi.mocked(prismaService.invitation.findUnique).mockResolvedValue(invitation);

    await expect(service.resolveInvitation("token")).resolves.toEqual({ email: "user@example.com" });
  });
});
