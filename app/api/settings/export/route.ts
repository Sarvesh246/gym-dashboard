// POST /api/settings/export - Generate data export

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDataExport } from '@/services/settings/export';

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
    const { format, data_types } = body;

    // Validate input
    if (!format || !['json', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
    }

    if (!Array.isArray(data_types) || data_types.length === 0) {
      return NextResponse.json({ error: 'At least one data type must be selected' }, { status: 400 });
    }

    const validDataTypes = ['workouts', 'nutrition', 'recovery', 'body_metrics', 'analytics'];
    if (!data_types.every((dt: string) => validDataTypes.includes(dt))) {
      return NextResponse.json({ error: 'Invalid data types' }, { status: 400 });
    }

    const result = await generateDataExport(user.id, format, data_types);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
