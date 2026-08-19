// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvitationAccept } from "./InvitationAccept.js";

const token = "a".repeat(32);

describe("InvitationAccept", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", `/invitations/accept?token=${token}`);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("should resolve the invitation email as readonly and only submit password plus token", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/v1/auth/invitation?")) {
        return jsonResponse({ email: "user@example.com" });
      }

      if (url.endsWith("/api/v1/auth/register")) {
        expect(JSON.parse(String(init?.body))).toEqual({ password: "RidebookTest1!", token });
        return jsonResponse(undefined, 201);
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<InvitationAccept />);

    const email = await screen.findByLabelText("Email");
    expect(email).toHaveValue("user@example.com");
    expect(email).toHaveAttribute("readonly");
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Mot de passe"), "RidebookTest1!");
    await user.type(screen.getByLabelText("Confirmer le mot de passe"), "RidebookTest1!");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("Ton compte a bien été créé.")).toBeInTheDocument();
  });
});

function jsonResponse(response: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(response === undefined ? null : JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
      status,
    }),
  );
}
