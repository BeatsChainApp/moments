import { supabase } from '../config/supabase.js';

export async function healthCheck() {
  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Unami Foundation Moments API',
    version: '1.0.0',
    environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'production'
  };

  // Test Supabase connection with timeout
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout')), 5000)
      );
      
      const dbPromise = supabase.from('messages').select('count').limit(1);
      
      const { data, error } = await Promise.race([dbPromise, timeoutPromise]);
      if (error) throw error;
      results.supabase = { status: 'connected' };
    } catch (err) {
      console.warn('Supabase health check failed:', err.message);
      results.supabase = { status: 'failed', error: err.message };
      // Don't fail overall health check
    }
  } else {
    results.supabase = { status: 'not_configured' };
  }

  return results;
}