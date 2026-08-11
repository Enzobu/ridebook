import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { AdminMailController } from "./admin-mail.controller.js";
import { AdminMailService } from "./admin-mail.service.js";

@Module({
  controllers: [AdminMailController],
  imports: [AuthModule],
  providers: [AdminMailService],
})
export class AdminMailModule {}
