import { getLatestWearableMetrics, calculateRecoveryModifiers } from "@/services/health/recovery-enhancement";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server");

describe("Recovery Enhancement Service", () => {
  const mockUser = { id: "test-user-123" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateRecoveryModifiers", () => {
    it("should apply HRV adjustments to recovery scoring", () => {
      const metrics = {
        sleep_duration: 7.5,
        sleep_quality: 85,
        hrv: 65,
        resting_heart_rate: 55,
        stress_score: 35,
      };

      const result = calculateRecoveryModifiers(metrics);
      expect(result).toBeDefined();
      expect(result).toHaveProperty("fatigue_adjustment");
      expect(result).toHaveProperty("readiness_adjustment");
      expect(result).toHaveProperty("hrv_stress_indicator");
    });

    it("should increase fatigue sensitivity with low HRV", () => {
      const lowHRVMetrics = {
        sleep_duration: 7.5,
        sleep_quality: 85,
        hrv: 30, // Low HRV
        resting_heart_rate: 55,
        stress_score: 35,
      };

      const result = calculateRecoveryModifiers(lowHRVMetrics);
      expect(result.fatigue_adjustment).toBeGreaterThan(1);
      expect(result.readiness_adjustment).toBeLessThan(1);
    });

    it("should handle resting heart rate elevation", () => {
      const elevatedRHRMetrics = {
        sleep_duration: 7.5,
        sleep_quality: 85,
        hrv: 50,
        resting_heart_rate: 75, // Elevated
        stress_score: 35,
      };

      const result = calculateRecoveryModifiers(elevatedRHRMetrics);
      expect(result).toBeDefined();
      expect(result.readiness_adjustment).toBeLessThanOrEqual(1);
    });

    it("should adjust sleep quality when data is available", () => {
      const metrics = {
        sleep_duration: 4.5, // Short sleep
        sleep_quality: 60,
        hrv: 50,
        resting_heart_rate: 58,
        stress_score: 45,
      };

      const result = calculateRecoveryModifiers(metrics);
      expect(result).toBeDefined();
      expect(result.fatigue_adjustment).toBeDefined();
    });
  });

  describe("getLatestWearableMetrics", () => {
    it("should return most recent wearable metrics including training data", async () => {
      const mockMetricsData = {
        metric_date: "2026-05-15",
        provider: "garmin",
        sleep_duration: 7.5,
        sleep_quality: 85,
        hrv: 65,
        resting_heart_rate: 55,
        stress_score: 35,
        daily_steps: 8000,
        active_calories: 500,
        vo2_max: 50,
        training_load: 65,
        recovery_status: "high",
      };

      const mockCreateClient = jest.mocked(createClient);
      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockMetricsData,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const metrics = await getLatestWearableMetrics(mockUser.id);
      expect(metrics).toBeDefined();
      expect(metrics?.provider).toBe("garmin");
    });

    it("should handle multiple providers correctly with all APIs", async () => {
      const mockMetricsData = {
        metric_date: "2026-05-15",
        provider: "garmin",
        sleep_duration: 7.5,
        sleep_quality: 85,
        hrv: 65,
        resting_heart_rate: 55,
        stress_score: 35,
        daily_steps: 8000,
        active_calories: 500,
        vo2_max: 50,
        training_load: 65,
        recovery_status: "moderate",
      };

      const mockCreateClient = jest.mocked(createClient);
      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockMetricsData,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const metrics = await getLatestWearableMetrics(mockUser.id);
      expect(metrics).toBeDefined();
    });

    it("should return null if no metrics available", async () => {
      const mockCreateClient = jest.mocked(createClient);
      mockCreateClient.mockResolvedValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const metrics = await getLatestWearableMetrics(mockUser.id);
      expect(metrics).toBeNull();
    });
  });

  describe("confidence scoring", () => {
    it("should score high confidence for fresh, complete data including training metrics", () => {
      const completeMetrics = {
        sleep_duration: 7.5,
        sleep_quality: 85,
        hrv: 65,
        resting_heart_rate: 55,
        stress_score: 25,
        vo2_max: 50,
        training_load: 65,
        recovery_status: "high",
      };

      const result = calculateRecoveryModifiers(completeMetrics);
      expect(result).toBeDefined();
      expect(result.readiness_adjustment).toBeGreaterThan(0.9);
    });

    it("should score medium confidence for partial data", () => {
      const partialMetrics = {
        sleep_duration: 7.5,
        sleep_quality: 75,
        resting_heart_rate: 58,
        stress_score: 40,
      };

      const result = calculateRecoveryModifiers(partialMetrics);
      expect(result).toBeDefined();
    });

    it("should score low confidence for sparse data", () => {
      const sparseMetrics = {
        sleep_duration: 6.0,
        sleep_quality: 60,
      };

      const result = calculateRecoveryModifiers(sparseMetrics);
      expect(result.fatigue_adjustment).toBeDefined();
    });
  });
});
