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
  updatedAt: "2026-08-01T12:00:00.000Z",
} as const;

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render public trips with distance and duration", async () => {
    mockFetch([
      {
        items: [trip],
        limit: 9,
        page: 1,
        total: 1,
      },
    ]);

    render(<App />);

    expect(await screen.findByText("Boucle vallée")).toBeInTheDocument();
    expect(screen.getByText("120,5 km")).toBeInTheDocument();
    expect(screen.getByText("3 h 05")).toBeInTheDocument();
  });

  it("should render an empty state", async () => {
    mockFetch([{ items: [], limit: 9, page: 1, total: 0 }]);

    render(<App />);

    expect(await screen.findByText("Aucune balade disponible pour le moment.")).toBeInTheDocument();
  });

  it("should open the public detail with the map and Google Maps link", async () => {
    mockFetch([
      { items: [trip], limit: 9, page: 1, total: 1 },
      trip,
    ]);
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
    mockFetch([{ items: [], limit: 9, page: 1, total: 0 }]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByLabelText("Sombre"));

    await waitFor(() => expect(document.documentElement.dataset["theme"]).toBe("dark"));
    expect(localStorage.getItem("ridebook-theme")).toBe("dark");
  });
});

function mockFetch(responses: unknown[]): void {
  const fetchMock = vi.fn().mockImplementation(() => {
    const response = responses.shift();

    return Promise.resolve(
      new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
  });

  vi.stubGlobal("fetch", fetchMock);
}
