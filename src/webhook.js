import { supabase } from '../config/supabase.js';
import { detectLanguage } from './language.js';
import { downloadAndStoreMedia } from './media.js';
import { 
  sendWelcomeHybrid, 
  sendUnsubscribeHybrid
} from './broadcast-hybrid.js';
import { getAuthorityContext } from './authority.js';
import axios from 'axios';

export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.warn('Webhook verification failed');
    res.status(403).json({ error: 'Forbidden' });
  }
}

export async function handleWebhook(req, res) {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    const { entry } = req.body;
    if (!entry || !entry[0]) {
      return res.status(200).json({ status: 'no_entry' });
    }

    const changes = entry[0].changes;
    if (!changes || !changes[0]) {
      return res.status(200).json({ status: 'no_changes' });
    }

    const { value } = changes[0];
    if (!value.messages || value.messages.length === 0) {
      return res.status(200).json({ status: 'no_messages' });
    }

    // Process each message
    for (const message of value.messages) {
      await processMessage(message, value);
    }

    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
}

async function processMessage(message, value) {
  try {
    let fromNumber = message.from;
    
    // Ensure phone number has + prefix for subscription table compatibility
    if (!fromNumber.startsWith('+')) {
      fromNumber = '+' + fromNumber;
    }
    
    const messageType = message.type;
    let content = '';
    let mediaId = null;

    // Extract content based on message type
    switch (messageType) {
      case 'text':
        content = message.text.body;
        break;
      case 'image':
        content = message.image.caption || '[Image]';
        mediaId = message.image.id;
        break;
      case 'audio':
        content = '[Audio message]';
        mediaId = message.audio.id;
        break;
      case 'video':
        content = message.video.caption || '[Video]';
        mediaId = message.video.id;
        break;
      case 'document':
        content = message.document.filename || '[Document]';
        mediaId = message.document.id;
        break;
      default:
        content = `[${messageType} message]`;
    }

    // Handle commands BEFORE storing message
    const command = content.toLowerCase().trim();
    
    if (command === 'stop' || command === 'unsubscribe') {
      await handleOptOut(fromNumber);
      return;
    }
    
    if (command === 'start' || command === 'join') {
      await handleOptIn(fromNumber);
      return;
    }
    
    if (command === 'help') {
      await handleHelp(fromNumber);
      return;
    }
    
    if (command === 'regions') {
      await handleRegions(fromNumber);
      return;
    }
    
    if (command === 'request authority' || command === 'request auth') {
      await handleAuthorityRequest(fromNumber);
      return;
    }
    
    // Check if user is in authority request flow
    const requestState = await checkAuthorityRequestState(fromNumber);
    if (requestState) {
      await handleAuthorityRequestStep(fromNumber, content, requestState);
      return;
    }
    
    // Handle region selection (e.g., "KZN WC GP")
    if (isRegionSelection(command)) {
      await handleRegionSelection(fromNumber, command);
      return;
    }
    
    // Handle casual chat attempts
    if (isCasualMessage(command)) {
      await handleCasualChat(fromNumber);
      return;
    }
    
    // Handle region selection (e.g., "KZN WC GP")
    if (isRegionSelection(command)) {
      await handleRegionSelection(fromNumber, command);
      return;
    }
    
    // Handle casual chat attempts
    if (isCasualMessage(command)) {
      await handleCasualChat(fromNumber);
      return;
    }

    // Detect language
    const languageDetected = detectLanguage(content);

    // Get authority context (async, non-blocking)
    let authorityContext = null;
    try {
      authorityContext = await getAuthorityContext(fromNumber);
      console.log(`Authority context for ${fromNumber}:`, {
        hasAuthority: authorityContext.hasAuthority,
        level: authorityContext.level,
        role: authorityContext.role,
        scope: authorityContext.scope
      });
    } catch (authorityError) {
      console.warn('Authority lookup failed (non-blocking):', authorityError.message);
      // Fail-open: Continue processing without authority context
    }

    // Store message in database and update 24-hour messaging window
    const { data: messageRecord, error: insertError } = await supabase
      .from('messages')
      .insert({
        whatsapp_id: message.id,
        from_number: fromNumber,
        message_type: messageType,
        content,
        language_detected: languageDetected,
        media_id: mediaId,
        processed: false,
        // Store authority context as metadata (shadow mode)
        authority_context: authorityContext ? {
          has_authority: authorityContext.hasAuthority,
          level: authorityContext.level,
          role: authorityContext.role,
          scope: authorityContext.scope,
          approval_mode: authorityContext.approvalMode
        } : null
      })
      .select()
      .single();
    
    // Update 24-hour messaging window (enables freeform messages)
    await supabase.rpc('update_messaging_window', { user_phone: fromNumber });

    if (insertError) {
      console.error('Message insert error:', insertError);
      return;
    }

    // Send confirmation to user
    await sendMessage(fromNumber, 
      `✅ Message received! We'll review and may share it with the community.\n\n` +
      `Reply HELP for commands or STOP to unsubscribe.`
    );

    // Auto-link message to moment as comment
    try {
      const { data: commentId } = await supabase.rpc('create_comment_from_message', {
        p_message_id: messageRecord.id
      });
      
      if (commentId) {
        console.log(`Message auto-linked as comment: ${commentId}`);
      }
    } catch (commentError) {
      console.error('Comment auto-linking failed:', commentError);
    }

    // Process media if present
    if (mediaId) {
      try {
        await downloadAndStoreMedia(mediaId, messageRecord.id, messageType);
      } catch (mediaError) {
        console.error('Media processing error:', mediaError);
      }
    }

    // Call Supabase MCP function for message and comment analysis
    try {
      await supabase.rpc('mcp_advisory', {
        message_content: content,
        message_language: languageDetected,
        message_type: messageType,
        from_number: fromNumber,
        message_timestamp: new Date().toISOString(),
        // Pass authority context to MCP (shadow mode)
        authority_context: authorityContext
      });
      
      // Note: Soft moderation trigger will automatically process this message
      // if it meets auto-approval criteria (see supabase/soft-moderation.sql)
      
    } catch (mcpError) {
      console.error('MCP analysis error:', mcpError);
    }

    // Trigger n8n NGO workflow if configured
    if (process.env.N8N_WEBHOOK_URL) {
      await triggerN8nNGOWorkflow({
        message: messageRecord,
        advisory: { escalation_needed: false }, // Will be updated by MCP
        ngo_pattern: 'template_reply_processing'
      });
    }

    // Mark as processed
    await supabase
      .from('messages')
      .update({ processed: true })
      .eq('id', messageRecord.id);

  } catch (error) {
    console.error('Message processing error:', error);
  }
}

