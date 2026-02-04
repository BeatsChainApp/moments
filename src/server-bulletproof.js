import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabase.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// HEALTH CHECK FIRST - before any other middleware
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Unami Foundation Moments API',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Security headers - allow CDN for Supabase
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com; " +
    "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com; " +
    "connect-src 'self' https://bxmdzcxejcxbinghtyfw.supabase.co https://www.google-analytics.com https://analytics.google.com; " +
    "img-src 'self' data: https:; " +
    "style-src 'self' 'unsafe-inline';"
  );
  next();
});

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer for file uploads
import multer from 'multer';
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Static files
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Landing page
app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../index.html'));
  } catch (error) {
    res.status(200).send('<h1>Unami Foundation Moments</h1><p>WhatsApp Community Platform</p>');
  }
});

// Admin dashboard
app.get('/admin', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../public/admin-dashboard.html'));
  } catch (error) {
    res.status(404).json({ error: 'Admin dashboard not found' });
  }
});

app.get('/admin-dashboard.html', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../public/admin-dashboard.html'));
  } catch (error) {
    res.status(404).json({ error: 'Admin dashboard not found' });
  }
});

// Moments route
app.get('/moments', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../public/moments/index.html'));
  } catch (error) {
    res.status(404).json({ error: 'Moments page not found' });
  }
});
app.get('/login', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../public/login.html'));
  } catch (error) {
    res.status(404).json({ error: 'Login page not found' });
  }
});

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.status(403).json({ error: 'Forbidden' });
  }
});

// Webhook handler - COMPLETE implementation with all commands
app.post('/webhook', async (req, res) => {
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
});

