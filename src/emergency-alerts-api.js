import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get all emergency alerts
export async function getEmergencyAlerts(req, res) {
  const { status, limit = 50 } = req.query;

  let query = supabase
    .from('emergency_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ alerts: data || [] });
}

// Create emergency alert
export async function createEmergencyAlert(req, res) {
  const {
    alert_type,
    severity,
    title,
    message,
    target_regions,
    target_categories,
    bypass_preferences = true,
    multi_channel = false,
    channels = ['whatsapp'],
    expires_at
  } = req.body;

  if (!alert_type || !severity || !title || !message) {
    return res.status(400).json({
      error: 'Missing required fields: alert_type, severity, title, message'
    });
  }

  const { data, error } = await supabase
    .from('emergency_alerts')
    .insert({
      alert_type,
      severity,
      title,
      message,
      target_regions: target_regions || null,
      target_categories: target_categories || null,
      bypass_preferences,
      multi_channel,
      channels,
      expires_at: expires_at || null,
      created_by: 'admin',
      status: 'draft'
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    success: true,
    alert_id: data.id,
    message: 'Emergency alert created',
    data
  });
}

// Send emergency alert
export async function sendEmergencyAlert(req, res) {
  const { id } = req.params;

  try {
    const { data, error } = await supabase.rpc('send_emergency_alert', {
      p_alert_id: id
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Cancel emergency alert
export async function cancelEmergencyAlert(req, res) {
  const { id } = req.params;

  try {
    const { data, error } = await supabase.rpc('cancel_emergency_alert', {
      p_alert_id: id
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get active emergency alerts (public)
export async function getActiveEmergencyAlerts(req, res) {
  try {
    const { data, error } = await supabase.rpc('get_active_emergency_alerts');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ alerts: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update emergency alert
export async function updateEmergencyAlert(req, res) {
  const { id } = req.params;
  const {
    title,
    message,
    severity,
    target_regions,
    target_categories,
    expires_at
  } = req.body;

  const { data, error } = await supabase
    .from('emergency_alerts')
    .update({
      title,
      message,
      severity,
      target_regions: target_regions || null,
      target_categories: target_categories || null,
      expires_at: expires_at || null
    })
    .eq('id', id)
    .eq('status', 'draft') // Only update drafts
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Alert not found or already sent' });
  }

  res.json({
    success: true,
    message: 'Emergency alert updated',
    data
  });
}

// Delete emergency alert
export async function deleteEmergencyAlert(req, res) {
  const { id } = req.params;

  const { error } = await supabase
    .from('emergency_alerts')
    .delete()
    .eq('id', id)
    .eq('status', 'draft'); // Only delete drafts

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    success: true,
    message: 'Emergency alert deleted'
  });
}
