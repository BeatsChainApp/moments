import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['gtm_container_id', 'gtm_enabled', 'gtm_custom_scripts']);

    if (error) throw error;
    
    const settings = {
      enabled: false,
      container_id: '',
      custom_scripts: ''
    };
    
    data?.forEach(row => {
      if (row.setting_key === 'gtm_container_id') {
        settings.container_id = row.setting_value || '';
      } else if (row.setting_key === 'gtm_enabled') {
        settings.enabled = row.setting_value === 'true';
      } else if (row.setting_key === 'gtm_custom_scripts') {
        settings.custom_scripts = row.setting_value || '';
      }
    });
    
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    res.status(200).json(settings);
  } catch (error) {
    console.error('GTM settings error:', error);
    res.status(200).json({ enabled: false, container_id: '', custom_scripts: '' });
  }
}
