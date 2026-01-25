#!/usr/bin/env node

import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import { sendTemplateMessage, sendWhatsAppMessage } from './config/whatsapp.js';
import { composeMomentMessage } from './src/services/broadcast-composer.js';

dotenv.config();

async function testRealBroadcast() {
  const testPhone = '+27727002502';
  
  console.log('🚀 PRODUCTION BROADCAST TEST\n');
  console.log('Target:', testPhone);
  
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
  
  try {
    // Message 1: Generic template
    console.log('\n📤 Sending template...');
    await sendTemplateMessage(testPhone, 'moment_notification', 'en', []);
    console.log('✅ Template sent');
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Message 2: Full attributed moment
    console.log('\n📤 Sending full moment...');
    const fullMoment = await composeMomentMessage(moment.id);
    await sendWhatsAppMessage(testPhone, fullMoment);
    console.log('✅ Full moment sent');
    
    console.log('\n✅ BROADCAST COMPLETE');
    console.log('Check WhatsApp for two messages');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRealBroadcast().catch(console.error);
