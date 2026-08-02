import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { TripsController } from "./trips.controller.js";
import { TripsService } from "./trips.service.js";

@Module({
  controllers: [TripsController],
  imports: [AuthModule, PrismaModule],
  providers: [TripsService],
})
export class TripsModule {}
