import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MinLength } from "class-validator";

export class RegisterWithInvitationDto {
  @ApiProperty({
    description: "12 caractères minimum avec majuscule, minuscule, chiffre et caractère spécial.",
    example: "RidebookTest1!",
    minLength: 12,
  })
  @IsString()
  @MinLength(12, { message: "Le mot de passe doit contenir au moins 12 caractères." })
  @Matches(/\p{Lu}/u, { message: "Le mot de passe doit contenir au moins une majuscule." })
  @Matches(/\p{Ll}/u, { message: "Le mot de passe doit contenir au moins une minuscule." })
  @Matches(/\p{N}/u, { message: "Le mot de passe doit contenir au moins un chiffre." })
  @Matches(/[^\p{L}\p{N}\s]/u, {
    message: "Le mot de passe doit contenir au moins un caractère spécial.",
  })
  password!: string;

  @ApiProperty({ example: "a-secure-random-token" })
  @IsString()
  @MinLength(32)
  token!: string;
}
