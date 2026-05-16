// Notification preference management and scheduling

import { createClient } from '@/lib/supabase/server';

export interface NotificationSchedule {
  type: 'workout_reminder' | 'nutrition_reminder' | 'recovery_warning' | 'weekly_report' | 'hydration_reminder' | 'streak_milestone';
  enabled: boolean;
  time?: string; // HH:MM format
  frequency?: 'daily' | 'weekly' | 'as_needed';
}

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export async function isInQuietHours(quietHours: QuietHours): Promise<boolean> {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [startHour, startMin] = quietHours.start.split(':').map(Number);
  const [endHour, endMin] = quietHours.end.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;
  const currentTotalMinutes = currentHour * 60 + currentMin;

  if (startTotalMinutes < endTotalMinutes) {
    // Normal case: quiet hours don't cross midnight
    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
  } else {
    // Quiet hours cross midnight
    return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes < endTotalMinutes;
  }
}

export async function shouldSendNotification(
  notificationType: NotificationSchedule['type'],
  preferences: any
): Promise<boolean> {
  // Check if notification type is enabled
  const enabledField = `${notificationType}`;
  if (preferences[enabledField] === false) {
    return false;
  }

  // Check quiet hours
  const quietHours: QuietHours = {
    enabled: preferences.quiet_hours_enabled,
    start: preferences.quiet_hours_start || '22:00',
    end: preferences.quiet_hours_end || '08:00',
  };

  const inQuietHours = await isInQuietHours(quietHours);
  if (inQuietHours) {
    return false;
  }

  return true;
}

/**
 * Build notification schedules based on user preferences
 */
export function buildNotificationSchedules(preferences: any): NotificationSchedule[] {
  return [
    {
      type: 'workout_reminder',
      enabled: preferences.workout_reminders ?? true,
      time: '06:00',
      frequency: 'daily',
    },
    {
      type: 'nutrition_reminder',
      enabled: preferences.nutrition_alerts ?? false,
      time: '12:00',
      frequency: 'daily',
    },
    {
      type: 'hydration_reminder',
      enabled: preferences.hydration_reminders ?? false,
      time: '14:00',
      frequency: 'daily',
    },
    {
      type: 'recovery_warning',
      enabled: preferences.recovery_warnings ?? true,
      frequency: 'as_needed',
    },
    {
      type: 'weekly_report',
      enabled: preferences.weekly_report_notifications ?? true,
      time: '19:00',
      frequency: 'weekly',
    },
    {
      type: 'streak_milestone',
      enabled: preferences.streak_milestones ?? true,
      frequency: 'as_needed',
    },
  ];
}

/**
 * Get notification frequency settings
 */
export function getNotificationFrequencyConfig(frequency: 'minimal' | 'normal' | 'frequent'): {
  check_interval_hours: number;
  batch_size: number;
  max_daily: number;
} {
  const configs = {
    minimal: { check_interval_hours: 24, batch_size: 3, max_daily: 3 },
    normal: { check_interval_hours: 12, batch_size: 5, max_daily: 8 },
    frequent: { check_interval_hours: 4, batch_size: 10, max_daily: 20 },
  };

  return configs[frequency];
}

/**
 * Check if user should receive a particular notification type
 * considering frequency limits and quiet hours
 */
export async function canSendNotification(
  userId: string,
  notificationType: NotificationSchedule['type'],
  preferences: any
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Check if notification type is enabled
  const schedules = buildNotificationSchedules(preferences);
  const schedule = schedules.find((s) => s.type === notificationType);

  if (!schedule || !schedule.enabled) {
    return { allowed: false, reason: 'Notification type disabled' };
  }

  // Check quiet hours
  const quietHours: QuietHours = {
    enabled: preferences.quiet_hours_enabled,
    start: preferences.quiet_hours_start || '22:00',
    end: preferences.quiet_hours_end || '08:00',
  };

  const inQuietHours = await isInQuietHours(quietHours);
  if (inQuietHours) {
    return { allowed: false, reason: 'In quiet hours' };
  }

  return { allowed: true };
}

/**
 * Format notification time for user display
 */
export function formatNotificationTime(time: string | undefined): string {
  if (!time) return 'As needed';
  const [hour, min] = time.split(':');
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
  return `${displayHour}:${min} ${ampm}`;
}
