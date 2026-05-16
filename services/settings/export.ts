// Data export service for GDPR compliance and user data portability

import { createClient } from '@/lib/supabase/server';
import { EXPORT_BATCH_SIZE } from '@/lib/settings/constants';

export type ExportFormat = 'json' | 'csv';
export type ExportDataType = 'workouts' | 'nutrition' | 'recovery' | 'body_metrics' | 'analytics';

export interface ExportRequest {
  user_id: string;
  format: ExportFormat;
  data_types: ExportDataType[];
  timestamp: string;
}

export interface ExportResult {
  success: boolean;
  file_url?: string;
  expires_at?: string;
  error?: string;
}

/**
 * Generate a data export for the user
 * Supports JSON and CSV formats
 */
export async function generateDataExport(
  userId: string,
  format: ExportFormat,
  dataTypes: ExportDataType[]
): Promise<ExportResult> {
  const supabase = await createClient();

  try {
    const exportData: Record<ExportDataType, any> = {
      workouts: null,
      nutrition: null,
      recovery: null,
      body_metrics: null,
      analytics: null,
    };

    // Fetch all requested data types
    if (dataTypes.includes('workouts')) {
      const { data } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      exportData.workouts = data || [];
    }

    if (dataTypes.includes('nutrition')) {
      const { data } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      exportData.nutrition = data || [];
    }

    if (dataTypes.includes('recovery')) {
      const { data } = await supabase
        .from('recovery_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      exportData.recovery = data || [];
    }

    if (dataTypes.includes('body_metrics')) {
      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      exportData.body_metrics = data || [];
    }

    if (dataTypes.includes('analytics')) {
      const { data } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false });
      exportData.analytics = data || [];
    }

    // Format data based on selected format
    let fileContent: string;
    let fileName: string;
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      fileContent = JSON.stringify(exportData, null, 2);
      fileName = `fitness-data-export-${timestamp}.json`;
    } else {
      // CSV format
      fileContent = convertToCSV(exportData, dataTypes);
      fileName = `fitness-data-export-${timestamp}.csv`;
    }

    // Create export request record
    const { data: exportRecord } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: userId,
        export_format: format,
        data_types: dataTypes,
        status: 'completed',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    return {
      success: true,
      file_url: `data:text/${format === 'csv' ? 'plain' : 'json'};charset=utf-8,${encodeURIComponent(fileContent)}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error generating export:', error);
    return {
      success: false,
      error: 'Failed to generate data export',
    };
  }
}

/**
 * Convert exported data to CSV format
 */
function convertToCSV(data: Record<ExportDataType, any>, dataTypes: ExportDataType[]): string {
  const csvParts: string[] = [];

  for (const dataType of dataTypes) {
    if (!data[dataType] || data[dataType].length === 0) continue;

    const records = data[dataType];
    csvParts.push(`\n\n=== ${dataType.toUpperCase()} ===\n`);

    // Get headers from first record
    const headers = Object.keys(records[0]);
    csvParts.push(headers.map((h) => `"${h}"`).join(','));

    // Add data rows
    for (const record of records) {
      const row = headers.map((h) => {
        const value = record[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvParts.push(row.join(','));
    }
  }

  return csvParts.join('\n');
}

/**
 * Request deletion of user data (for right to be forgotten)
 */
export async function requestDataDeletion(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Create deletion request record
    await supabase.from('data_export_requests').insert({
      user_id: userId,
      export_format: 'json',
      data_types: ['workouts', 'nutrition', 'recovery', 'body_metrics', 'analytics'],
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day grace period
    });

    return { success: true };
  } catch (error) {
    console.error('Error requesting data deletion:', error);
    return { success: false, error: 'Failed to request data deletion' };
  }
}

/**
 * Get user's export history
 */
export async function getExportHistory(userId: string): Promise<any[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('data_export_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);

  return data || [];
}

/**
 * Check if export link is still valid
 */
export function isExportLinkValid(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date();
}
