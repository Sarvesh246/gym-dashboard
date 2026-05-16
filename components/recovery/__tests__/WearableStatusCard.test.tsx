import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { WearableStatusCard } from "@/components/recovery/WearableStatusCard";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("WearableStatusCard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it("should display loading state initially", async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: async () => ({ providers: [] }) }), 100)
        ) as any
    );

    render(<WearableStatusCard />);

    expect(screen.getByText(/Loading wearables/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading wearables/i)).not.toBeInTheDocument();
    });
  });

  it("should display wearable devices title and action icon", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: [] }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText("Wearable Devices")).toBeInTheDocument();
    });
  });

  it("should display connected count in subtitle", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: { isStale: false, daysSinceSync: 1 },
      },
      {
        provider: "apple",
        connected: false,
        last_synced_at: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText("1 connected")).toBeInTheDocument();
    });
  });

  it("should display first 3 providers only", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: { isStale: false, daysSinceSync: 1 },
      },
      {
        provider: "apple",
        connected: false,
        last_synced_at: null,
      },
      {
        provider: "fitbit",
        connected: true,
        last_synced_at: "2026-05-14",
        sync_health: { isStale: false, daysSinceSync: 2 },
      },
      {
        provider: "polar",
        connected: false,
        last_synced_at: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText("Garmin Connect")).toBeInTheDocument();
      expect(screen.getByText("Apple Health")).toBeInTheDocument();
      expect(screen.getByText("Fitbit")).toBeInTheDocument();
      expect(screen.queryByText("Polar")).not.toBeInTheDocument();
    });
  });

  it("should display connection status for each provider", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: { isStale: false, daysSinceSync: 1 },
      },
      {
        provider: "apple",
        connected: false,
        last_synced_at: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      const connectedChips = screen.getAllByText("Connected");
      const disconnectedChips = screen.getAllByText("Disconnected");
      expect(connectedChips.length).toBeGreaterThan(0);
      expect(disconnectedChips.length).toBeGreaterThan(0);
    });
  });

  it("should display last sync time for connected providers", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: { isStale: false, daysSinceSync: 1 },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText(/Synced yesterday/i)).toBeInTheDocument();
    });
  });

  it("should display stale warning", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-08",
        sync_health: { isStale: true, daysSinceSync: 8 },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText(/Some wearable data is stale/i)).toBeInTheDocument();
    });
  });

  it("should display manage devices button", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: [] }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText("Manage Devices")).toBeInTheDocument();
    });
  });

  it("should link to settings page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: [] }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      const manageButton = screen.getByText("Manage Devices").closest("a");
      expect(manageButton).toHaveAttribute("href", "/settings");
    });
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load wearable status/i)).toBeInTheDocument();
    });
  });

  it("should display 'today' for same-day sync", async () => {
    const today = new Date().toISOString().split("T")[0];
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: today,
        sync_health: { isStale: false, daysSinceSync: 0 },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText(/Synced today/i)).toBeInTheDocument();
    });
  });

  it("should handle no connected providers", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: false,
        last_synced_at: null,
      },
      {
        provider: "apple",
        connected: false,
        last_synced_at: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearableStatusCard />);

    await waitFor(() => {
      expect(screen.getByText("No devices connected")).toBeInTheDocument();
    });
  });
});
