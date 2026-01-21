import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSubscription() {
  const phoneNumber = '+27727002502';  // With + prefix
  
  console.log('Checking subscription for:', phoneNumber);
  console.log('='.repeat(50));
  
  // Check subscription status
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('phone_number', phoneNumber);
  
  if (subErr) {
    console.log('❌ Error:', subErr.message);
  } else if (!sub || sub.length === 0) {
    console.log('❌ No subscription found');
  } else {
    console.log('✅ Subscription found:');
    console.log(JSON.stringify(sub[0], null, 2));
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Check recent messages
  const { data: msgs, error: msgErr } = await supabase
    .from('messages')
    .select('content, created_at, processed')
    .eq('from_number', phoneNumber)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (msgErr) {
    console.log('❌ Message error:', msgErr.message);
  } else {
    console.log(`\n📨 Recent messages (${msgs?.length || 0}):`);
    msgs?.forEach((m, i) => {
      console.log(`${i + 1}. "${m.content}" | ${m.created_at} | Processed: ${m.processed}`);
    });
  }
}

checkSubscription().catch(console.error);