async function handleOptOut(phoneNumber) {
  try {
    // Update existing subscription or create new one with opted_out status
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();
    
    if (existing) {
      // Update existing subscription
      await supabase
        .from('subscriptions')
        .update({
          opted_in: false,
          opted_out_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        })
        .eq('phone_number', phoneNumber);
    } else {
      // Create new subscription record for opt-out
      await supabase
        .from('subscriptions')
        .insert({
          phone_number: phoneNumber,
          opted_in: false,
          opted_out_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        });
    }
    
    // Send unsubscribe confirmation using approved template
    await sendUnsubscribeHybrid(phoneNumber);
    
    console.log(`User ${phoneNumber} opted out with hybrid confirmation`);
  } catch (error) {
    console.error('Opt-out error:', error);
  }
}

async function handleOptIn(phoneNumber) {
  try {
    const defaultRegion = 'National';
    const defaultCategories = ['Education', 'Safety', 'Culture', 'Opportunity', 'Events', 'Health', 'Technology'];
    
    // Update subscription with consent tracking
    await supabase
      .from('subscriptions')
      .upsert({
        phone_number: phoneNumber,
        opted_in: true,
        opted_in_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        regions: [defaultRegion],
        categories: defaultCategories,
        consent_timestamp: new Date().toISOString(),
        consent_method: 'whatsapp_optin',
        double_opt_in_confirmed: true
      });
    
    // Send community-focused welcome message
    const welcomeMessage = `🌍 Welcome to YOUR community signal service!

This is where South Africans share local opportunities, events, and news from your region.

📱 Submit your moments by messaging here
🌐 See all community posts: moments.unamifoundation.org/moments
📍 Choose regions: REGIONS
❓ Commands: HELP`;
    
    await sendMessage(phoneNumber, welcomeMessage);
    
    console.log(`User ${phoneNumber} opted in with community-focused welcome`);
  } catch (error) {
    console.error('Opt-in error:', error);
  }
}

