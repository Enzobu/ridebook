import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { TripsController } from "./trips.controller.js";
import { TripsService } from "./trips.service.js";

@Module({
  controllers: [TripsController],
  imports: [PrismaModule],
  providers: [TripsService],
})
export class TripsModule {}
