import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireRole, getUserFromRequest } from './auth.js';
import { scheduleNextBroadcasts } from './broadcast.js';
import { composeMomentMessage } from './services/broadcast-composer.js';

const router = express.Router();

// Protect all admin routes: require at least moderator role
router.use(requireRole(['moderator', 'content_admin', 'superadmin']));

// Simple sanitizers
const sanitizeString = (s, max=2000) => {
  if (s === null || s === undefined) return s;
  let t = String(s).trim();
  if (t.length > max) t = t.slice(0, max);
  return t;
};

const sanitizeArrayOfStrings = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(a => sanitizeString(a, 500)).filter(Boolean);
};

// Get all moments with pagination and filters
router.get('/moments', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, region, category, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('moments')
      .select(`
        *,
        sponsors(display_name),
        broadcasts(recipient_count, success_count, failure_count, status)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (region) query = query.eq('region', region);
    if (category) query = query.eq('category', category);
    if (search) query = query.textSearch('title', search, { type: 'websearch' });

    const { data, error } = await query;
    if (error) throw error;

    res.json({ moments: data || [], page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new moment - preserve content formatting
router.post('/moments', async (req, res) => {
  try {
    const {
      title,
      content,
      region,
      category,
      language = 'eng',
      sponsor_id,
      is_sponsored = false,
      pwa_link,
      media_urls = [],
      scheduled_at,
      status = 'draft',
      publish_to_pwa = true,  // Default: publish to PWA
      publish_to_whatsapp = false,  // Default: admin control for WhatsApp
      created_by = 'admin',
      bulk_operation_id
    } = req.body;

    if (!title || !content || !region || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Preserve content formatting - don't strip newlines or whitespace
    const preservedContent = content.toString();
    
    const finalStatus = status || (scheduled_at ? 'scheduled' : 'draft');
    const broadcastedAt = finalStatus === 'broadcasted' ? new Date().toISOString() : null;
    
    let normalizedMedia = [];
    if (Array.isArray(media_urls)) {
      normalizedMedia = media_urls.map(u => (u || '').toString().trim()).filter(Boolean);
    } else if (typeof media_urls === 'string') {
      normalizedMedia = media_urls.split(',').map(u => u.trim()).filter(Boolean);
    }

    const user = await getUserFromRequest(req);

    const { data, error } = await supabase
      .from('moments')
      .insert({
        title,
        content: preservedContent, // Store with original formatting
        region,
        category,
        language,
        sponsor_id,
        is_sponsored,
        pwa_link,
        media_urls: normalizedMedia,
        scheduled_at,
        status: finalStatus,
        broadcasted_at: broadcastedAt,
        content_source: 'admin',
        publish_to_pwa,  // Enable PWA distribution
        publish_to_whatsapp,  // Optional WhatsApp distribution
        created_by,
        bulk_operation_id
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('admin_activity_logs').insert({
      admin_id: user?.id,
      admin_phone: user?.phone || 'unknown',
      action: 'create_moment',
      entity_type: 'moment',
      entity_id: data.id,
      details: { title, region, category, bulk_operation_id }
    });

    res.json({ moment: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update moment
router.put('/moments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating broadcasted moments
    const { data: existing } = await supabase
      .from('moments')
      .select('status')
      .eq('id', id)
      .single();

    if (existing?.status === 'broadcasted') {
      return res.status(400).json({ error: 'Cannot update broadcasted moments' });
    }

    const user = await getUserFromRequest(req);

    const { data, error } = await supabase
      .from('moments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('admin_activity_logs').insert({
      admin_id: user?.id,
      admin_phone: user?.phone || 'unknown',
      action: 'edit_moment',
      entity_type: 'moment',
      entity_id: id,
      details: { updates }
    });

    res.json({ moment: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete moment
router.delete('/moments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);

    const { error } = await supabase
      .from('moments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log activity
    await supabase.from('admin_activity_logs').insert({
      admin_id: user?.id,
      admin_phone: user?.phone || 'unknown',
      action: 'delete_moment',
      entity_type: 'moment',
      entity_id: id,
      details: {}
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compose moment message (preview before broadcast)
router.get('/moments/:id/compose', async (req, res) => {
  try {
    const { id } = req.params;
    const message = await composeMomentMessage(id);
    
    if (!message) {
      return res.status(500).json({ error: 'Failed to compose message - no content returned' });
    }
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('Compose error:', error);
    res.status(500).json({ error: error.message || 'Failed to compose message' });
  }
});

// Get moment by slug (public endpoint for PWA)
router.get('/moments/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const { data: moment, error } = await supabase
      .from('moments')
      .select(`
        *,
        creator:created_by(role, organization),
        sponsor:sponsor_id(name, display_name, website)
      `)
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    
    const { buildAttributionBlock } = await import('./services/attribution.js');
    const attribution = buildAttributionBlock(moment, moment.creator, moment.sponsor);
    
    res.json({
      ...moment,
      attribution_html: attribution.replace(/\n/g, '<br>')
    });
  } catch (error) {
    res.status(404).json({ error: 'Moment not found' });
  }
});

// Broadcast moment immediately - use batch processing (no N8N dependency)
router.post('/moments/:id/broadcast', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);

    const { data: moment, error: updateError } = await supabase
      .from('moments')
      .update({ 
        publish_to_whatsapp: true,
        status: 'broadcasted',
        broadcasted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!moment.slug) {
      const slug = generateSlug(moment.title, moment.id);
      await supabase.from('moments').update({ slug }).eq('id', id);
      moment.slug = slug;
    }

    // Get subscribers
    let query = supabase.from('subscriptions').select('phone_number').eq('opted_in', true);
    if (moment.region && moment.region !== 'National') {
      query = query.contains('regions', [moment.region]);
    }
    const { data: subscribers } = await query;
    const recipientCount = subscribers?.length || 0;

    // Compose message
    const message = await composeMomentMessage(id);
    const mediaUrls = moment.media_urls || [];

    // Create broadcast record
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert({
        moment_id: id,
        recipient_count: recipientCount,
        status: 'processing'
      })
      .select()
      .single();

    if (broadcastError) throw broadcastError;

    // Create batches (50 per batch)
    const batchSize = 50;
    const batchRecords = [];
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batchRecipients = subscribers.slice(i, i + batchSize).map(s => s.phone_number);
      batchRecords.push({
        broadcast_id: broadcast.id,
        batch_number: Math.floor(i / batchSize) + 1,
        recipients: batchRecipients,
        status: 'pending'
      });
    }

    if (batchRecords.length > 0) {
      const { data: batches } = await supabase.from('broadcast_batches').insert(batchRecords).select();
      await supabase.from('broadcasts').update({ batches_total: batchRecords.length }).eq('id', broadcast.id);

      // Trigger batch processor for each batch
      const processorUrl = `${process.env.SUPABASE_URL}/functions/v1/broadcast-batch-processor`;
      for (const batch of batches) {
        fetch(processorUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ batch_id: batch.id, message, mediaUrls })
        }).catch(err => console.error('Batch trigger failed:', err));
      }
    }

    await supabase.from('admin_activity_logs').insert({
      admin_id: user?.id,
      admin_phone: user?.phone || 'unknown',
      action: 'broadcast',
      entity_type: 'moment',
      entity_id: id,
      details: { broadcast_id: broadcast.id, batches: batchRecords.length }
    });

    res.json({
      success: true,
      moment_id: id,
      broadcast_id: broadcast.id,
      recipients: recipientCount,
      batches: batchRecords.length,
      message: `Broadcast started with ${batchRecords.length} batches for ${recipientCount} recipients`
    });
  } catch (error) {
    console.error('Broadcast endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sponsors
router.get('/sponsors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;

    res.json({ sponsors: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sponsor analytics
router.get('/sponsors/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Refresh analytics
    await supabase.rpc('refresh_sponsor_analytics');
    
    const { data, error } = await supabase
      .from('sponsor_analytics')
      .select('*')
      .eq('sponsor_id', id)
      .single();
    
    if (error) throw error;
    res.json({ analytics: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all sponsor analytics
router.get('/sponsors-analytics', async (req, res) => {
  try {
    // Refresh analytics
    await supabase.rpc('refresh_sponsor_analytics');
    
    const { data, error } = await supabase
      .from('sponsor_analytics')
      .select('*')
      .order('total_moments', { ascending: false });
    
    if (error) throw error;
    res.json({ analytics: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single sponsor
router.get('/sponsors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    res.json({ sponsor: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create sponsor
router.post('/sponsors', async (req, res) => {
  try {
    const { name, display_name, contact_email } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ error: 'Name and display name required' });
    }

    const user = await getUserFromRequest(req);

    const { data, error } = await supabase
      .from('sponsors')
      .insert({ name, display_name, contact_email })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('admin_activity_logs').insert({
      admin_id: user?.id,
      admin_phone: user?.phone || 'unknown',
      action: 'create_sponsor',
      entity_type: 'sponsor',
      entity_id: data.id,
      details: { name, display_name }
    });

    res.json({ sponsor: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin activity logs
router.get('/activity-logs', async (req, res) => {
  try {
    const { limit = 50, action, entity_type } = req.query;
    
    let query = supabase
      .from('admin_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (action) query = query.eq('action', action);
    if (entity_type) query = query.eq('entity_type', entity_type);
    
    const { data, error } = await query;
    if (error) throw error;
    
    res.json({ logs: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk operations
router.post('/moments/bulk', async (req, res) => {
  try {
    const { operation, moment_ids, updates } = req.body;
    const user = await getUserFromRequest(req);
    const bulk_operation_id = crypto.randomUUID();
    
    if (!operation || !moment_ids || !Array.isArray(moment_ids)) {
      return res.status(400).json({ error: 'Invalid bulk operation request' });
    }
    
    let results = [];
    
    if (operation === 'update') {
      const { data, error } = await supabase
        .from('moments')
        .update({ ...updates, bulk_operation_id })
        .in('id', moment_ids)
        .select();
      
      if (error) throw error;
      results = data;
    } else if (operation === 'delete') {
      const { error } = await supabase
        .from('moments')
        .delete()
        .in('id', moment_ids);
      
      if (error) throw error;
      results = moment_ids;
    } else if (operation === 'broadcast') {
      for (const id of moment_ids) {
        await supabase.from('moments').update({ 
          publish_to_whatsapp: true, 
          status: 'broadcasted',
          broadcasted_at: new Date().toISOString(),
          bulk_operation_id
        }).eq('id', id);
      }
      results = moment_ids;
    }
    
    // Log bulk operation
    await supabase.from('admin_activity_logs').insert({
      admin_id: user?.id,
      admin_phone: user?.phone || 'unknown',
      action: `bulk_${operation}`,
      entity_type: 'moment',
      entity_id: bulk_operation_id,
      details: { operation, count: moment_ids.length, moment_ids }
    });
    
    res.json({ success: true, operation, count: results.length, bulk_operation_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get broadcast analytics - use intent system metrics
router.get('/analytics', async (req, res) => {
  try {
    // Get moments data
    const { data: moments } = await supabase
      .from('moments')
      .select('status, content_source, created_at')
      .not('status', 'eq', 'draft');

    // Get intent-based broadcast data (current system)
    const { data: intents } = await supabase
      .from('moment_intents')
      .select('channel, status, created_at, payload')
      .eq('channel', 'whatsapp');

    // Get subscriber data
    const { data: subscribers } = await supabase
      .from('subscriptions')
      .select('opted_in, last_activity');

    // Calculate moment stats
    const totalMoments = moments?.length || 0;
    const communityMoments = moments?.filter(m => m.content_source === 'community').length || 0;
    const adminMoments = moments?.filter(m => m.content_source === 'admin').length || 0;
    const campaignMoments = moments?.filter(m => m.content_source === 'campaign').length || 0;
    const broadcastedMoments = moments?.filter(m => m.status === 'broadcasted').length || 0;

    // Calculate intent-based broadcast stats
    const totalIntents = intents?.length || 0;
    const sentIntents = intents?.filter(i => i.status === 'sent').length || 0;
    const pendingIntents = intents?.filter(i => i.status === 'pending').length || 0;
    const failedIntents = intents?.filter(i => i.status === 'failed').length || 0;

    // Calculate subscriber stats
    const totalSubscribers = subscribers?.length || 0;
    const activeSubscribers = subscribers?.filter(s => s.opted_in).length || 0;
    const recentActivity = subscribers?.filter(s => 
      s.last_activity && new Date(s.last_activity) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length || 0;

    // Calculate success rate
    const successRate = totalIntents > 0 ? ((sentIntents / totalIntents) * 100).toFixed(1) : '0';

    res.json({
      // Moment metrics
      totalMoments,
      broadcastedMoments,
      communityMoments,
      adminMoments,
      campaignMoments,
      
      // Broadcast metrics (intent-based)
      totalBroadcasts: totalIntents,
      successfulBroadcasts: sentIntents,
      pendingBroadcasts: pendingIntents,
      failedBroadcasts: failedIntents,
      successRate,
      
      // Subscriber metrics
      totalSubscribers,
      activeSubscribers,
      recentActivity,
      
      // System health
      systemStatus: {
        intentSystem: pendingIntents < 10 ? 'healthy' : 'backlog',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get flagged content for moderation
router.get('/moderation', async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    
    let query = supabase
      .from('messages')
      .select(`
        *,
        advisories(*),
        flags(*)
      `)
      .eq('processed', true)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;
    if (error) throw error;

    // Filter messages based on criteria
    let flaggedMessages = data || [];
    
    if (filter === 'flagged') {
      flaggedMessages = flaggedMessages.filter(msg => 
        msg.advisories?.some(adv => adv.confidence > 0.7) || msg.flags?.length > 0
      );
    } else if (filter === 'escalated') {
      flaggedMessages = flaggedMessages.filter(msg => 
        msg.advisories?.some(adv => adv.escalation_suggested)
      );
    }

    res.json({ flaggedMessages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sponsor
router.put('/sponsors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('sponsors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ sponsor: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete sponsor
router.delete('/sponsors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('sponsors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get broadcasts
router.get('/broadcasts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('broadcasts')
      .select(`
        *,
        moments(title, region, category)
      `)
      .order('broadcast_started_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ broadcasts: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscribers with stats
router.get('/subscribers', async (req, res) => {
  try {
    const { filter = 'all', limit = 50 } = req.query;
    
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        'whatsapp_command' as consent_method,
        opted_in_at as consent_timestamp
      `)
      .order('last_activity', { ascending: false })
      .limit(limit);

    if (filter === 'active') query = query.eq('opted_in', true);
    if (filter === 'inactive') query = query.eq('opted_in', false);

    const { data, error } = await query;
    if (error) {
      console.error('Subscribers query error:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} subscribers with filter: ${filter}`);

    // Calculate stats
    const total = data?.length || 0;
    const active = data?.filter(s => s.opted_in).length || 0;
    const inactive = total - active;
    const commands_used = data?.filter(s => 
      s.last_activity && new Date(s.last_activity) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length || 0;

    res.json({ 
      subscribers: data || [],
      stats: {
        total,
        active,
        inactive,
        commands_used
      }
    });
  } catch (error) {
    console.error('Subscribers endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get system settings
router.get('/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key');

    if (error) throw error;
    res.json({ settings: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update system setting
router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const { data, error } = await supabase
      .from('system_settings')
      .update({ 
        setting_value: value, 
        updated_by: 'admin', 
        updated_at: new Date().toISOString() 
      })
      .eq('setting_key', key)
      .select()
      .single();

    if (error) throw error;
    res.json({ setting: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process scheduled broadcasts (called by cron or manually)
router.post('/process-scheduled', async (req, res) => {
  try {
    await scheduleNextBroadcasts();
    res.json({ success: true, message: 'Scheduled broadcasts processed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// N8N webhook for sponsored content triggers
router.post('/n8n-trigger', async (req, res) => {
  try {
    const { trigger_type, moment_data, schedule_at } = req.body;
    
    if (trigger_type === 'sponsored_moment') {
      const { data: moment, error } = await supabase
        .from('moments')
        .insert({
          ...moment_data,
          content_source: 'admin',
          is_sponsored: true,
          status: schedule_at ? 'scheduled' : 'draft',
          scheduled_at: schedule_at,
          created_by: 'n8n_automation'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Auto-broadcast if not scheduled
      if (!schedule_at) {
        const { broadcastMoment } = await import('./broadcast.js');
        await broadcastMoment(moment.id);
      }
      
      res.json({ success: true, moment_id: moment.id });
    } else {
      res.status(400).json({ error: 'Unknown trigger type' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed test moments (development only)
router.post('/seed-test-moments', async (req, res) => {
  try {
    const testMoments = [
      {
        title: "Community Garden Project Launch",
        content: "New community garden opens in Soweto this Saturday. Free seedlings and training provided. Join us at 9 AM for the opening ceremony.",
        region: "GP",
        category: "Opportunity",
        status: "broadcasted",
        broadcasted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: "Digital Skills Workshop",
        content: "Free computer literacy classes starting next week in Durban. Learn basic computer skills, internet safety, and online job applications.",
        region: "KZN", 
        category: "Education",
        status: "broadcasted",
        broadcasted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: "Health Screening Drive",
        content: "Free health screenings available at Cape Town Community Center. Blood pressure, diabetes, and vision tests. No appointment needed.",
        region: "WC",
        category: "Health", 
        status: "broadcasted",
        broadcasted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: "Youth Soccer Tournament",
        content: "Annual youth soccer tournament registration now open. Ages 12-18 welcome. Prizes for winning teams. Register at local community center.",
        region: "EC",
        category: "Events",
        status: "broadcasted", 
        broadcasted_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: "Small Business Support Program", 
        content: "Government-backed small business loans and mentorship program. Applications open until month end. Free business plan assistance available.",
        region: "FS",
        category: "Opportunity",
        status: "broadcasted",
        broadcasted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const results = [];
    for (const moment of testMoments) {
      const { data, error } = await supabase
        .from('moments')
        .insert(moment)
        .select()
        .single();
      
      if (error) {
        console.error(`Failed to insert: ${moment.title}`, error);
      } else {
        results.push(data);
      }
    }

    res.json({ success: true, created: results.length, moments: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Campaign management ---
// List campaigns with filters
router.get('/campaigns', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, sponsor_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (sponsor_id) query = query.eq('sponsor_id', sponsor_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ campaigns: data || [], page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    res.json({ campaign: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create campaign (content_admin+)
router.post('/campaigns', requireRole(['content_admin','superadmin']), async (req, res) => {
  try {
    const {
      title,
      content,
      sponsor_id,
      budget = 0,
      target_regions = [],
      target_categories = [],
      media_urls = [],
      scheduled_at
    } = req.body;

    // sanitize inputs
    const cleanTitle = sanitizeString(title, 250);
    const cleanContent = sanitizeString(content, 5000);
    const cleanSponsor = sponsor_id ? sanitizeString(sponsor_id, 100) : null;
    const cleanBudget = Number(budget) || 0;
    const cleanRegions = sanitizeArrayOfStrings(target_regions);
    const cleanCategories = sanitizeArrayOfStrings(target_categories);
    const cleanMedia = sanitizeArrayOfStrings(media_urls);
    const cleanScheduled = scheduled_at ? sanitizeString(scheduled_at, 64) : null;

    if (!cleanTitle || !cleanContent) return res.status(400).json({ error: 'title and content required' });

    const created_by = req.user?.id || null;

    const { data, error } = await supabase
      .from('campaigns')
      .insert({ title: cleanTitle, content: cleanContent, sponsor_id: cleanSponsor, budget: cleanBudget, target_regions: cleanRegions, target_categories: cleanCategories, media_urls: cleanMedia, scheduled_at: cleanScheduled, status: cleanScheduled ? 'scheduled' : 'pending_review' })
      .select()
      .single();

    if (error) throw error;
    res.json({ campaign: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update campaign (content_admin+)
router.put('/campaigns/:id', requireRole(['content_admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const raw = req.body;
    const updates = {};
    if (raw.title) updates.title = sanitizeString(raw.title, 250);
    if (raw.content) updates.content = sanitizeString(raw.content, 5000);
    if (raw.sponsor_id) updates.sponsor_id = sanitizeString(raw.sponsor_id, 100);
    if (raw.budget) updates.budget = Number(raw.budget) || 0;
    if (raw.target_regions) updates.target_regions = sanitizeArrayOfStrings(raw.target_regions);
    if (raw.target_categories) updates.target_categories = sanitizeArrayOfStrings(raw.target_categories);
    if (raw.media_urls) updates.media_urls = sanitizeArrayOfStrings(raw.media_urls);
    if (raw.scheduled_at) updates.scheduled_at = sanitizeString(raw.scheduled_at, 64);

    const { data, error } = await supabase
      .from('campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ campaign: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve campaign (superadmin only)
router.post('/campaigns/:id/approve', requireRole(['superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ campaign: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publish campaign => create moment and optionally broadcast (superadmin only)
router.post('/campaigns/:id/publish', requireRole(['superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    // Get campaign
    const { data: campaign, error: getErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();
    if (getErr || !campaign) throw new Error('Campaign not found');

    // Create a moment from campaign with proper intent flags
    const momentRecord = {
      title: campaign.title,
      content: campaign.content,
      region: campaign.target_regions && campaign.target_regions.length ? campaign.target_regions[0] : 'National',
      category: campaign.target_categories && campaign.target_categories.length ? campaign.target_categories[0] : 'Sponsored',
      language: 'eng',
      sponsor_id: campaign.sponsor_id,
      is_sponsored: true,
      media_urls: campaign.media_urls,
      pwa_link: null,
      scheduled_at: null,
      status: 'broadcasted',
      broadcasted_at: new Date().toISOString(),
      content_source: 'campaign',
      publish_to_pwa: true,  // Auto-publish to PWA
      publish_to_whatsapp: true,  // Auto-publish to WhatsApp
      created_by: 'campaign_system'
    };

    const { data: moment, error: insertErr } = await supabase
      .from('moments')
      .insert(momentRecord)
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Mark campaign as published
    await supabase.from('campaigns').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', id);

    // Note: Moment intents are automatically created by trigger
    // N8N intent-executor will process them within 1 minute

    res.json({ success: true, moment_id: moment.id, campaign_id: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- Admin role management (superadmin only) ---
// List all role mappings
router.get('/roles', requireRole(['superadmin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ roles: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update a role mapping
router.post('/roles', requireRole(['superadmin']), async (req, res) => {
  try {
    const user_id = sanitizeString(req.body.user_id, 100);
    const role = sanitizeString(req.body.role, 32);
    if (!user_id || !role) return res.status(400).json({ error: 'user_id and role required' });
    const allowed = ['superadmin', 'content_admin', 'moderator', 'viewer'];
    if (!allowed.includes(role)) return res.status(400).json({ error: 'invalid role' });

    // Upsert mapping
    const { data, error } = await supabase
      .from('admin_roles')
      .upsert({ user_id, role }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ mapping: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a role mapping by id
router.delete('/roles/:id', requireRole(['superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('admin_roles')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user role
router.get('/user-role', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check admin_roles table for explicit role mapping
    const { data: roleData, error: roleError } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.warn('Role lookup error:', roleError.message);
    }

    // Default role assignment
    const role = roleData?.role || 'moderator';
    
    res.json({ 
      role,
      user_id: user.id,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('User role error:', error);
    res.status(500).json({ error: 'Failed to get user role' });
  }
});

// Admin logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (user) {
      // Invalidate session if using session tokens
      const authHeader = req.get('authorization') || '';
      const token = authHeader.split(' ')[1];
      
      if (token && token.startsWith('session_')) {
        await supabase
          .from('admin_sessions')
          .update({ expires_at: new Date().toISOString() })
          .eq('token', token);
      }
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ success: true }); // Always return success for logout
  }
});

// Get admin users
router.get('/admin-users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, name, active, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ users: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create admin user
router.post('/admin-users', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }
    
    // Hash password (in production, use bcrypt)
    const bcrypt = await import('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('admin_users')
      .insert({ 
        email, 
        name, 
        password_hash,
        created_by: req.user?.id || null
      })
      .select('id, email, name, active, created_at')
      .single();
    
    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Flag message as inappropriate
router.post('/messages/:id/flag', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);
    
    // Create a flag record
    const { data: flag, error: flagError } = await supabase
      .from('flags')
      .insert({
        message_id: id,
        flag_type: 'inappropriate_content',
        flagged_by: user?.id || 'admin',
        reason: 'Flagged by admin for inappropriate content'
      })
      .select()
      .single();
    
    if (flagError) {
      return res.status(500).json({ error: 'Failed to flag message' });
    }
    
    // Mark message as flagged
    await supabase
      .from('messages')
      .update({ flagged: true, flagged_at: new Date().toISOString() })
      .eq('id', id);
    
    res.json({ 
      success: true, 
      message: 'Message flagged successfully',
      flag_id: flag.id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve message for publication
router.post('/messages/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Create a moment from the approved message
    const title = message.content.length > 50 
      ? message.content.substring(0, 50) + '...'
      : message.content;
    
    const { data: moment, error: momentError } = await supabase
      .from('moments')
      .insert({
        title: title,
        content: message.content,
        region: 'GP', // Default region, could be enhanced
        category: 'Community', // Default category
        content_source: 'community',
        status: 'draft',
        created_by: message.from_number,
        media_urls: message.media_urls || []
      })
      .select()
      .single();
    
    if (momentError) {
      return res.status(500).json({ error: 'Failed to create moment from message' });
    }
    
    // Mark message as processed
    await supabase
      .from('messages')
      .update({ processed: true, approved_at: new Date().toISOString() })
      .eq('id', id);
    
    res.json({ 
      success: true, 
      message: 'Message approved and converted to moment',
      moment_id: moment.id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Comment management endpoints
router.post('/comments/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('moment_comments')
      .update({ approved: true, moderated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, comment: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/comments/:id/feature', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('moment_comments')
      .update({ featured: true, approved: true, moderated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, comment: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('moment_comments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign activation and deletion
router.post('/campaigns/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, campaign: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user role
router.get('/user-role', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check admin_roles table for explicit role mapping
    const { data: roleData, error: roleError } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.warn('Role lookup error:', roleError.message);
    }

    // Default role assignment
    const role = roleData?.role || 'moderator';
    
    res.json({ 
      role,
      user_id: user.id,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('User role error:', error);
    res.status(500).json({ error: 'Failed to get user role' });
  }
});

// Admin logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (user) {
      // Invalidate session if using session tokens
      const authHeader = req.get('authorization') || '';
      const token = authHeader.split(' ')[1];
      
      if (token && token.startsWith('session_')) {
        await supabase
          .from('admin_sessions')
          .update({ expires_at: new Date().toISOString() })
          .eq('token', token);
      }
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ success: true }); // Always return success for logout
  }
});

// --- Authority management (Phase 3: Admin API Integration) ---
// Get authority requests (Phase 3) - MUST BE BEFORE /authority route
router.get('/authority/requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('authority_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ success: true, requests: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve authority request (Phase 3)
router.post('/authority/requests/:id/approve', requireRole(['content_admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, role, institution, region } = req.body;
    const user = await getUserFromRequest(req);
    
    // Create authority profile
    const roleMap = {
      school_principal: { level: 2, scope: 'school', blast_radius: 500 },
      community_leader: { level: 3, scope: 'community', blast_radius: 1000 },
      government_official: { level: 4, scope: 'region', blast_radius: 5000 },
      ngo_coordinator: { level: 2, scope: 'community', blast_radius: 500 },
      event_organizer: { level: 1, scope: 'community', blast_radius: 200 }
    };
    
    const config = roleMap[role] || { level: 1, scope: 'community', blast_radius: 100 };
    
    const { data: profile, error: profileError } = await supabase
      .from('authority_profiles')
      .insert({
        user_identifier: phone,
        authority_level: config.level,
        role_label: role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        scope: config.scope,
        scope_identifier: institution,
        blast_radius: config.blast_radius,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (profileError) throw profileError;
    
    // Update request status
    await supabase
      .from('authority_requests')
      .update({ 
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id
      })
      .eq('id', id);
    
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject authority request (Phase 3)
router.post('/authority/requests/:id/reject', requireRole(['content_admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = await getUserFromRequest(req);
    
    await supabase
      .from('authority_requests')
      .update({ 
        status: 'rejected',
        admin_notes: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id
      })
      .eq('id', id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List authority profiles
router.get('/authority', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, scope } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('authority_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (scope) query = query.eq('scope', scope);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ authority_profiles: data || [], page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single authority profile
router.get('/authority/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('authority_profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    res.json({ authority_profile: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create authority profile (content_admin+)
router.post('/authority', requireRole(['content_admin','superadmin']), async (req, res) => {
  try {
    const {
      user_identifier,
      authority_level = 1,
      role_label,
      scope,
      scope_identifier,
      approval_mode = 'ai_review',
      blast_radius = 100,
      risk_threshold = 0.7,
      valid_until,
      metadata = {}
    } = req.body;

    if (!user_identifier || !role_label || !scope) {
      return res.status(400).json({ error: 'Missing required fields: user_identifier, role_label, scope' });
    }

    const user = await getUserFromRequest(req);
    
    const { data: profile, error: insertError } = await supabase
      .from('authority_profiles')
      .insert({
        user_identifier,
        authority_level,
        role_label,
        scope,
        scope_identifier,
        approval_mode,
        blast_radius,
        risk_threshold,
        valid_until,
        metadata,
        created_by: user?.id,
        updated_by: user?.id
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log the creation
    await supabase.rpc('log_authority_action', {
      p_authority_profile_id: profile.id,
      p_action: 'created',
      p_actor_id: user?.id,
      p_context: { user_identifier, role_label, scope }
    });

    res.json({ authority_profile: profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update authority profile (content_admin+)
router.put('/authority/:id', requireRole(['content_admin','superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const user = await getUserFromRequest(req);

    const { data: profile, error: updateError } = await supabase
      .from('authority_profiles')
      .update({
        ...updates,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log the update
    await supabase.rpc('log_authority_action', {
      p_authority_profile_id: id,
      p_action: 'updated',
      p_actor_id: user?.id,
      p_context: { updates }
    });

    res.json({ authority_profile: profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete authority profile (superadmin only)
router.delete('/authority/:id', requireRole(['superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromRequest(req);

    // Log the deletion first
    await supabase.rpc('log_authority_action', {
      p_authority_profile_id: id,
      p_action: 'deleted',
      p_actor_id: user?.id,
      p_context: { reason: 'Admin deletion' }
    });

    const { error: deleteError } = await supabase
      .from('authority_profiles')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Authority profile deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend authority profile (superadmin only)
router.post('/authority/:id/suspend', requireRole(['superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Admin action' } = req.body;
    const user = await getUserFromRequest(req);

    const { data: profile, error: updateError } = await supabase
      .from('authority_profiles')
      .update({
        status: 'suspended',
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log the suspension
    await supabase.rpc('log_authority_action', {
      p_authority_profile_id: id,
      p_action: 'suspended',
      p_actor_id: user?.id,
      p_context: { reason }
    });

    res.json({ authority_profile: profile, message: 'Authority profile suspended' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get authority audit log
router.get('/authority/audit', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const { data, error } = await supabase
      .from('authority_audit_log')
      .select(`
        *,
        authority_profiles(user_identifier, role_label)
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ audit_log: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test authority lookup endpoint
router.get('/authority/lookup/:user_identifier', async (req, res) => {
  try {
    const { user_identifier } = req.params;
    
    const { data, error } = await supabase.rpc('lookup_authority', {
      p_user_identifier: user_identifier
    });
    
    if (error) throw error;
    
    const authority = data && data.length > 0 ? data[0] : null;
    res.json({ 
      user_identifier,
      authority: authority,
      has_authority: !!authority
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compliance check endpoint
router.post('/compliance/check', async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    // Simple rule-based compliance check
    const violations = [];
    let riskScore = 0;
    
    const text = `${title} ${content}`.toLowerCase();
    
    // Check for prohibited content
    const prohibited = ['vote', 'election', 'political party', 'loan', 'investment', 'cryptocurrency', 'cure', 'treatment', 'gambling', 'bet', 'lottery'];
    prohibited.forEach(word => {
      if (text.includes(word)) {
        violations.push(`Contains prohibited term: "${word}"`);
        riskScore += 30;
      }
    });
    
    // Check category risk
    const restrictedCategories = ['Government Services', 'Financial Literacy', 'Healthcare Services', 'Religious Events'];
    if (restrictedCategories.includes(category)) {
      riskScore += 20;
    }
    
    const isCompliant = violations.length === 0 && riskScore < 50;
    const violationSeverity = riskScore >= 70 ? 'SUSPEND' : riskScore >= 40 ? 'WARN' : 'SAFE';
    
    res.json({
      compliance: {
        is_compliant: isCompliant,
        risk_score: Math.min(riskScore, 100),
        violation_severity: violationSeverity,
        violations: violations,
        requires_approval: riskScore >= 40,
        recommendation: isCompliant ? 
          'Content is compliant with Meta policies' : 
          'Content requires review before broadcasting'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate slug from title and ID
function generateSlug(title, id) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
  
  slug += '-' + id.substring(0, 6);
  return slug;
}

export default router;