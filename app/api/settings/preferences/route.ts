// GET /api/settings/preferences - Fetch user preferences
// POST /api/settings/preferences - Update user preferences

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadUserPreferences, upsertUserPreferences } from '@/services/preferences/core';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await loadUserPreferences(user.id);

    return NextResponse.json(preferences, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const result = await upsertUserPreferences(user.id, body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    // Return updated preferences
    const preferences = await loadUserPreferences(user.id);
    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
