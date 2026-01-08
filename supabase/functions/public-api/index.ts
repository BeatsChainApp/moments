import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname

    // Public stats endpoint
    if (path === '/stats') {
      const [moments, subscribers, broadcasts] = await Promise.all([
        supabase.from('moments').select('*', { count: 'exact' }).eq('status', 'broadcasted'),
        supabase.from('subscriptions').select('*', { count: 'exact' }).eq('opted_in', true),
        supabase.from('broadcasts').select('*', { count: 'exact' })
      ])

      return new Response(JSON.stringify({
        totalMoments: moments.count || 0,
        activeSubscribers: subscribers.count || 0,
        totalBroadcasts: broadcasts.count || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Public moments endpoint
    if (path === '/moments') {
      const region = url.searchParams.get('region')
      const category = url.searchParams.get('category')
      const source = url.searchParams.get('source')

      let query = supabase
        .from('moments')
        .select('*, sponsors(*)')
        .eq('status', 'broadcasted')
        .order('broadcasted_at', { ascending: false })
        .limit(50)

      if (region) query = query.eq('region', region)
      if (category) query = query.eq('category', category)
      if (source) query = query.eq('content_source', source)

      const { data: moments } = await query

      return new Response(JSON.stringify({
        moments: moments || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})