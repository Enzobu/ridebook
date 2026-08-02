import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { AppModule } from "./app.module.js";
import { PrismaService } from "./prisma/prisma.service.js";

describe("AppModule", () => {
  it("should initialize the application module", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: async (): Promise<void> => undefined,
        $disconnect: async (): Promise<void> => undefined,
      })
      .compile();
    const app = moduleRef.createNestApplication();

    await app.init();

    expect(app.getHttpServer()).toBeDefined();
    await app.close();
  });
});
