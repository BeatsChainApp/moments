import { supabase } from './config/supabase.js';

async function diagnose() {
  console.log('=== BROADCAST SYSTEM DIAGNOSIS ===\n');
  
  // Check subscriptions
  const { data: subs, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('opted_in', true);
  
  console.log(`✓ Active subscribers: ${subs?.length || 0}`);
  if (subs?.length > 0) {
    console.log(`  Sample: ${subs[0].phone_number}`);
  }
  
  // Check recent broadcasts
  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log(`\n✓ Recent broadcasts: ${broadcasts?.length || 0}`);
  broadcasts?.forEach(b => {
    console.log(`  - ${b.id}: ${b.status} (${b.recipient_count} recipients, ${b.success_count} sent)`);
  });
  
  // Check WhatsApp config
  console.log(`\n✓ WhatsApp Config:`);
  console.log(`  PHONE_ID: ${process.env.WHATSAPP_PHONE_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`  TOKEN: ${process.env.WHATSAPP_TOKEN ? '✓ Set' : '✗ Missing'}`);
  
  // Check stuck broadcasts
  const { data: stuck } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('status', 'processing');
  
  console.log(`\n✓ Stuck broadcasts: ${stuck?.length || 0}`);
  
  process.exit(0);
}

diagnose();
