import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class CreateInvitationDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;
}
