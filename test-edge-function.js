#!/usr/bin/env node

import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';

dotenv.config();

async function testEdgeFunctionBroadcast() {
  const testPhone = '+27727002502';
  
  console.log('🧪 Testing Edge Function Broadcast\n');
  
  // Get a moment
  const { data: moment } = await supabase
    .from('moments')
    .select('*')
    .limit(1)
    .single();
  
  if (!moment) {
    console.log('❌ No moments found');
    return;
  }
  
  console.log('Moment:', moment.title);
  console.log('ID:', moment.id);
  
  // Create broadcast record
  const { data: broadcast } = await supabase
    .from('broadcasts')
    .insert({
      moment_id: moment.id,
      recipient_count: 1,
      status: 'pending'
    })
    .select()
    .single();
  
  console.log('Broadcast ID:', broadcast.id);
  
  // Call Edge Function with moment_id (it will compose the message)
  const webhookUrl = `${process.env.SUPABASE_URL}/functions/v1/broadcast-webhook`;
  
  console.log('\n📤 Calling Edge Function...');
  console.log('URL:', webhookUrl);
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      broadcast_id: broadcast.id,
      moment_id: moment.id,
      recipients: [testPhone]
    })
  });
  
  const result = await response.json();
  
  if (response.ok) {
    console.log('\n✅ Edge Function Success:');
    console.log('   Success:', result.success_count);
    console.log('   Failed:', result.failure_count);
    console.log('\n📱 Check WhatsApp for:');
    console.log('   1. Generic template');
    console.log('   2. Full moment with NEW attribution format');
    console.log('   3. Canonical URL (/moments/{slug})');
  } else {
    console.log('\n❌ Edge Function Error:');
    console.log(JSON.stringify(result, null, 2));
  }
}

testEdgeFunctionBroadcast().catch(console.error);