async function triggerN8nNGOWorkflow(data) {
  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      console.log('N8N webhook URL not configured, skipping NGO workflow trigger');
      return;
    }

    const response = await axios.post(`${n8nUrl}/webhook/ngo-message-webhook`, data, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_WEBHOOK_SECRET || 'default'
      }
    });

    console.log('N8N NGO workflow triggered successfully');
  } catch (error) {
    console.error('N8N NGO workflow trigger failed:', error.message);
    // Don't throw - n8n failure shouldn't break message processing
  }
}

function isCasualMessage(message) {
  const casualPatterns = [
    'hi', 'hey', 'hello', 'hola', 'howzit', 'sawubona',
    'whatsapp', 'anyone', 'anybody', 'is anyone there',
    'is anybody around', 'chat', 'talk', 'speak'
  ];
  return casualPatterns.some(pattern => message.includes(pattern));
}

async function handleHelp(phoneNumber) {
  const helpMessage = `📡 Community Signal Service Commands:

🔄 START - Subscribe to community signals
🛑 STOP - Unsubscribe from signals
❓ HELP - Show this help menu
📍 REGIONS - Choose your areas
📝 REQUEST AUTHORITY - Apply for broadcast authority

🌍 Available Regions:
KZN, WC, GP, EC, FS, LP, MP, NC, NW

💬 Submit moments by messaging here
🌐 Full community feed: moments.unamifoundation.org/moments

This is YOUR community sharing platform.`;
  
  await sendMessage(phoneNumber, helpMessage);
}

async function handleAuthorityRequest(phoneNumber) {
  const { data: existing } = await supabase
    .from('authority_profiles')
    .select('*')
    .eq('user_identifier', phoneNumber)
    .eq('status', 'active')
    .single();
  
  if (existing) {
    await sendMessage(phoneNumber, `You already have authority as ${existing.role_label}.`);
    return;
  }
  
  const { data: request } = await supabase
    .from('authority_requests')
    .insert({ phone_number: phoneNumber })
    .select()
    .single();
  
  await supabase
    .from('authority_request_state')
    .upsert({
      phone_number: phoneNumber,
      request_id: request.id,
      current_step: 'awaiting_role',
      updated_at: new Date().toISOString()
    });
  
  await sendMessage(phoneNumber, `📝 Authority Request

What role are you requesting?

Options:
🏫 School Principal
👥 Community Leader
🏛️ Government Official
🏥 NGO Coordinator
📅 Event Organizer

Reply with the role name.`);
}

async function checkAuthorityRequestState(phoneNumber) {
  const { data } = await supabase
    .from('authority_request_state')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  
  return data;
}

async function handleAuthorityRequestStep(phoneNumber, content, state) {
  const roleMap = {
    'school principal': 'school_principal',
    'community leader': 'community_leader',
    'government official': 'government_official',
    'ngo coordinator': 'ngo_coordinator',
    'event organizer': 'event_organizer'
  };
  
  const regionMap = {
    'kzn': 'KZN', 'wc': 'WC', 'gp': 'GP', 'ec': 'EC', 'fs': 'FS',
    'lp': 'LP', 'mp': 'MP', 'nc': 'NC', 'nw': 'NW'
  };
  
  if (state.current_step === 'awaiting_role') {
    const role = content.toLowerCase().trim();
    const presetKey = roleMap[role];
    
    if (!presetKey) {
      await sendMessage(phoneNumber, '❌ Invalid role. Please choose from: School Principal, Community Leader, Government Official, NGO Coordinator, Event Organizer');
      return;
    }
    
    await supabase
      .from('authority_requests')
      .update({ role_requested: presetKey })
      .eq('id', state.request_id);
    
    await supabase
      .from('authority_request_state')
      .update({ current_step: 'awaiting_institution', updated_at: new Date().toISOString() })
      .eq('phone_number', phoneNumber);
    
    await sendMessage(phoneNumber, `✅ Role: ${content}

What is your institution/organization name?`);
  }
  else if (state.current_step === 'awaiting_institution') {
    await supabase
      .from('authority_requests')
      .update({ institution: content })
      .eq('id', state.request_id);
    
    await supabase
      .from('authority_request_state')
      .update({ current_step: 'awaiting_region', updated_at: new Date().toISOString() })
      .eq('phone_number', phoneNumber);
    
    await sendMessage(phoneNumber, `✅ Institution: ${content}

What region? (KZN, WC, GP, EC, FS, LP, MP, NC, NW)`);
  }
  else if (state.current_step === 'awaiting_region') {
    const region = regionMap[content.toLowerCase().trim()];
    
    if (!region) {
      await sendMessage(phoneNumber, '❌ Invalid region. Please choose: KZN, WC, GP, EC, FS, LP, MP, NC, NW');
      return;
    }
    
    await supabase
      .from('authority_requests')
      .update({ region, status: 'pending' })
      .eq('id', state.request_id);
    
    await supabase
      .from('authority_request_state')
      .delete()
      .eq('phone_number', phoneNumber);
    
    await sendMessage(phoneNumber, `✅ Request Submitted!

Your authority request has been sent to our admin team for review.

You'll receive a notification once it's been reviewed.

Thank you!`);
  }
}

