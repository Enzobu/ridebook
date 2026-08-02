import { ApiProperty } from "@nestjs/swagger";
import type { UserRole } from "@prisma/client";

export class UserResponseDto {
  @ApiProperty({ example: "clx0000000000000000000000" })
  id!: string;

  @ApiProperty({ example: "admin@example.com" })
  email!: string;

  @ApiProperty({ enum: ["ADMIN", "USER"], example: "ADMIN" })
  role!: UserRole;

  @ApiProperty({ example: "2026-08-01T14:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-08-01T14:00:00.000Z" })
  updatedAt!: string;
}

export class AuthSessionResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
