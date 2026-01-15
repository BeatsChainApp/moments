#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testProgressTracking() {
  try {
    console.log('🧪 Testing real-time progress tracking...');
    
    // Create broadcast record
    const { data: broadcastData } = await supabase
      .from('broadcasts')
      .insert({
        recipient_count: 100,
        status: 'pending'
      })
      .select()
      .single();
    
    const broadcastId = broadcastData.id;
    console.log('✅ Created broadcast:', broadcastId);
    
    // Create test recipients
    const recipients = [];
    for (let i = 0; i < 100; i++) {
      recipients.push(`+27${String(i).padStart(9, '0')}`);
    }
    
    // Start broadcast
    const webhookUrl = `${process.env.SUPABASE_URL}/functions/v1/broadcast-webhook`;
    
    console.log('📡 Starting broadcast with progress tracking...');
    
    // Start broadcast in background
    const broadcastPromise = fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcast_id: broadcastId,
        message: 'Testing progress tracking',
        recipients: recipients
      })
    });
    
    // Poll for progress updates
    console.log('📊 Monitoring progress...\n');
    
    let lastProgress = -1;
    const progressInterval = setInterval(async () => {
      const { data: broadcast } = await supabase
        .from('broadcasts')
        .select('status, batches_total, batches_completed, progress_percentage, success_count, failure_count')
        .eq('id', broadcastId)
        .single();
      
      if (broadcast && broadcast.progress_percentage !== lastProgress) {
        lastProgress = broadcast.progress_percentage;
        
        const progressBar = '█'.repeat(Math.floor(broadcast.progress_percentage / 5)) + 
                           '░'.repeat(20 - Math.floor(broadcast.progress_percentage / 5));
        
        console.log(`[${progressBar}] ${broadcast.progress_percentage.toFixed(1)}% - ` +
                   `Batch ${broadcast.batches_completed}/${broadcast.batches_total} - ` +
                   `Status: ${broadcast.status} - ` +
                   `Success: ${broadcast.success_count || 0}`);
        
        if (broadcast.status === 'completed') {
          clearInterval(progressInterval);
          console.log('\n✅ Broadcast completed!');
          console.log(`📊 Final stats: ${broadcast.success_count} success, ${broadcast.failure_count} failed`);
        }
      }
    }, 2000); // Check every 2 seconds
    
    // Wait for broadcast to complete
    await broadcastPromise;
    
    // Give final update time to show
    setTimeout(async () => {
      clearInterval(progressInterval);
      
      // Cleanup
      await supabase.from('broadcast_batches').delete().eq('broadcast_id', broadcastId);
      await supabase.from('broadcasts').delete().eq('id', broadcastId);
      console.log('🧹 Cleaned up test data');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testProgressTracking();