import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { ACCESS_TOKEN_COOKIE } from "./auth.constants.js";
import { AuthenticatedRequest, JwtUserPayload } from "./auth.types.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;

    if (!token) {
      throw new UnauthorizedException("Authentification requise.");
    }

    request.user = await this.jwtService.verifyAsync<JwtUserPayload>(token, {
      secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });

    return true;
  }
}
