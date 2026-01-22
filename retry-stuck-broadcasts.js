import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function retryStuckBroadcasts() {
  console.log('🔄 Retrying stuck broadcasts...\n');

  // 1. Get stuck broadcasts
  const { data: stuckBroadcasts, error } = await supabase
    .from('broadcasts')
    .select('id, moment_id, recipient_count, broadcast_started_at')
    .in('status', ['pending', 'processing'])
    .order('broadcast_started_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching broadcasts:', error);
    return;
  }

  console.log(`📊 Found ${stuckBroadcasts?.length || 0} stuck broadcasts\n`);

  if (!stuckBroadcasts || stuckBroadcasts.length === 0) {
    console.log('✅ No stuck broadcasts to retry');
    return;
  }

  // 2. Get active subscribers
  const { data: subscribers, error: subError } = await supabase
    .rpc('get_active_subscribers');

  if (subError) {
    console.error('❌ Error getting subscribers:', subError);
    console.log('⚠️  Trying direct query...');
    
    const { data: directSubs } = await supabase
      .from('subscriptions')
      .select('phone_number')
      .eq('opted_in', true);
    
    if (!directSubs || directSubs.length === 0) {
      console.error('❌ No subscribers found');
      return;
    }
    
    console.log(`✅ Found ${directSubs.length} subscribers via direct query`);
  } else {
    console.log(`✅ Found ${subscribers?.length || 0} active subscribers\n`);
  }

  // 3. Process each stuck broadcast
  for (const broadcast of stuckBroadcasts) {
    console.log(`\n📡 Processing broadcast ${broadcast.id}...`);
    console.log(`   Moment: ${broadcast.moment_id}`);
    console.log(`   Started: ${broadcast.broadcast_started_at}`);
    
    // Get moment details
    const { data: moment } = await supabase
      .from('moments')
      .select('*')
      .eq('id', broadcast.moment_id)
      .single();

    if (!moment) {
      console.log('   ❌ Moment not found, marking as failed');
      await supabase
        .from('broadcasts')
        .update({ status: 'failed', broadcast_completed_at: new Date().toISOString() })
        .eq('id', broadcast.id);
      continue;
    }

    console.log(`   Title: ${moment.title}`);
    
    // Trigger broadcast webhook
    try {
      const webhookUrl = `${process.env.SUPABASE_URL}/functions/v1/broadcast-webhook`;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          broadcast_id: broadcast.id,
          moment_id: moment.id,
          retry: true
        })
      });

      if (response.ok) {
        console.log('   ✅ Webhook triggered successfully');
      } else {
        const error = await response.text();
        console.log(`   ❌ Webhook failed: ${response.status} - ${error.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`   ❌ Webhook error: ${err.message}`);
    }
  }

  console.log('\n✅ Retry complete');
}

retryStuckBroadcasts().catch(console.error);
