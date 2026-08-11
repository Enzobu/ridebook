import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { AdminMailModule } from "./admin-mail/admin-mail.module.js";
import { AppController } from "./app.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { TripsModule } from "./trips/trips.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env["NODE_ENV"] === "production" ? "info" : "debug",
        redact: ["req.headers.cookie", "req.headers.authorization"],
      },
    }),
    ThrottlerModule.forRoot([
      {
        limit: 100,
        ttl: 60_000,
      },
    ]),
    AuthModule,
    TripsModule,
    AdminMailModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
