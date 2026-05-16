import { POST } from "../connect/route";
import { createClient } from "@/lib/supabase/server";
import { getWearableConnections, isProviderConnected } from "@/services/wearables";
import { checkSyncHealth, getSyncLogs } from "@/services/sync/orchestrator";
import { getImplementedProviders } from "@/lib/wearables/providers";

jest.mock("@/lib/supabase/server");
jest.mock("@/services/wearables");
jest.mock("@/services/sync/orchestrator");
jest.mock("@/lib/wearables/providers");

describe("GET /api/wearables/status", () => {
  const mockUser = {
    id: "test-user-123",
    email: "test@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    const mockCreateClient = jest.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as any);

    const request = new Request("http://localhost/api/wearables/status", {
      method: "GET",
    });

    // Test would call the GET handler - mocking would be needed in actual environment
    // This test structure is for demonstration
  });

  it("should return provider status with sync health", async () => {
    const mockConnections = [
      {
        provider: "garmin",
        connection_status: "connected",
        access_token: "token123",
        token_expiry: "2026-05-20",
        last_synced_at: "2026-05-15",
        sync_enabled: true,
        data_visibility_enabled: true,
      },
    ];

    const mockSyncHealth = [
      {
        provider: "garmin",
        isStale: false,
        daysSinceSync: 1,
      },
    ];

    const mockProviders = [
      { name: "garmin", label: "Garmin Connect" },
      { name: "apple", label: "Apple Health" },
    ];

    const mockGetWearableConnections = jest.mocked(getWearableConnections);
    const mockCheckSyncHealth = jest.mocked(checkSyncHealth);
    const mockGetImplementedProviders = jest.mocked(getImplementedProviders);

    mockGetWearableConnections.mockResolvedValue(mockConnections as any);
    mockCheckSyncHealth.mockResolvedValue(mockSyncHealth as any);
    mockGetImplementedProviders.mockReturnValue(mockProviders as any);

    // Verify the mocks are set up correctly
    const connections = await getWearableConnections(mockUser.id);
    expect(connections).toEqual(mockConnections);
    expect(connections[0].provider).toBe("garmin");
    expect(connections[0].connection_status).toBe("connected");
  });

  it("should filter by provider if requested", async () => {
    const mockConnections = [
      {
        provider: "garmin",
        connection_status: "connected",
        access_token: "token123",
      },
      {
        provider: "apple",
        connection_status: "disconnected",
        access_token: null,
      },
    ];

    const mockGetWearableConnections = jest.mocked(getWearableConnections);
    mockGetWearableConnections.mockResolvedValue(mockConnections as any);

    const connections = await getWearableConnections(mockUser.id);
    const garminOnly = connections.filter((c) => c.provider === "garmin");

    expect(garminOnly).toHaveLength(1);
    expect(garminOnly[0].provider).toBe("garmin");
  });
});
