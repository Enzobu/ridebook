import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AuthCookieService } from "./cookie.service.js";
import { InvitationsController } from "./invitations.controller.js";
import { InvitationsService } from "./invitations.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { RolesGuard } from "./roles.guard.js";

@Module({
  controllers: [AuthController, InvitationsController],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
  imports: [JwtModule.register({}), PrismaModule],
  providers: [AuthCookieService, AuthService, InvitationsService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
