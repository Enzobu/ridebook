import { IsEmail, IsIn } from "class-validator";

export const TEST_MAIL_TYPES = ["WORKER_FAILURE"] as const;
export type TestMailType = (typeof TEST_MAIL_TYPES)[number];

export class SendTestMailDto {
  @IsEmail()
  recipient!: string;

  @IsIn(TEST_MAIL_TYPES)
  type!: TestMailType;
}
