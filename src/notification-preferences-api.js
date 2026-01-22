import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get user's notification preferences
export async function getUserPreferences(req, res) {
  const { phone_number } = req.query;

  if (!phone_number) {
    return res.status(400).json({ error: 'phone_number required' });
  }

  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .select(`
      *,
      notification_types(type_code, display_name, category, user_controllable)
    `)
    .eq('phone_number', phone_number);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Get all notification types
  const { data: allTypes } = await supabase
    .from('notification_types')
    .select('*')
    .eq('user_controllable', true);

  // Merge with defaults
  const preferencesMap = new Map(preferences.map(p => [p.notification_type_id, p]));
  const result = allTypes.map(type => {
    const pref = preferencesMap.get(type.id);
    return {
      notification_type_id: type.id,
      type_code: type.type_code,
      display_name: type.display_name,
      category: type.category,
      enabled: pref?.enabled ?? type.default_enabled,
      frequency: pref?.frequency ?? 'realtime',
      quiet_hours_start: pref?.quiet_hours_start,
      quiet_hours_end: pref?.quiet_hours_end,
      max_per_day: pref?.max_per_day
    };
  });

  res.json({ preferences: result });
}

// Update user's notification preferences
export async function updateUserPreferences(req, res) {
  const { phone_number, preferences } = req.body;

  if (!phone_number || !Array.isArray(preferences)) {
    return res.status(400).json({ error: 'phone_number and preferences array required' });
  }

  const updates = [];
  for (const pref of preferences) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        phone_number,
        notification_type_id: pref.notification_type_id,
        enabled: pref.enabled,
        frequency: pref.frequency,
        quiet_hours_start: pref.quiet_hours_start,
        quiet_hours_end: pref.quiet_hours_end,
        max_per_day: pref.max_per_day,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone_number,notification_type_id'
      })
      .select();

    if (!error) {
      updates.push(data[0]);
    }
  }

  // Update subscription table
  await supabase
    .from('subscriptions')
    .update({ notification_preferences_updated_at: new Date().toISOString() })
    .eq('phone_number', phone_number);

  res.json({ success: true, updated: updates.length });
}

// Get notification history for user or admin view
export async function getNotificationHistory(req, res) {
  const { phone_number, page = 1, limit = 20, type, status } = req.query;

  let query = supabase
    .from('notification_log')
    .select(`
      *,
      notification_types(type_code, display_name, category, priority_level)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  // Filter by phone if provided
  if (phone_number) {
    query = query.eq('recipient_phone', phone_number);
  }

  // Filter by type if provided
  if (type) {
    const { data: typeData } = await supabase
      .from('notification_types')
      .select('id')
      .eq('type_code', type)
      .single();
    
    if (typeData) {
      query = query.eq('notification_type_id', typeData.id);
    }
  }

  // Filter by status if provided
  if (status) {
    query = query.eq('status', status);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data: history, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Format response
  const notifications = (history || []).map(log => ({
    id: log.id,
    notification_type: log.notification_types?.type_code,
    type_display_name: log.notification_types?.display_name,
    priority_level: log.notification_types?.priority_level,
    recipient_phone: log.recipient_phone,
    status: log.status,
    message_preview: log.message_content?.substring(0, 150),
    error_message: log.error_message,
    created_at: log.created_at,
    sent_at: log.sent_at
  }));

  res.json({ 
    notifications, 
    total: count || 0,
    page: parseInt(page),
    limit: parseInt(limit)
  });
}

// Get notification analytics
export async function getNotificationAnalytics(req, res) {
  const { timeframe = '7d' } = req.query;

  const startDate = new Date();
  if (timeframe === '7d') startDate.setDate(startDate.getDate() - 7);
  else if (timeframe === '30d') startDate.setDate(startDate.getDate() - 30);

  const { data: logs, error } = await supabase
    .from('notification_log')
    .select(`
      status,
      priority,
      notification_types(category, type_code)
    `)
    .gte('created_at', startDate.toISOString());

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const total = logs.length;
  const sent = logs.filter(l => l.status === 'sent' || l.status === 'delivered').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const pending = logs.filter(l => l.status === 'pending').length;

  const analytics = {
    total_sent: sent,
    total_failed: failed,
    total_pending: pending,
    success_rate: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
    by_status: {},
    by_category: {},
    by_priority: {}
  };

  logs.forEach(log => {
    analytics.by_status[log.status] = (analytics.by_status[log.status] || 0) + 1;
    analytics.by_priority[log.priority] = (analytics.by_priority[log.priority] || 0) + 1;
    if (log.notification_types) {
      const cat = log.notification_types.category;
      analytics.by_category[cat] = (analytics.by_category[cat] || 0) + 1;
    }
  });

  res.json(analytics);
}


// Enhanced notification-sender to use orchestrator
export async function enhanceNotificationSender() {
  const { data: notifications } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .limit(10);

  for (const notif of notifications || []) {
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/notification-orchestrator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_type: notif.template_name,
          recipient_phone: notif.phone_number,
          message_content: notif.message_content,
          priority: 2,
          metadata: notif.metadata
        })
      });

      if (response.ok) {
        await supabase.from('notification_queue')
          .update({ status: 'sent', last_attempt_at: new Date().toISOString() })
          .eq('id', notif.id);
      } else {
        throw new Error(await response.text());
      }
    } catch (error) {
      await supabase.from('notification_queue')
        .update({ 
          status: 'failed', 
          attempts: notif.attempts + 1,
          error_message: error.message,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', notif.id);
    }
  }

  return { processed: notifications?.length || 0 };
}
