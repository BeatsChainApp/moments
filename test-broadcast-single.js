import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSingleBroadcast() {
  console.log('🧪 Testing single broadcast to +27727002502...\n');

  const { data: moment, error: momentError } = await supabase
    .from('moments')
    .insert({
      title: 'Test Duplicate Prevention',
      content: 'This is a test to verify no duplicate broadcasts are sent.',
      region: 'National',
      category: 'Community',
      content_source: 'whatsapp',
      status: 'draft',
      created_by: '+27727002502'
    })
    .select()
    .single();

  if (momentError) {
    console.error('❌ Failed to create moment:', momentError);
    return;
  }

  console.log(`✅ Created test moment: ${moment.id}`);

  const { data: intent, error: intentError } = await supabase
    .from('moment_intents')
    .insert({
      moment_id: moment.id,
      channel: 'whatsapp',
      action: 'publish',
      status: 'pending',
      payload: {
        title: moment.title,
        full_text: moment.content,
        region: moment.region,
        category: moment.category,
        link: `https://moments.unamifoundation.org/moments/test-${moment.id.substring(0, 6)}`
      }
    })
    .select()
    .single();

  if (intentError) {
    console.error('❌ Failed to create intent:', intentError);
    return;
  }

  console.log(`✅ Created intent: ${intent.id}`);
  console.log('\n⏳ Waiting 90 seconds for N8N to process...');
  console.log('📱 Check your phone (+27727002502) for messages');
  console.log('   Expected: 2 messages (template + attributed moment)');
  console.log('   NOT expected: 4 messages (duplicates)\n');

  await new Promise(resolve => setTimeout(resolve, 90000));

  const { data: updatedIntent } = await supabase
    .from('moment_intents')
    .select('*')
    .eq('id', intent.id)
    .single();

  console.log('\n📊 Intent Status:', updatedIntent?.status);
  console.log('📊 Attempts:', updatedIntent?.attempts);
  console.log('📊 Recipients:', updatedIntent?.payload?.recipient_count || 'N/A');

  await supabase.from('moments').delete().eq('id', moment.id);
  console.log('\n🧹 Cleaned up test moment');
}

testSingleBroadcast().catch(console.error);