// Download and store WhatsApp media
async function downloadAndStoreMedia(mediaId, messageType) {
  try {
    // Get media URL from WhatsApp
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
        }
      }
    );
    
    if (!mediaResponse.ok) {
      throw new Error(`Failed to get media URL: ${mediaResponse.status}`);
    }
    
    const mediaData = await mediaResponse.json();
    const mediaUrl = mediaData.url;
    
    // Download media file
    const fileResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
      }
    });
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to download media: ${fileResponse.status}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    
    // Determine file extension and bucket
    let fileExt = 'bin';
    let bucket = 'documents';
    const contentType = fileResponse.headers.get('content-type') || '';
    
    if (messageType === 'image' || contentType.startsWith('image/')) {
      fileExt = contentType.split('/')[1] || 'jpg';
      bucket = 'images';
    } else if (messageType === 'video' || contentType.startsWith('video/')) {
      fileExt = contentType.split('/')[1] || 'mp4';
      bucket = 'videos';
    } else if (messageType === 'audio' || contentType.startsWith('audio/')) {
      fileExt = contentType.split('/')[1] || 'mp3';
      bucket = 'audio';
    }
    
    // Generate unique filename
    const fileName = `community/${Date.now()}_${mediaId}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: contentType || 'application/octet-stream'
      });
    
    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('Media download/storage error:', error);
    return null;
  }
}

async function processMessage(message, value) {
  try {
    const fromNumber = message.from;
    const messageType = message.type;
    let content = '';
    let mediaId = null;
    let mediaUrls = [];

    console.log(`Processing message from ${fromNumber}, type: ${messageType}`);

    // DEDUPLICATION: Check if message already processed
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id, processed')
      .eq('whatsapp_id', message.id)
      .single();

    if (existingMessage) {
      console.log(`⏭️ Skipping duplicate message: ${message.id} (already processed: ${existingMessage.processed})`);
      return;
    }

    // Extract content based on message type and decode HTML entities
    switch (messageType) {
      case 'text':
        content = message.text.body.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        break;
      case 'image':
        content = (message.image.caption || '[Image]').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        mediaId = message.image.id;
        break;
      case 'audio':
        content = '[Audio message]';
        mediaId = message.audio.id;
        break;
      case 'video':
        content = (message.video.caption || '[Video]').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        mediaId = message.video.id;
        break;
      case 'document':
        content = message.document.filename || '[Document]';
        mediaId = message.document.id;
        break;
      default:
        content = `[${messageType} message]`;
    }

    // Download and store media if present
    if (mediaId) {
      try {
        console.log(`📥 Attempting to download media: ${mediaId}`);
        const mediaUrl = await downloadAndStoreMedia(mediaId, messageType);
        if (mediaUrl) {
          mediaUrls = [mediaUrl];
          console.log(`✅ Media stored: ${mediaUrl}`);
        } else {
          console.log(`⚠️ Media download failed, storing media_id for later processing`);
        }
      } catch (mediaError) {
        console.error('Media download error:', mediaError);
        console.log(`⚠️ Will store media_id for manual processing: ${mediaId}`);
      }
    }

    console.log(`Message content: "${content}"`);    
    console.log(`Media ID: ${mediaId || 'none'}`);
    console.log(`Media URLs: ${JSON.stringify(mediaUrls)}`);

    // Store message in database FIRST
    const { data: messageRecord, error: insertError } = await supabase
      .from('messages')
      .insert({
        whatsapp_id: message.id,
        from_number: fromNumber,
        message_type: messageType,
        content,
        media_url: mediaUrls[0] || null,
        media_id: mediaId,
        processed: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Message insert error:', insertError);
      return;
    }
    
    console.log(`✅ Message stored with ID: ${messageRecord.id}`);
    if (mediaUrls.length > 0) {
      console.log(`📎 Media attached: ${mediaUrls[0]}`);
    }

    // Handle commands
    const command = content.toLowerCase().trim();
    console.log(`Command detected: "${command}"`);
    
    // Check if message starts with FEEDBACK
    if (command.startsWith('feedback')) {
      console.log('Processing FEEDBACK command');
      await handleFeedback(fromNumber, content, messageRecord.id);
      await supabase.from('messages').update({ processed: true }).eq('id', messageRecord.id);
      return;
    }
    
    if (command === 'stop' || command === 'unsubscribe') {
      console.log('Processing STOP command');
      await handleOptOut(fromNumber);
      await supabase.from('messages').update({ processed: true }).eq('id', messageRecord.id);
      return;
    }
    
    if (command === 'start' || command === 'join') {
      console.log('Processing START command');
      await handleOptIn(fromNumber);
      await supabase.from('messages').update({ processed: true }).eq('id', messageRecord.id);
      return;
    }
    
    if (command === 'help') {
      console.log('Processing HELP command');
      await handleHelp(fromNumber);
      await supabase.from('messages').update({ processed: true }).eq('id', messageRecord.id);
      return;
    }
    
    if (command === 'regions') {
      console.log('Processing REGIONS command');
      await handleRegions(fromNumber);
      await supabase.from('messages').update({ processed: true }).eq('id', messageRecord.id);
      return;
    }
    
    // Handle region selection (e.g., "KZN WC GP")
    if (isRegionSelection(command)) {
      console.log('Processing region selection');
      await handleRegionSelection(fromNumber, command);
      await supabase.from('messages').update({ processed: true }).eq('id', messageRecord.id);
      return;
    }
    
    // Handle casual chat attempts
    if (isCasualMessage(command)) {
      console.log('Processing casual chat');
      await handleCasualChat(fromNumber);
      await supabase.from('messages').update({ processed: true }).eq('id', messageRecord.id);
      return;
    }

    // Accept ALL non-command messages as potential moments
    if (!isCommand(content) && !isCasualMessage(command)) {
      console.log('Message will be processed by soft moderation system');
      // Soft moderation will handle: text, images, videos, audio, documents
      // All content types are valuable for community sharing
    }

    function isCommand(text) {
      const commands = ['start', 'stop', 'help', 'regions', 'join', 'unsubscribe', 'feedback'];
      return commands.includes(text.toLowerCase().trim()) || text.toLowerCase().trim().startsWith('feedback');
    }
    
    function generateTitle(text) {
      const words = text.split(' ').slice(0, 8);
      return words.join(' ') + (text.split(' ').length > 8 ? '...' : '');
    }

    // Call Supabase MCP function for message analysis
    try {
      const { data: mcpResult, error: mcpError } = await supabase.rpc('mcp_advisory', {
        message_content: content,
        message_language: 'eng',
        message_type: messageType,
        from_number: fromNumber,
        message_timestamp: new Date().toISOString()
      });

      if (mcpError) {
        console.error('MCP analysis error:', mcpError);
      } else if (mcpResult) {
        console.log(`MCP result:`, mcpResult);
        
        // Send auto-response confirmation
        const status = mcpResult.moment_status || 'pending';
        const momentId = mcpResult.moment_id;
        
        let responseMessage = `✅ Thank you! Your moment has been received.\n\n`;
        
        if (status === 'approved' || status === 'broadcasted') {
          responseMessage += `🎉 Status: Auto-approved\n⏱️ Your moment will be shared with the community shortly.`;
        } else if (status === 'pending' || status === 'draft') {
          responseMessage += `📋 Status: Under review\n⏱️ Our team will review and approve your moment soon.`;
        } else if (status === 'flagged') {
          responseMessage += `⚠️ Status: Needs review\n👁️ Our moderation team will review your content.`;
        }
        
        responseMessage += `\n\n🌐 View all moments: moments.unamifoundation.org/moments`;
        
        await sendMessage(fromNumber, responseMessage);
        console.log(`✅ Auto-response sent to ${fromNumber}`);
      }
    } catch (mcpError) {
      console.error('MCP analysis error:', mcpError);
      
      // Send generic confirmation even if MCP fails
      try {
        await sendMessage(fromNumber, 
          `✅ Thank you! Your moment has been received and will be reviewed by our team.\n\n` +
          `🌐 View community moments: moments.unamifoundation.org/moments`
        );
      } catch (sendError) {
        console.error('Failed to send confirmation:', sendError);
      }
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
    await supabase
      .from('subscriptions')
      .upsert({
        phone_number: phoneNumber,
        opted_in: false,
        opted_out_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      });
    
    console.log(`User ${phoneNumber} opted out`);
  } catch (error) {
    console.error('Opt-out error:', error);
  }
}

async function handleOptIn(phoneNumber) {
  try {
    const defaultRegion = 'National';
    const defaultCategories = ['Education', 'Safety', 'Culture', 'Opportunity', 'Events', 'Health', 'Technology'];
    
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
    
    const welcomeMessage = `🌍 Welcome to YOUR community signal service!

