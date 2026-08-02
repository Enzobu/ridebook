import type { Request } from "express";

export interface JwtUserPayload {
  email: string;
  role: "ADMIN" | "USER";
  sub: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
}
