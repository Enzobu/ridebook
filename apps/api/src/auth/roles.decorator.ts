import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

export function Roles(...roles: Array<"ADMIN" | "USER">): ReturnType<typeof SetMetadata> {
  return SetMetadata(ROLES_KEY, roles);
}
