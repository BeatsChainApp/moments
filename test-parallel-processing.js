#!/usr/bin/env node

import { config } from 'dotenv';

config();

async function testParallelProcessing() {
  try {
    console.log('🧪 Testing parallel batch processing...');
    
    // Create a proper broadcast record first
    const createBroadcastUrl = `${process.env.SUPABASE_URL}/rest/v1/broadcasts`;
    
    const broadcastResponse = await fetch(createBroadcastUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        recipient_count: 150, // This should create 3 batches
        status: 'pending'
      })
    });
    
    const broadcastData = await broadcastResponse.json();
    const broadcastId = broadcastData[0].id;
    
    console.log('✅ Created broadcast record:', broadcastId);
    
    // Create 150 test recipients (should create 3 batches of 50 each)
    const recipients = [];
    for (let i = 0; i < 150; i++) {
      recipients.push(`+27${String(i).padStart(9, '0')}`);
    }
    
    const webhookUrl = `${process.env.SUPABASE_URL}/functions/v1/broadcast-webhook`;
    
    const testPayload = {
      broadcast_id: broadcastId,
      message: 'Testing parallel batch processing - 3 batches should run simultaneously',
      recipients: recipients,
      moment_id: null
    };
    
    console.log('⚡ Testing parallel processing with 150 recipients (3 batches)...');
    console.log('🎯 Expected: 3 batches processed in parallel, ~30-45 seconds total');
    
    const startTime = Date.now();
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.text();
    const duration = Date.now() - startTime;
    
    console.log('📨 Response status:', response.status);
    console.log('⏱️ Total duration:', (duration / 1000).toFixed(1) + 's');
    console.log('📄 Response:', result);
    
    if (response.ok) {
      const data = JSON.parse(result);
      
      if (data.batches_created === 3) {
        console.log('🎉 PARALLEL PROCESSING IS WORKING!');
        console.log(`📦 Batches created: ${data.batches_created}`);
        console.log(`✅ Success: ${data.success_count}/${data.total_recipients}`);
        console.log(`❌ Failed: ${data.failure_count}/${data.total_recipients}`);
        
        // Calculate performance improvement
        const messagesPerSecond = (data.success_count / (duration / 1000)).toFixed(2);
        console.log(`⚡ Performance: ${messagesPerSecond} messages/second`);
        
        // Compare with sequential processing estimate
        const sequentialTime = data.total_recipients * 1; // 1 second per message
        const improvement = (sequentialTime / (duration / 1000)).toFixed(1);
        console.log(`🚀 Performance improvement: ${improvement}x faster than sequential`);
        
      } else {
        console.log('⚠️ Unexpected batch count:', data.batches_created);
      }
    } else {
      console.log('❌ Parallel processing test failed');
    }
    
    // Cleanup
    await fetch(`${createBroadcastUrl}?id=eq.${broadcastId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_KEY
      }
    });
    
    console.log('🧹 Cleaned up test broadcast');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testParallelProcessing();