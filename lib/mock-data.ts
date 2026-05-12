// All mock/placeholder data for Stage 1

export const mockUser = {
  name: "Alex",
  fullName: "Alex Morgan",
  bio: "Strength & endurance athlete",
  joinDate: "January 2024",
  avatar: null,
};

export const mockMetrics = {
  recoveryScore: 87,
  calories: { consumed: 1160, total: 2400, remaining: 1240 },
  protein: { consumed: 142, goal: 180, unit: "g" },
  sleep: { hours: 8.2, score: 91 },
  workoutStatus: "Rest Day",
  currentStreak: 12,
  totalWorkouts: 247,
  weeklyWorkouts: 4,
  weeklyGoal: 5,
  weight: { current: 82.1, unit: "kg" },
};

export const mockBodyMetrics = {
  height: { value: 178, unit: "cm" },
  weight: { value: 82.1, unit: "kg" },
  age: 28,
  bodyFat: 14.2,
};

// 30-day weight trend
export const mockWeightData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  value: parseFloat((84.5 - i * 0.08 + (Math.sin(i * 0.7) * 0.4)).toFixed(1)),
}));

// 7-day calorie data
export const mockCalorieData = [
  { date: "Mon", consumed: 2100, goal: 2400 },
  { date: "Tue", consumed: 2350, goal: 2400 },
  { date: "Wed", consumed: 1980, goal: 2400 },
  { date: "Thu", consumed: 2280, goal: 2400 },
  { date: "Fri", consumed: 2450, goal: 2400 },
  { date: "Sat", consumed: 2600, goal: 2400 },
  { date: "Sun", consumed: 1160, goal: 2400 },
];

// 30-day workout volume
export const mockWorkoutVolumeData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  volume: i % 7 === 6 || i % 7 === 0 ? 0 : Math.floor(Math.random() * 8000 + 4000),
}));

// 14-day sleep data
export const mockSleepData = [
  { date: "Apr 28", hours: 7.2 },
  { date: "Apr 29", hours: 8.5 },
  { date: "Apr 30", hours: 6.8 },
  { date: "May 1",  hours: 7.9 },
  { date: "May 2",  hours: 8.1 },
  { date: "May 3",  hours: 9.0 },
  { date: "May 4",  hours: 7.5 },
  { date: "May 5",  hours: 7.8 },
  { date: "May 6",  hours: 8.3 },
  { date: "May 7",  hours: 6.5 },
  { date: "May 8",  hours: 7.7 },
  { date: "May 9",  hours: 8.4 },
  { date: "May 10", hours: 7.9 },
  { date: "May 11", hours: 8.2 },
];

// HRV trend (14 days)
export const mockHRVData = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  value: Math.floor(48 + Math.sin(i * 0.8) * 8 + i * 0.5),
}));

export const mockInsights = [
  {
    id: 1,
    icon: "trending-up",
    text: "Recovery trend improving over the past 7 days. Your body is adapting well.",
    variant: "success" as const,
  },
  {
    id: 2,
    icon: "zap",
    text: "Protein intake consistently below target. Consider a high-protein breakfast to close the gap.",
    variant: "warning" as const,
  },
  {
    id: 3,
    icon: "clock",
    text: "Your best training window is 6–8 PM based on recent performance data.",
    variant: "accent" as const,
  },
];

// Six named body zones for the recovery map — one status + score per region
export const mockBodyZones = [
  { id: "chest",     label: "Chest",     score: 91, status: "recovered"  as const },
  { id: "shoulders", label: "Shoulders", score: 50, status: "fatigued"   as const },
  { id: "arms",      label: "Arms",      score: 88, status: "recovered"  as const },
  { id: "core",      label: "Core",      score: 67, status: "recovering" as const },
  { id: "quads",     label: "Quads",     score: 81, status: "recovered"  as const },
  { id: "calves",    label: "Calves",    score: 90, status: "recovered"  as const },
];

export const mockRecentWorkouts = [
  { id: 1, name: "Upper Push Day", date: "May 9", duration: "52 min", volume: "14,200 kg", type: "Strength" },
  { id: 2, name: "Lower Body Power", date: "May 8", duration: "61 min", volume: "18,500 kg", type: "Strength" },
  { id: 3, name: "Zone 2 Cardio", date: "May 6", duration: "45 min", volume: "—", type: "Cardio" },
];

export const mockAchievements = [
  { id: 1, name: "First Workout", icon: "🏋️", earned: true, date: "Jan 15" },
  { id: 2, name: "7-Day Streak", icon: "🔥", earned: true, date: "Feb 3" },
  { id: 3, name: "100 Workouts", icon: "💯", earned: true, date: "Mar 20" },
  { id: 4, name: "30-Day Streak", icon: "⚡", earned: false, date: null },
];
