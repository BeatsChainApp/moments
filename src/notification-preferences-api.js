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

// Get notification history for user
export async function getNotificationHistory(req, res) {
  const { phone_number, limit = 50, offset = 0 } = req.query;

  if (!phone_number) {
    return res.status(400).json({ error: 'phone_number required' });
  }

  const { data: history, error } = await supabase
    .from('notification_log')
    .select(`
      *,
      notification_types(type_code, display_name, category)
    `)
    .eq('recipient_phone', phone_number)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ history, total: history.length });
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

  const analytics = {
    total: logs.length,
    by_status: {},
    by_category: {},
    by_priority: {},
    success_rate: 0
  };

  logs.forEach(log => {
    analytics.by_status[log.status] = (analytics.by_status[log.status] || 0) + 1;
    analytics.by_priority[log.priority] = (analytics.by_priority[log.priority] || 0) + 1;
    if (log.notification_types) {
      const cat = log.notification_types.category;
      analytics.by_category[cat] = (analytics.by_category[cat] || 0) + 1;
    }
  });

  const sent = analytics.by_status.sent || 0;
  const delivered = analytics.by_status.delivered || 0;
  analytics.success_rate = logs.length > 0 ? ((sent + delivered) / logs.length * 100).toFixed(1) : 0;

  res.json(analytics);
}