This is where South Africans share local opportunities, events, and news from your region.

📱 Submit your moments by messaging here
🌐 See all community posts: moments.unamifoundation.org/moments
📍 Choose regions: REGIONS
❓ Commands: HELP`;
    
    await sendMessage(phoneNumber, welcomeMessage);
    
    console.log(`User ${phoneNumber} opted in`);
  } catch (error) {
    console.error('Opt-in error:', error);
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

🌍 Available Regions:
KZN, WC, GP, EC, FS, LP, MP, NC, NW

💬 Submit moments by messaging here
🌐 Full community feed: moments.unamifoundation.org/moments

This is YOUR community sharing platform.`;
  
  await sendMessage(phoneNumber, helpMessage);
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
    
    await supabase
      .from('subscriptions')
      .upsert({
        phone_number: phoneNumber,
        regions: selectedRegions,
        last_activity: new Date().toISOString(),
        opted_in: true
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

async function handleFeedback(phoneNumber, content, messageId) {
  try {
    // Extract feedback text (everything after "FEEDBACK")
    const feedbackText = content.replace(/^feedback\s*/i, '').trim();
    
    if (!feedbackText) {
      await sendMessage(phoneNumber, '📝 To send feedback, reply:\nFEEDBACK Your message here');
      return;
    }
    
    // Store feedback in database
    const { error } = await supabase
      .from('feedback')
      .insert({
        phone_number: phoneNumber,
        message_id: messageId,
        feedback_text: feedbackText,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Feedback storage error:', error);
    }
    
    // Silent acknowledgment - no reply to avoid conversation
    console.log(`✅ Feedback captured from ${phoneNumber}`);
    
  } catch (error) {
    console.error('Feedback handling error:', error);
  }
}

async function sendMessage(phoneNumber, message) {
  try {
    console.log(`Attempting to send message to ${phoneNumber}:`, message);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: { body: message }
        })
      }
    );
    
    if (response.ok) {
      console.log(`✅ Message sent to ${phoneNumber}`);
      return true;
    } else {
      const responseText = await response.text();
      console.error('❌ Send message error:', responseText);
      return false;
    }
  } catch (error) {
    console.error('❌ Send message error:', error.message);
    return false;
  }
}

// Admin login endpoint - secure Supabase function only
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Forward to Supabase admin API
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/admin-api`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    res.status(response.status).json(result);
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.substring(7);
  if (!token || token.length < 10) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = { token };
  next();
}

// Proxy ALL /admin/* requests to Supabase admin-api edge function
// Proxy ALL /admin/* requests to Supabase admin-api edge function (EXCEPT login)
app.use('/admin', async (req, res, next) => {
  // Skip authentication for login endpoint
  if (req.path === '/login' && req.method === 'POST') {
    return next();
  }

  // Authenticate all other admin requests
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://bxmdzcxejcxbinghtyfw.supabase.co';
    const proxyUrl = `${supabaseUrl}/functions/v1/admin-api${req.path}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY || '',
      'Authorization': authHeader
    };

    const options = {
      method: req.method,
      headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const queryString = new URL(req.url, 'http://localhost').search;
    const fullUrl = proxyUrl + queryString;

    const response = await fetch(fullUrl, options);
    const contentType = response.headers.get('content-type');
    
    // Handle JSON responses
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }
    
    // Handle text responses
    const text = await response.text();
    return res.status(response.status).send(text);
    
  } catch (error) {
    console.error('Admin proxy error:', error.message);
    return res.status(500).json({ error: 'Admin API unavailable', details: error.message });
  }
});

app.use((error, req, res, next) => {
  console.error('Server error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;