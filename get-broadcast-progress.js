#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getBroadcastProgress(broadcastId) {
  try {
    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .select(`
        id,
        status,
        batches_total,
        batches_completed,
        progress_percentage,
        recipient_count,
        success_count,
        failure_count,
        broadcast_started_at,
        broadcast_completed_at
      `)
      .eq('id', broadcastId)
      .single();

    if (error) {
      console.error('Error fetching broadcast:', error);
      return null;
    }

    // Get batch details
    const { data: batches } = await supabase
      .from('broadcast_batches')
      .select('batch_number, status, success_count, failure_count')
      .eq('broadcast_id', broadcastId)
      .order('batch_number');

    return {
      broadcast,
      batches: batches || [],
      summary: {
        total_batches: broadcast.batches_total || 0,
        completed_batches: broadcast.batches_completed || 0,
        progress: `${broadcast.progress_percentage || 0}%`,
        status: broadcast.status,
        success_rate: broadcast.recipient_count > 0 
          ? `${((broadcast.success_count / broadcast.recipient_count) * 100).toFixed(1)}%`
          : '0%'
      }
    };
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// Example usage
if (process.argv[2]) {
  getBroadcastProgress(process.argv[2]).then(progress => {
    if (progress) {
      console.log('📊 Broadcast Progress:');
      console.log(JSON.stringify(progress, null, 2));
    }
  });
} else {
  console.log('Usage: node get-broadcast-progress.js <broadcast_id>');
}

export { getBroadcastProgress };