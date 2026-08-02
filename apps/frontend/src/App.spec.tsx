// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App.js";

const trip = {
  createdAt: "2026-08-01T12:00:00.000Z",
  description: "Route panoramique avec pause au col.",
  distanceKm: 120.5,
  durationMinutes: 185,
  googleMapsUrl: "https://www.google.com/maps/dir/example",
  id: "trip-id",
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=fake",
  mapLastError: null,
  mapStatus: "SUCCESS",
  name: "Boucle vallée",
  ownerId: "user-id",
  updatedAt: "2026-08-01T12:00:00.000Z",
} as const;
const pendingTrip = { ...trip, mapEmbedUrl: null, mapStatus: "PENDING" } as const;
const failedTrip = { ...trip, mapEmbedUrl: null, mapLastError: "Erreur", mapStatus: "FAILED" } as const;
const session = {
  user: {
    createdAt: "2026-08-01T12:00:00.000Z",
    email: "user@example.com",
    id: "user-id",
    role: "USER",
    updatedAt: "2026-08-01T12:00:00.000Z",
  },
} as const;
const adminSession = {
  user: {
    ...session.user,
    email: "admin@example.com",
    role: "ADMIN",
  },
} as const;

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render public trips with distance and duration", async () => {
    mockFetch({ list: { items: [trip], limit: 9, page: 1, total: 1 } });

    render(<App />);

    expect(await screen.findByText("Boucle vallée")).toBeInTheDocument();
    expect(screen.getByText("120,5 km")).toBeInTheDocument();
    expect(screen.getByText("3 h 05")).toBeInTheDocument();
  });

  it("should render an empty state", async () => {
    mockFetch({ list: { items: [], limit: 9, page: 1, total: 0 } });

    render(<App />);

    expect(await screen.findByText("Aucune balade disponible pour le moment.")).toBeInTheDocument();
  });

  it("should open the public detail with the map and Google Maps link", async () => {
    mockFetch({ detail: trip, list: { items: [trip], limit: 9, page: 1, total: 1 } });
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Voir le détail" }));

    const link = await screen.findByRole("link", { name: /Ouvrir dans Google Maps/u });
    expect(link).toHaveAttribute("href", trip.googleMapsUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByTitle("Carte de Boucle vallée")).toBeInTheDocument();
  });

  it("should persist the selected dark theme", async () => {
    mockFetch({ list: { items: [], limit: 9, page: 1, total: 0 } });
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByLabelText("Sombre"));

    await waitFor(() => expect(document.documentElement.dataset["theme"]).toBe("dark"));
    expect(localStorage.getItem("ridebook-theme")).toBe("dark");
  });

  it("should create a trip and redirect to its pending detail", async () => {
    mockFetch({
      create: pendingTrip,
      detail: pendingTrip,
      list: { items: [], limit: 9, page: 1, total: 0 },
      session,
    });
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: /Nouvelle balade/u }));
    await user.type(screen.getByLabelText("Nom"), "Boucle vallée");
    await user.type(screen.getByLabelText("Lien Google Maps"), "https://www.google.com/maps/dir/example");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Carte en attente")).toBeInTheDocument();
  });

  it("should hide management actions from a non owner user", async () => {
    mockFetch({
      detail: { ...trip, ownerId: "other-user-id" },
      list: { items: [trip], limit: 9, page: 1, total: 1 },
      session,
    });
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Voir le détail" }));

    expect(await screen.findByRole("link", { name: /Ouvrir dans Google Maps/u })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Modifier/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Supprimer/u })).not.toBeInTheDocument();
  });

  it("should show retry on failed owned trips", async () => {
    mockFetch({
      detail: failedTrip,
      list: { items: [failedTrip], limit: 9, page: 1, total: 1 },
      retry: pendingTrip,
      session,
    });
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Voir le détail" }));
    await user.click(await screen.findByRole("button", { name: /Réessayer/u }));

    expect(await screen.findByText("Carte en attente")).toBeInTheDocument();
  });

  it("should poll pending maps until the iframe is available", async () => {
    mockFetch({
      detailSequence: [pendingTrip, trip],
      list: { items: [pendingTrip], limit: 9, page: 1, total: 1 },
    });
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Voir le détail" }));
    expect(await screen.findByText("Carte en attente")).toBeInTheDocument();

    expect(await screen.findByTitle("Carte de Boucle vallée", undefined, { timeout: 6500 })).toBeInTheDocument();
  }, 8000);

  it("should let admins generate and copy invitation links", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    mockFetch({
      invitation: {
        createdAt: "2026-08-01T12:00:00.000Z",
        expiresAt: "2026-08-01T13:00:00.000Z",
        id: "invitation-id",
        invitationUrl: "http://localhost:3000/register?token=abc",
      },
      list: { items: [], limit: 9, page: 1, total: 0 },
      session: adminSession,
    });
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: /Invitations/u }));
    await user.click(screen.getByRole("button", { name: /Générer un lien/u }));
    await user.click(await screen.findByRole("button", { name: "Copier" }));

    expect(screen.getByLabelText("Lien d'invitation généré")).toHaveValue("http://localhost:3000/register?token=abc");
    expect(await screen.findByText("Lien copié.")).toBeInTheDocument();
  });

  it("should hide invitation access from non admin users", async () => {
    mockFetch({ list: { items: [], limit: 9, page: 1, total: 0 }, session });

    render(<App />);

    await screen.findByRole("button", { name: /Nouvelle balade/u });
    expect(screen.queryByRole("button", { name: /Invitations/u })).not.toBeInTheDocument();
  });
});

function mockFetch(responses: {
  create?: unknown;
  detail?: unknown;
  detailSequence?: unknown[];
  invitation?: unknown;
  list: unknown;
  retry?: unknown;
  session?: unknown;
}): void {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/auth/me")) {
      return jsonResponse(responses.session ?? { message: "Unauthorized" }, responses.session ? 200 : 401);
    }

    if (url.endsWith("/trips") && !url.includes("?")) {
      return jsonResponse(responses.create);
    }

    if (url.endsWith("/map/retry")) {
      return jsonResponse(responses.retry);
    }

    if (url.endsWith("/invitations")) {
      return jsonResponse(responses.invitation);
    }

    const response = url.match(/\/trips\/trip-id$/u)
      ? (responses.detailSequence?.shift() ?? responses.detail)
      : responses.list;

    return jsonResponse(response);
  });

  vi.stubGlobal("fetch", fetchMock);
}

function jsonResponse(response: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
      status,
    }),
  );
}
