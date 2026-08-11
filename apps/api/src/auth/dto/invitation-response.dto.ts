import { ApiProperty } from "@nestjs/swagger";

export class InvitationResponseDto {
  @ApiProperty({ example: "clx0000000000000000000000" })
  id!: string;

  @ApiProperty({ example: "user@example.com" })
  email!: string;

  @ApiProperty({ example: "http://localhost:3000/invitations/accept?token=..." })
  invitationUrl!: string;

  @ApiProperty({ example: "2026-08-01T15:00:00.000Z" })
  expiresAt!: string;

  @ApiProperty({ example: "2026-08-01T14:00:00.000Z" })
  createdAt!: string;
}

export class InvitationRegistrationDto {
  @ApiProperty({ example: "user@example.com" })
  email!: string;
}
