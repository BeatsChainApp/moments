// Phase 4: A/B Testing & Revenue Attribution Endpoints
// Add to admin-api/index.ts

// Create A/B test variants
if (path.includes('/campaigns/') && path.includes('/variants') && method === 'POST' && body) {
  const campaignId = path.split('/campaigns/')[1].split('/variants')[0]
  
  const variants = body.variants || []
  const insertedVariants = []
  
  for (const variant of variants) {
    const { data } = await supabase
      .from('campaign_variants')
      .insert({
        campaign_id: campaignId,
        variant_name: variant.name,
        template_name: variant.template_name,
        content_variation: variant.content,
        title_variation: variant.title,
        subscriber_percentage: variant.percentage,
        is_control: variant.is_control || false
      })
      .select()
      .single()
    
    if (data) {
      // Initialize performance tracking
      await supabase.from('variant_performance').insert({
        variant_id: data.id
      })
      
      insertedVariants.push(data)
    }
  }
  
  return new Response(JSON.stringify({ 
    success: true,
    variants: insertedVariants
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get A/B test results
if (path.includes('/campaigns/') && path.includes('/ab-results') && method === 'GET') {
  const campaignId = path.split('/campaigns/')[1].split('/ab-results')[0]
  
  const { data: results } = await supabase
    .from('ab_test_results')
    .select('*')
    .eq('campaign_id', campaignId)
  
  // Calculate statistical significance between variants
  if (results && results.length >= 2) {
    const control = results.find(r => r.is_control)
    const variants = results.filter(r => !r.is_control)
    
    for (const variant of variants) {
      if (control) {
        const { data: significance } = await supabase.rpc('calculate_ab_significance', {
          p_variant_a_id: control.variant_id,
          p_variant_b_id: variant.variant_id
        })
        variant.significance = significance
      }
    }
  }
  
  return new Response(JSON.stringify({ 
    results: results || [],
    winner: results?.reduce((best, curr) => 
      (curr.roi_multiple > (best?.roi_multiple || 0)) ? curr : best
    , null)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Track click (public endpoint)
if (path.includes('/track/click') && method === 'POST' && body) {
  const { moment_id, campaign_id, variant_id, subscriber_phone } = body
  const userAgent = req.headers.get('user-agent')
  
  await supabase.rpc('track_click', {
    p_moment_id: moment_id,
    p_campaign_id: campaign_id,
    p_variant_id: variant_id,
    p_subscriber_phone: subscriber_phone,
    p_user_agent: userAgent
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Track conversion (webhook endpoint)
if (path.includes('/track/conversion') && method === 'POST' && body) {
  const { 
    moment_id, 
    campaign_id, 
    variant_id, 
    subscriber_phone, 
    conversion_type, 
    conversion_value 
  } = body
  
  await supabase.rpc('track_conversion', {
    p_moment_id: moment_id,
    p_campaign_id: campaign_id,
    p_variant_id: variant_id,
    p_subscriber_phone: subscriber_phone,
    p_conversion_type: conversion_type,
    p_conversion_value: conversion_value || 0
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get revenue attribution
if (path.includes('/analytics/revenue-attribution') && method === 'GET') {
  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaign_id')
  const timeframe = url.searchParams.get('timeframe') || '30d'
  const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
  
  let query = supabase
    .from('revenue_attribution')
    .select('*, campaigns(title), campaign_variants(variant_name)')
    .gte('attributed_at', `now() - interval '${days} days'`)
  
  if (campaignId) {
    query = query.eq('campaign_id', campaignId)
  }
  
  const { data: attributions } = await query
  
  const summary = {
    total_revenue: attributions?.reduce((sum, a) => sum + parseFloat(a.revenue_amount), 0) || 0,
    by_campaign: {},
    by_variant: {},
    by_source: {}
  }
  
  attributions?.forEach(a => {
    // By campaign
    if (!summary.by_campaign[a.campaign_id]) {
      summary.by_campaign[a.campaign_id] = {
        campaign_title: a.campaigns?.title,
        revenue: 0,
        count: 0
      }
    }
    summary.by_campaign[a.campaign_id].revenue += parseFloat(a.revenue_amount)
    summary.by_campaign[a.campaign_id].count++
    
    // By variant
    if (a.variant_id) {
      if (!summary.by_variant[a.variant_id]) {
        summary.by_variant[a.variant_id] = {
          variant_name: a.campaign_variants?.variant_name,
          revenue: 0,
          count: 0
        }
      }
      summary.by_variant[a.variant_id].revenue += parseFloat(a.revenue_amount)
      summary.by_variant[a.variant_id].count++
    }
    
    // By source
    const source = a.revenue_source || 'unknown'
    summary.by_source[source] = (summary.by_source[source] || 0) + parseFloat(a.revenue_amount)
  })
  
  return new Response(JSON.stringify({
    summary,
    attributions: attributions || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get conversion funnel
if (path.includes('/analytics/conversion-funnel') && method === 'GET') {
  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaign_id')
  const timeframe = url.searchParams.get('timeframe') || '30d'
  const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
  
  // Get campaign sends
  const { data: campaign } = await supabase
    .from('campaign_performance')
    .select('total_reach, broadcast_count')
    .eq('id', campaignId)
    .single()
  
  // Get clicks
  const { data: clicks } = await supabase
    .from('link_clicks')
    .select('id', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .gte('clicked_at', `now() - interval '${days} days'`)
  
  // Get conversions
  const { data: conversions } = await supabase
    .from('conversions')
    .select('id, conversion_value', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .gte('converted_at', `now() - interval '${days} days'`)
  
  const sends = campaign?.total_reach || 0
  const clickCount = clicks?.length || 0
  const conversionCount = conversions?.length || 0
  const totalRevenue = conversions?.reduce((sum, c) => sum + parseFloat(c.conversion_value || 0), 0) || 0
  
  return new Response(JSON.stringify({
    funnel: {
      sends: sends,
      clicks: clickCount,
      conversions: conversionCount,
      click_rate: sends > 0 ? ((clickCount / sends) * 100).toFixed(2) : 0,
      conversion_rate: clickCount > 0 ? ((conversionCount / clickCount) * 100).toFixed(2) : 0,
      overall_conversion: sends > 0 ? ((conversionCount / sends) * 100).toFixed(2) : 0
    },
    revenue: {
      total: totalRevenue.toFixed(2),
      per_send: sends > 0 ? (totalRevenue / sends).toFixed(2) : 0,
      per_conversion: conversionCount > 0 ? (totalRevenue / conversionCount).toFixed(2) : 0
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
