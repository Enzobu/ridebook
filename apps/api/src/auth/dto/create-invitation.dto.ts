import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional } from "class-validator";

export class CreateInvitationDto {
  @ApiPropertyOptional({ example: "user@example.com" })
  @IsEmail()
  @IsOptional()
  email?: string;
}
