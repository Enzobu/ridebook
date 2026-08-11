import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiForbiddenResponse, ApiNoContentResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { AdminMailService } from "./admin-mail.service.js";
import { SendTestMailDto } from "./dto/send-test-mail.dto.js";

@ApiTags("admin")
@Controller("admin/mail")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminMailController {
  constructor(private readonly adminMailService: AdminMailService) {}

  @Post("test")
  @Roles("ADMIN")
  @HttpCode(204)
  @ApiOperation({ summary: "Envoyer un email de test" })
  @ApiNoContentResponse({ description: "Email de test envoyé" })
  @ApiForbiddenResponse({ description: "Réservé aux administrateurs" })
  async sendTestMail(@Body() dto: SendTestMailDto): Promise<void> {
    await this.adminMailService.sendTestMail(dto.recipient, dto.type);
  }
}
