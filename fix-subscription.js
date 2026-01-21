import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixSubscription() {
  const phoneNumber = '27727002502';
  
  console.log('Creating/updating subscription for:', phoneNumber);
  
  // Create subscription with opted_out status
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      phone_number: phoneNumber,
      opted_in: false,
      opted_out_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      regions: ['National'],
      categories: []
    }, {
      onConflict: 'phone_number'
    })
    .select();
  
  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Subscription updated:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  // Verify
  const { data: check } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  
  console.log('\n✅ Verified subscription:');
  console.log('- opted_in:', check.opted_in);
  console.log('- opted_out_at:', check.opted_out_at);
}

fixSubscription().catch(console.error);
