// Campaign Analytics Endpoints
// Add to admin-api/index.ts after other analytics endpoints

// Get campaign performance overview
if (path.includes('/analytics/campaigns') && method === 'GET' && !path.includes('/campaigns/')) {
  const url = new URL(req.url)
  const timeframe = url.searchParams.get('timeframe') || '30d'
  const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30

  const { data: campaigns } = await supabase
    .from('campaign_performance')
    .select('*')
    .gte('created_at', `now() - interval '${days} days'`)
    .order('created_at', { ascending: false })

  // Aggregate metrics
  const analytics = {
    total_campaigns: campaigns?.length || 0,
    total_reach: campaigns?.reduce((sum, c) => sum + (c.total_reach || 0), 0) || 0,
    total_cost: campaigns?.reduce((sum, c) => sum + parseFloat(c.total_cost || 0), 0) || 0,
    total_broadcasts: campaigns?.reduce((sum, c) => sum + (c.broadcast_count || 0), 0) || 0,
    avg_success_rate: campaigns?.length > 0 
      ? (campaigns.reduce((sum, c) => sum + parseFloat(c.success_rate || 0), 0) / campaigns.length).toFixed(1)
      : 0,
    by_status: {},
    by_authority_level: {},
    by_template: {},
    top_performers: campaigns?.slice(0, 5) || []
  }

  // Group by status
  campaigns?.forEach(c => {
    analytics.by_status[c.status] = (analytics.by_status[c.status] || 0) + 1
    
    const level = c.authority_level || 0
    if (!analytics.by_authority_level[level]) {
      analytics.by_authority_level[level] = { count: 0, reach: 0, cost: 0 }
    }
    analytics.by_authority_level[level].count++
    analytics.by_authority_level[level].reach += c.total_reach || 0
    analytics.by_authority_level[level].cost += parseFloat(c.total_cost || 0)

    if (c.template_name) {
      if (!analytics.by_template[c.template_name]) {
        analytics.by_template[c.template_name] = { count: 0, reach: 0, success_rate: 0 }
      }
      analytics.by_template[c.template_name].count++
      analytics.by_template[c.template_name].reach += c.total_reach || 0
    }
  })

  return new Response(JSON.stringify({ analytics, campaigns: campaigns || [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get specific campaign performance
if (path.match(/\/analytics\/campaigns\/[a-f0-9-]{36}$/) && method === 'GET') {
  const campaignId = path.split('/campaigns/')[1]

  const { data: performance } = await supabase
    .from('campaign_performance')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!performance) {
    return new Response(JSON.stringify({ error: 'Campaign not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Get template performance for this campaign
  const { data: templatePerf } = await supabase
    .from('template_performance')
    .select('*')
    .eq('campaign_id', campaignId)

  // Get budget transactions
  const { data: transactions } = await supabase
    .from('budget_transactions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  return new Response(JSON.stringify({
    performance,
    template_performance: templatePerf || [],
    budget_transactions: transactions || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get template performance comparison
if (path.includes('/analytics/templates') && method === 'GET') {
  const url = new URL(req.url)
  const timeframe = url.searchParams.get('timeframe') || '30d'
  const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30

  const { data: templates } = await supabase
    .from('template_performance')
    .select('*')
    .gte('created_at', `now() - interval '${days} days'`)

  // Aggregate by template name
  const aggregated = {}
  templates?.forEach(t => {
    if (!aggregated[t.template_name]) {
      aggregated[t.template_name] = {
        template_name: t.template_name,
        total_sends: 0,
        total_deliveries: 0,
        total_failures: 0,
        campaigns_used: 0,
        avg_delivery_rate: 0,
        authority_levels: {}
      }
    }
    
    const agg = aggregated[t.template_name]
    agg.total_sends += t.sends || 0
    agg.total_deliveries += t.deliveries || 0
    agg.total_failures += t.failures || 0
    agg.campaigns_used++
    
    const level = t.authority_level || 0
    if (!agg.authority_levels[level]) {
      agg.authority_levels[level] = { sends: 0, deliveries: 0 }
    }
    agg.authority_levels[level].sends += t.sends || 0
    agg.authority_levels[level].deliveries += t.deliveries || 0
  })

  // Calculate averages
  Object.values(aggregated).forEach(agg => {
    agg.avg_delivery_rate = agg.total_sends > 0 
      ? ((agg.total_deliveries / agg.total_sends) * 100).toFixed(1)
      : 0
  })

  return new Response(JSON.stringify({ 
    templates: Object.values(aggregated),
    timeframe
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get budget overview
if (path.includes('/analytics/budget') && method === 'GET') {
  const url = new URL(req.url)
  const timeframe = url.searchParams.get('timeframe') || '30d'
  const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30

  const { data: transactions } = await supabase
    .from('budget_transactions')
    .select('*, campaigns(title, sponsor_id)')
    .gte('created_at', `now() - interval '${days} days'`)
    .order('created_at', { ascending: false })

  const totalSpent = transactions?.reduce((sum, t) => 
    sum + (t.transaction_type === 'spend' ? parseFloat(t.amount) : 0), 0
  ) || 0

  const totalRefunded = transactions?.reduce((sum, t) => 
    sum + (t.transaction_type === 'refund' ? parseFloat(t.amount) : 0), 0
  ) || 0

  const netSpent = totalSpent - totalRefunded

  // Group by campaign
  const byCampaign = {}
  transactions?.forEach(t => {
    if (t.campaign_id) {
      if (!byCampaign[t.campaign_id]) {
        byCampaign[t.campaign_id] = {
          campaign_id: t.campaign_id,
          campaign_title: t.campaigns?.title || 'Unknown',
          total_spent: 0,
          transaction_count: 0
        }
      }
      if (t.transaction_type === 'spend') {
        byCampaign[t.campaign_id].total_spent += parseFloat(t.amount)
      }
      byCampaign[t.campaign_id].transaction_count++
    }
  })

  return new Response(JSON.stringify({
    summary: {
      total_spent: totalSpent.toFixed(2),
      total_refunded: totalRefunded.toFixed(2),
      net_spent: netSpent.toFixed(2),
      transaction_count: transactions?.length || 0
    },
    by_campaign: Object.values(byCampaign),
    recent_transactions: transactions?.slice(0, 20) || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
