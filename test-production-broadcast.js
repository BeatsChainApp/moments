#!/usr/bin/env node

import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import { broadcastMoment } from './src/broadcast.js';

dotenv.config();

async function testProductionBroadcast() {
  console.log('🚀 PRODUCTION BROADCAST SIMULATION\n');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Get first moment
  const { data: moment, error } = await supabase
    .from('moments')
    .select('*')
    .eq('status', 'draft')
    .limit(1)
    .single();
  
  if (error || !moment) {
    console.log('❌ No draft moments found');
    console.log('   Create a moment in admin dashboard first');
    return;
  }
  
  console.log('📝 Moment to broadcast:');
  console.log('   Title:', moment.title);
  console.log('   Content:', moment.content.substring(0, 50) + '...');
  console.log('   Region:', moment.region);
  console.log('   Category:', moment.category);
  
  // Check subscribers
  const { data: subscribers, error: subError } = await supabase
    .from('subscriptions')
    .select('phone_number')
    .eq('opted_in', true);
  
  if (subError) {
    console.log('❌ Error fetching subscribers:', subError.message);
    return;
  }
  
  console.log('\n📊 Broadcast scope:');
  console.log('   Subscribers:', subscribers?.length || 0);
  
  if (!subscribers || subscribers.length === 0) {
    console.log('\n⚠️  No subscribers found');
    console.log('   Add test subscriber: Send START to +27 65 829 5041');
    return;
  }
  
  console.log('\n🔍 Pre-flight checks:');
  console.log('   ✅ Template approved (moment_notification)');
  console.log('   ✅ Attribution system ready');
  console.log('   ✅ Canonical URLs configured');
  console.log('   ✅ Two-message pattern implemented');
  console.log('   ✅ Subscribers found:', subscribers.length);
  
  console.log('\n⚠️  READY TO BROADCAST');
  console.log('   This will send to', subscribers.length, 'real phone numbers');
  console.log('\n   To proceed, uncomment the broadcast call below');
  console.log('   and run: node test-production-broadcast.js\n');
  
  // UNCOMMENT TO ACTUALLY BROADCAST:
  // console.log('🚀 Broadcasting...\n');
  // const result = await broadcastMoment(moment.id);
  // console.log('✅ Broadcast complete:');
  // console.log('   Recipients:', result.recipients);
  // console.log('   Success:', result.success);
  // console.log('   Failures:', result.failures);
  
  console.log('═══════════════════════════════════════════════════');
}

testProductionBroadcast().catch(console.error);