async function handleRegions(phoneNumber) {
  const regionsMessage = `📍 Choose your regions (reply with region codes):

🏖️ KZN - KwaZulu-Natal
🍷 WC - Western Cape
🏙️ GP - Gauteng
🌊 EC - Eastern Cape
🌾 FS - Free State
🌳 LP - Limpopo
⛰️ MP - Mpumalanga
🏜️ NC - Northern Cape
💎 NW - North West

Reply with codes like: KZN WC GP`;
  
  await sendMessage(phoneNumber, regionsMessage);
}

function isRegionSelection(message) {
  const validRegions = ['kzn', 'wc', 'gp', 'ec', 'fs', 'lp', 'mp', 'nc', 'nw'];
  const words = message.split(/\s+/);
  
  // Check if message contains only valid region codes
  return words.length > 0 && words.every(word => validRegions.includes(word.toLowerCase()));
}

async function handleRegionSelection(phoneNumber, regionString) {
  try {
    const regionCodes = regionString.toUpperCase().split(/\s+/);
    const regionMap = {
      'KZN': 'KwaZulu-Natal',
      'WC': 'Western Cape', 
      'GP': 'Gauteng',
      'EC': 'Eastern Cape',
      'FS': 'Free State',
      'LP': 'Limpopo',
      'MP': 'Mpumalanga',
      'NC': 'Northern Cape',
      'NW': 'North West'
    };
    
    const selectedRegions = regionCodes.map(code => regionMap[code]).filter(Boolean);
    
    if (selectedRegions.length === 0) {
      await sendMessage(phoneNumber, '❌ Invalid region codes. Reply REGIONS to see valid options.');
      return;
    }
    
    // Update user's region preferences
    await supabase
      .from('subscriptions')
      .upsert({
        phone_number: phoneNumber,
        regions: selectedRegions,
        last_activity: new Date().toISOString(),
        opted_in: true // Ensure they're opted in when selecting regions
      });
    
    const confirmMessage = `✅ Regions updated!

You'll now receive community signals from:
${selectedRegions.map(region => `📍 ${region}`).join('\n')}

💬 Submit moments by messaging here
🌐 Browse all: moments.unamifoundation.org/moments`;
    
    await sendMessage(phoneNumber, confirmMessage);
    
    console.log(`User ${phoneNumber} updated regions to: ${selectedRegions.join(', ')}`);
  } catch (error) {
    console.error('Region selection error:', error);
    await sendMessage(phoneNumber, '❌ Error updating regions. Please try again or contact support.');
  }
}

async function handleCasualChat(phoneNumber) {
  const chatMessage = `👋 Hi! This is your community signal service.

South Africans share local opportunities and events here.

📱 Submit moments by messaging
🌐 Browse all: moments.unamifoundation.org/moments
📍 Commands: HELP, REGIONS, STOP`;
  
  await sendMessage(phoneNumber, chatMessage);
}

async function sendMessage(phoneNumber, message) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Message sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Send message error:', error.response?.data || error.message);
  }
}