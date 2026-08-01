import bcrypt from "bcryptjs";

import { PrismaClient, UserRole } from "@prisma/client";

async function main(): Promise<void> {
  const email = process.env["ADMIN_EMAIL"]?.toLowerCase();
  const password = process.env["ADMIN_PASSWORD"];

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.upsert({
      create: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: UserRole.ADMIN,
      },
      update: {
        passwordHash: await bcrypt.hash(password, 12),
        role: UserRole.ADMIN,
      },
      where: { email },
    });

    process.stdout.write(`Admin account ready: ${user.email}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
