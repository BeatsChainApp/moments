import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPhoneFormat() {
  // Check messages for this number
  const { data: msgs } = await supabase
    .from('messages')
    .select('from_number')
    .or('from_number.eq.27727002502,from_number.eq.+27727002502')
    .limit(1);
  
  console.log('Phone number format in messages table:');
  console.log(msgs?.[0]?.from_number || 'NOT FOUND');
  
  // Try to create subscription with + prefix
  const phoneWithPlus = '+27727002502';
  console.log('\nAttempting to create subscription with:', phoneWithPlus);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      phone_number: phoneWithPlus,
      opted_in: false,
      opted_out_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    }, {
      onConflict: 'phone_number'
    })
    .select();
  
  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Success! Subscription created/updated');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkPhoneFormat().catch(console.error);
