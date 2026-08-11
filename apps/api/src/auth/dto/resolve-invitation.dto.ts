import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ResolveInvitationDto {
  @ApiProperty({ example: "a-secure-random-token" })
  @IsString()
  @MinLength(32)
  token!: string;
}
