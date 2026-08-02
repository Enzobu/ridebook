import type { User } from "@prisma/client";

import { UserResponseDto } from "./dto/auth-response.dto.js";

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    createdAt: user.createdAt.toISOString(),
    email: user.email,
    id: user.id,
    role: user.role,
    updatedAt: user.updatedAt.toISOString(),
  };
}
