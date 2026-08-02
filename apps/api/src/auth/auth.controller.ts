import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request, Response } from "express";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth.constants.js";
import { AuthService } from "./auth.service.js";
import { AuthCookieService } from "./cookie.service.js";
import { AuthSessionResponseDto } from "./dto/auth-response.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterWithInvitationDto } from "./dto/register-with-invitation.dto.js";
import { InvitationsService } from "./invitations.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { toUserResponseDto } from "./user.mapper.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authCookieService: AuthCookieService,
    private readonly authService: AuthService,
    private readonly invitationsService: InvitationsService,
  ) {}

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Connecter un utilisateur" })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({ description: "Identifiants invalides" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.authService.login(dto.email, dto.password);
    this.authCookieService.setAuthCookies(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );

    return { user: toUserResponseDto(result.user) };
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Renouveler la session" })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.authService.refresh(
      request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined,
    );
    this.authCookieService.setAuthCookies(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );

    return { user: toUserResponseDto(result.user) };
  }

  @Post("logout")
  @HttpCode(204)
  @ApiOperation({ summary: "Déconnecter l'utilisateur" })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined);
    this.authCookieService.clearAuthCookies(response);
  }

  @Get("me")
  @ApiOperation({ summary: "Lire l'utilisateur courant" })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  async me(@Req() request: Request): Promise<AuthSessionResponseDto> {
    const user = await this.authService.getUserFromAccessToken(
      request.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined,
    );

    return { user: user ? toUserResponseDto(user) : null };
  }

  @Post("register")
  @ApiOperation({ summary: "Créer un compte depuis une invitation" })
  @ApiCreatedResponse({ description: "Compte créé" })
  async registerWithInvitation(@Body() dto: RegisterWithInvitationDto): Promise<void> {
    await this.invitationsService.acceptInvitation(dto.token, dto.email, dto.password);
  }
}
