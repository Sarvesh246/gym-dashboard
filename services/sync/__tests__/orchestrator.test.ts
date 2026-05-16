import { checkSyncHealth, getSyncLogs } from "@/services/sync/orchestrator";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server");

describe("Sync Orchestrator Service", () => {
  const mockUser = { id: "test-user-123" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkSyncHealth", () => {
    it("should return sync health status for all providers", async () => {
      const mockConnections = [
        {
          user_id: mockUser.id,
          provider: "garmin",
          connection_status: "connected",
          last_synced_at: new Date("2026-05-15").toISOString(),
        },
      ];

      const mockCreateClient = jest.mocked(createClient);
      const mockFirstEq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockConnections,
          error: null,
        }),
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockFirstEq,
          }),
        }),
      } as any);

      const health = await checkSyncHealth(mockUser.id);
      expect(health).toBeDefined();
      expect(health.length).toBeGreaterThan(0);
      expect(health[0].provider).toBe("garmin");
    });

    it("should mark data as stale if not synced within threshold", async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const mockConnections = [
        {
          user_id: mockUser.id,
          provider: "garmin",
          connection_status: "connected",
          last_synced_at: tenDaysAgo,
        },
      ];

      const mockCreateClient = jest.mocked(createClient);
      const mockFirstEq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockConnections,
          error: null,
        }),
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockFirstEq,
          }),
        }),
      } as any);

      const health = await checkSyncHealth(mockUser.id);
      expect(health).toBeDefined();
      expect(health[0].isStale).toBe(true);
    });

    it("should handle no sync logs gracefully", async () => {
      const mockCreateClient = jest.mocked(createClient);
      const mockFirstEq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockFirstEq,
          }),
        }),
      } as any);

      const health = await checkSyncHealth(mockUser.id);
      expect(health).toBeDefined();
      expect(health).toEqual([]);
    });
  });

  describe("getSyncLogs", () => {
    it("should return sync logs filtered by user and provider", async () => {
      const mockLogs = [
        {
          user_id: mockUser.id,
          provider: "garmin",
          sync_status: "completed",
          created_at: "2026-05-15",
          error_message: null,
          records_synced: 150,
        },
        {
          user_id: mockUser.id,
          provider: "garmin",
          sync_status: "failed",
          created_at: "2026-05-14",
          error_message: "Network timeout",
          records_synced: 0,
        },
      ];

      const mockCreateClient = jest.mocked(createClient);
      const mockEqForProvider = jest.fn().mockResolvedValue({
        data: mockLogs,
        error: null,
      });

      const mockLimit = jest.fn().mockReturnValue({
        eq: mockEqForProvider,
      });

      const mockOrder = jest.fn().mockReturnValue({
        limit: mockLimit,
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockEq,
          }),
        }),
      } as any);

      const logs = await getSyncLogs(mockUser.id, "garmin");
      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);
    });

    it("should include error messages for failed syncs", async () => {
      const mockFailedLog = {
        user_id: mockUser.id,
        provider: "garmin",
        sync_status: "failed",
        error_message: "Invalid authentication token",
        created_at: "2026-05-14",
        records_synced: 0,
      };

      const mockCreateClient = jest.mocked(createClient);
      const mockEqForProvider = jest.fn().mockResolvedValue({
        data: [mockFailedLog],
        error: null,
      });

      const mockLimit = jest.fn().mockReturnValue({
        eq: mockEqForProvider,
      });

      const mockOrder = jest.fn().mockReturnValue({
        limit: mockLimit,
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: mockEq,
          }),
        }),
      } as any);

      const logs = await getSyncLogs(mockUser.id, "garmin");
      expect(logs[0]).toHaveProperty("error_message");
    });
  });
});
