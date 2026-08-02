import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth.constants.js";

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  setAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
    const secure = this.configService.get<string>("COOKIE_SECURE", "false") === "true";
    const domain = this.configService.get<string>("COOKIE_DOMAIN");
    const baseOptions = {
      domain: domain === "localhost" ? undefined : domain,
      httpOnly: true,
      sameSite: "lax" as const,
      secure,
    };

    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...baseOptions,
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/v1/auth",
    });
  }

  clearAuthCookies(response: Response): void {
    response.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/v1/auth" });
  }
}
