import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { RegisterWithInvitationDto } from "./register-with-invitation.dto.js";

const validToken = "a".repeat(32);

function createDto(password: string): RegisterWithInvitationDto {
  return Object.assign(new RegisterWithInvitationDto(), {
    email: "user@example.com",
    password,
    token: validToken,
  });
}

describe("RegisterWithInvitationDto password policy", () => {
  it("accepts a password matching every requirement", async () => {
    const errors = await validate(createDto("RidebookTest1!"));

    expect(errors.find((error) => error.property === "password")).toBeUndefined();
  });

  it.each([
    ["Short1!Aa"],
    ["ridebooktest1!"],
    ["RIDEBOOKTEST1!"],
    ["RidebookTest!!"],
    ["RidebookTest12"],
  ])("rejects passwords that miss a requirement", async (password) => {
    const errors = await validate(createDto(password));

    expect(errors.find((error) => error.property === "password")).toBeDefined();
  });
});
