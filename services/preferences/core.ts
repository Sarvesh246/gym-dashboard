// Core preference loading, validation, and persistence

import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_TRAINING_PREFERENCES,
  DEFAULT_RECOVERY_PREFERENCES,
  DEFAULT_NUTRITION_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/lib/preferences/defaults';
import {
  validateUserPreferences,
  validateTrainingPreferences,
  validateRecoveryPreferences,
  validateNutritionPreferences,
  validateNotificationPreferences,
  ValidationError,
} from '@/lib/preferences/validation';

export interface AllPreferences {
  user_preferences: typeof DEFAULT_USER_PREFERENCES;
  training_preferences: typeof DEFAULT_TRAINING_PREFERENCES;
  recovery_preferences: typeof DEFAULT_RECOVERY_PREFERENCES;
  nutrition_preferences: typeof DEFAULT_NUTRITION_PREFERENCES;
  notification_preferences: typeof DEFAULT_NOTIFICATION_PREFERENCES;
}

export async function loadUserPreferences(userId: string): Promise<AllPreferences> {
  const supabase = await createClient();

  const [userPrefs, trainingPrefs, recoveryPrefs, nutritionPrefs, notificationPrefs] = await Promise.all([
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then((r) => r.data),
    supabase
      .from('training_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then((r) => r.data),
    supabase
      .from('recovery_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then((r) => r.data),
    supabase
      .from('nutrition_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then((r) => r.data),
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then((r) => r.data),
  ]);

  return {
    user_preferences: { ...DEFAULT_USER_PREFERENCES, ...userPrefs },
    training_preferences: { ...DEFAULT_TRAINING_PREFERENCES, ...trainingPrefs },
    recovery_preferences: { ...DEFAULT_RECOVERY_PREFERENCES, ...recoveryPrefs },
    nutrition_preferences: { ...DEFAULT_NUTRITION_PREFERENCES, ...nutritionPrefs },
    notification_preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...notificationPrefs },
  };
}

export async function upsertUserPreferences(
  userId: string,
  preferences: Partial<AllPreferences>
): Promise<{ success: boolean; errors: ValidationError[] }> {
  // Validate all preferences first
  const errors = [];
  if (preferences.user_preferences) {
    errors.push(...validateUserPreferences(preferences.user_preferences));
  }
  if (preferences.training_preferences) {
    errors.push(...validateTrainingPreferences(preferences.training_preferences));
  }
  if (preferences.recovery_preferences) {
    errors.push(...validateRecoveryPreferences(preferences.recovery_preferences));
  }
  if (preferences.nutrition_preferences) {
    errors.push(...validateNutritionPreferences(preferences.nutrition_preferences));
  }
  if (preferences.notification_preferences) {
    errors.push(...validateNotificationPreferences(preferences.notification_preferences));
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const supabase = await createClient();

  const updates = [];

  if (preferences.user_preferences) {
    updates.push(
      supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: userId,
            ...preferences.user_preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
    );
  }

  if (preferences.training_preferences) {
    updates.push(
      supabase
        .from('training_preferences')
        .upsert(
          {
            user_id: userId,
            ...preferences.training_preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
    );
  }

  if (preferences.recovery_preferences) {
    updates.push(
      supabase
        .from('recovery_preferences')
        .upsert(
          {
            user_id: userId,
            ...preferences.recovery_preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
    );
  }

  if (preferences.nutrition_preferences) {
    updates.push(
      supabase
        .from('nutrition_preferences')
        .upsert(
          {
            user_id: userId,
            ...preferences.nutrition_preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
    );
  }

  if (preferences.notification_preferences) {
    updates.push(
      supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: userId,
            ...preferences.notification_preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
    );
  }

  try {
    await Promise.all(updates);
    return { success: true, errors: [] };
  } catch (error) {
    console.error('Error upserting preferences:', error);
    return {
      success: false,
      errors: [{ field: 'database', message: 'Failed to save preferences' }],
    };
  }
}

// Initialize preferences for new users
export async function initializeUserPreferences(userId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    await Promise.all([
      supabase.from('user_preferences').insert({ user_id: userId }),
      supabase.from('training_preferences').insert({ user_id: userId }),
      supabase.from('recovery_preferences').insert({ user_id: userId }),
      supabase.from('nutrition_preferences').insert({ user_id: userId }),
      supabase.from('notification_preferences').insert({ user_id: userId }),
    ]);
    return true;
  } catch (error) {
    console.error('Error initializing preferences:', error);
    return false;
  }
}
