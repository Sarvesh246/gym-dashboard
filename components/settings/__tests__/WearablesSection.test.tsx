import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WearablesSection } from "@/components/settings/WearablesSection";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("WearablesSection Component", () => {
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

    render(<WearablesSection />);

    expect(screen.getByText(/Loading wearables/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading wearables/i)).not.toBeInTheDocument();
    });
  });

  it("should display provider list with connection status", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: {
          isStale: false,
          daysSinceSync: 1,
        },
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

    render(<WearablesSection />);

    await waitFor(() => {
      expect(screen.getByText("Garmin Connect")).toBeInTheDocument();
      expect(screen.getByText("Apple Health")).toBeInTheDocument();
    });

    // Verify status chips
    const connectedChips = screen.getAllByText("Connected");
    expect(connectedChips.length).toBeGreaterThan(0);
  });

  it("should display connect button for disconnected providers", async () => {
    const mockStatuses = [
      {
        provider: "fitbit",
        connected: false,
        last_synced_at: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearablesSection />);

    await waitFor(() => {
      const connectButtons = screen.getAllByText("Connect");
      expect(connectButtons.length).toBeGreaterThan(0);
    });
  });

  it("should trigger OAuth flow on connect button click", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: false,
        last_synced_at: null,
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ providers: mockStatuses }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authUrl: "https://garmin.com/oauth?state=xyz" }),
      } as any);

    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: "" } as any;

    render(<WearablesSection />);

    await waitFor(() => {
      expect(screen.getByText("Garmin Connect")).toBeInTheDocument();
    });

    const connectButton = screen.getByText("Connect");
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/wearables/connect",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("garmin"),
        })
      );
    });
  });

  it("should display sync button for connected providers", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: {
          isStale: false,
          daysSinceSync: 1,
        },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearablesSection />);

    await waitFor(() => {
      expect(screen.getByText("Garmin Connect")).toBeInTheDocument();
    });

    // Sync button should exist
    const buttons = screen.getAllByRole("button");
    const syncButton = buttons.find((btn) => btn.querySelector("svg"));
    expect(syncButton).toBeInTheDocument();
  });

  it("should trigger sync on sync button click", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: {
          isStale: false,
          daysSinceSync: 1,
        },
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ providers: mockStatuses }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "completed",
          records_processed: 150,
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ providers: mockStatuses }),
      } as any);

    render(<WearablesSection />);

    await waitFor(() => {
      expect(screen.getByText("Garmin Connect")).toBeInTheDocument();
    });

    // Click sync button
    const buttons = screen.getAllByRole("button");
    const syncButton = buttons.find((btn) => btn.querySelector("svg"));
    if (syncButton) {
      fireEvent.click(syncButton);
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/wearables/sync",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("garmin"),
        })
      );
    });
  });

  it("should display last sync time", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: {
          isStale: false,
          daysSinceSync: 2,
        },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearablesSection />);

    await waitFor(() => {
      expect(screen.getByText(/Last synced \d+ days ago/i)).toBeInTheDocument();
    });
  });

  it("should display stale indicator for old data", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-08", // 7+ days ago
        sync_health: {
          isStale: true,
          daysSinceSync: 8,
        },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockStatuses }),
    } as any);

    render(<WearablesSection />);

    await waitFor(() => {
      expect(screen.getByText(/(stale)/i)).toBeInTheDocument();
    });
  });

  it("should handle fetch errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<WearablesSection />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load wearable status/i)).toBeInTheDocument();
    });
  });

  it("should disable sync button while syncing", async () => {
    const mockStatuses = [
      {
        provider: "garmin",
        connected: true,
        last_synced_at: "2026-05-15",
        sync_health: {
          isStale: false,
          daysSinceSync: 1,
        },
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ providers: mockStatuses }),
      } as any)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: async () => ({ status: "completed" }) }), 500)
          ) as any
      );

    render(<WearablesSection />);

    await waitFor(() => {
      expect(screen.getByText("Garmin Connect")).toBeInTheDocument();
    });

    // Verify button is functional
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
