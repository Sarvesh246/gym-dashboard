import { getWearableConnections, isProviderConnected } from "@/services/wearables";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server");

describe("Wearables Service", () => {
  const mockUser = { id: "test-user-123" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getWearableConnections", () => {
    it("should return wearable connections for a user including training API support", async () => {
      const mockConnections = [
        {
          user_id: mockUser.id,
          provider: "garmin",
          connection_status: "connected",
          access_token: "token123",
          refresh_token: "refresh123",
          token_expiry: "2026-05-20",
          last_synced_at: "2026-05-15",
          sync_enabled: true,
          data_visibility_enabled: true,
          created_at: "2026-05-01",
          updated_at: "2026-05-15",
        },
      ];

      const mockCreateClient = jest.mocked(createClient);
      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockConnections,
              error: null,
            }),
          }),
        }),
      } as any);

      const connections = await getWearableConnections(mockUser.id);
      expect(connections).toBeDefined();
      expect(connections).toHaveLength(1);
      expect(connections[0].provider).toBe("garmin");
      expect(connections[0].connection_status).toBe("connected");
    });

    it("should handle errors gracefully", async () => {
      const mockCreateClient = jest.mocked(createClient);
      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      } as any);

      const connections = await getWearableConnections(mockUser.id);
      expect(connections).toEqual([]);
    });
  });

  describe("isProviderConnected", () => {
    it("should return true if provider is connected", async () => {
      const mockConnection = {
        user_id: mockUser.id,
        provider: "garmin",
        connection_status: "connected",
        token_expiry: "2026-12-31",
      };

      const mockCreateClient = jest.mocked(createClient);
      const mockSecondEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockConnection,
          error: null,
        }),
      });

      const mockFirstEq = jest.fn().mockReturnValue({
        eq: mockSecondEq,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockFirstEq,
          }),
        }),
      } as any);

      const connected = await isProviderConnected(mockUser.id, "garmin");
      expect(connected).toBe(true);
    });

    it("should return false if provider is disconnected", async () => {
      const mockConnection = {
        user_id: mockUser.id,
        provider: "garmin",
        connection_status: "disconnected",
        token_expiry: "2026-12-31",
      };

      const mockCreateClient = jest.mocked(createClient);
      const mockSecondEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockConnection,
          error: null,
        }),
      });

      const mockFirstEq = jest.fn().mockReturnValue({
        eq: mockSecondEq,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockFirstEq,
          }),
        }),
      } as any);

      const connected = await isProviderConnected(mockUser.id, "garmin");
      expect(connected).toBe(false);
    });

    it("should return false if provider has no connection", async () => {
      const mockCreateClient = jest.mocked(createClient);
      const mockSecondEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockFirstEq = jest.fn().mockReturnValue({
        eq: mockSecondEq,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockFirstEq,
          }),
        }),
      } as any);

      const connected = await isProviderConnected(mockUser.id, "garmin");
      expect(connected).toBe(false);
    });
  });
});
