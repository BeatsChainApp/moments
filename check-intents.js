import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkIntents() {
  const { data: intents } = await supabase
    .from('moment_intents')
    .select('id, moment_id, status, created_at, attempts')
    .eq('channel', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n📋 Recent WhatsApp Intents:\n');
  
  const grouped = {};
  intents?.forEach(intent => {
    if (!grouped[intent.moment_id]) grouped[intent.moment_id] = [];
    grouped[intent.moment_id].push(intent);
  });

  Object.entries(grouped).forEach(([momentId, intentList]) => {
    console.log(`Moment: ${momentId.substring(0, 8)}...`);
    intentList.forEach(i => {
      console.log(`  - Intent ${i.id.substring(0, 8)}... | ${i.status} | attempts: ${i.attempts} | ${i.created_at}`);
    });
    if (intentList.length > 1) {
      console.log(`  ⚠️  DUPLICATE: ${intentList.length} intents for same moment!`);
    }
    console.log('');
  });
}

checkIntents();
