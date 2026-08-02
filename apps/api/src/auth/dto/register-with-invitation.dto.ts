import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterWithInvitationDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "correct horse battery staple", minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty({ example: "a-secure-random-token" })
  @IsString()
  @MinLength(32)
  token!: string;
}
