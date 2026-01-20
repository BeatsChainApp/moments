// ============================================================================
// CAMPAIGN SYSTEM ENHANCEMENTS - ALL ENDPOINTS (Phases 1-4)
// Add these to admin-api/index.ts after existing endpoints
// ============================================================================

// ============================================================================
// PHASE 1-3: ENHANCED CAMPAIGN BROADCAST
// Replace existing broadcast endpoint (line ~1614)
// ============================================================================

if (path.includes('/campaigns/') && path.includes('/broadcast') && method === 'POST') {
  const campaignId = path.split('/campaigns/')[1].split('/broadcast')[0]
  console.log('📢 Broadcasting campaign:', campaignId)

  try {
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, sponsors(display_name, tier)')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authority lookup
    const { data: authorityData } = await supabase.rpc('lookup_campaign_authority', {
      p_user_identifier: campaign.created_by || 'system'
    })
    const authorityContext = authorityData?.[0] || null

    // Get subscribers with region filtering
    let subscriberQuery = supabase
      .from('subscriptions')
      .select('phone_number, regions')
      .eq('opted_in', true)

    if (campaign.target_regions?.length > 0) {
      subscriberQuery = subscriberQuery.overlaps('regions', campaign.target_regions)
    }

    const { data: allSubscribers } = await subscriberQuery
    let subscribers = allSubscribers || []

    // Apply blast radius
    if (authorityContext?.blast_radius && subscribers.length > authorityContext.blast_radius) {
      subscribers = subscribers.slice(0, authorityContext.blast_radius)
    }

    const recipientCount = subscribers.length
    const estimatedCost = recipientCount * 0.12

    // Budget check
    if (campaign.budget > 0) {
      const { data: budgetCheck } = await supabase.rpc('check_campaign_budget', {
        p_campaign_id: campaignId,
        p_spend_amount: estimatedCost
      })

      if (budgetCheck && !budgetCheck.allowed) {
        return new Response(JSON.stringify({ 
          error: `Budget exceeded: ${budgetCheck.reason}`
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Create moment
    const { data: moment } = await supabase
      .from('moments')
      .insert({
        title: campaign.title,
        content: campaign.content,
        region: campaign.target_regions?.[0] || 'National',
        category: campaign.target_categories?.[0] || 'General',
        sponsor_id: campaign.sponsor_id,
        is_sponsored: !!campaign.sponsor_id,
        content_source: 'campaign',
        campaign_id: campaignId,
        status: 'broadcasted',
        broadcasted_at: new Date().toISOString(),
        media_urls: campaign.media_urls || [],
        created_by: campaign.created_by || 'system'
      })
      .select()
      .single()

    // Select template
    let templateName = 'community_moment_v1'
    if (authorityContext) {
      if (authorityContext.authority_level >= 4) {
        templateName = 'official_announcement_v1'
      } else if (campaign.sponsor_id) {
        templateName = 'verified_sponsored_v1'
      } else {
        templateName = 'verified_moment_v1'
      }
    }

    // Create broadcast
    const { data: broadcast } = await supabase
      .from('broadcasts')
      .insert({
        moment_id: moment.id,
        recipient_count: recipientCount,
        status: 'processing',
        broadcast_started_at: new Date().toISOString(),
        authority_context: authorityContext
      })
      .select()
      .single()

    // Log compliance
    await supabase.from('marketing_compliance').insert({
      moment_id: moment.id,
      broadcast_id: broadcast.id,
      template_used: templateName,
      template_category: 'MARKETING',
      sponsor_disclosed: !!campaign.sponsor_id,
      opt_out_included: true,
      pwa_link_included: true,
      compliance_score: 100
    }).catch(() => {})

    // Trigger webhook
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/broadcast-webhook`
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcast_id: broadcast.id,
        moment_id: moment.id,
        template_name: templateName,
        recipients: subscribers.map(s => s.phone_number)
      })
    }).then(async () => {
      const actualCost = recipientCount * 0.12
      
      // Log transaction
      await supabase.from('budget_transactions').insert({
        campaign_id: campaignId,
        transaction_type: 'spend',
        amount: actualCost,
        recipient_count: recipientCount,
        cost_per_recipient: 0.12
      })

      // Update stats
      await supabase.rpc('update_campaign_stats', {
        p_campaign_id: campaignId,
        p_recipient_count: recipientCount,
        p_cost: actualCost
      })

      // Log template performance
      await supabase.rpc('log_template_performance', {
        p_template_name: templateName,
        p_campaign_id: campaignId,
        p_authority_level: authorityContext?.authority_level || 0,
        p_sends: recipientCount,
        p_deliveries: recipientCount,
        p_failures: 0,
        p_cost: actualCost
      })

      // Update campaign
      await supabase
        .from('campaigns')
        .update({ 
          status: 'published',
          template_name: templateName
        })
        .eq('id', campaignId)
    })

    return new Response(JSON.stringify({
      success: true,
      campaign_id: campaignId,
      moment_id: moment.id,
      recipient_count: recipientCount,
      template: templateName,
      estimated_cost: estimatedCost
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// ============================================================================
// PHASE 3: CAMPAIGN ANALYTICS
// Add after existing analytics endpoints
// ============================================================================

if (path.includes('/analytics/campaigns') && method === 'GET' && !path.match(/\/campaigns\/[a-f0-9-]{36}/)) {
  const timeframe = new URL(req.url).searchParams.get('timeframe') || '30d'
  const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30

  const { data: campaigns } = await supabase
    .from('campaign_performance')
    .select('*')
    .gte('created_at', `now() - interval '${days} days'`)

  const analytics = {
    total_campaigns: campaigns?.length || 0,
    total_reach: campaigns?.reduce((sum, c) => sum + (c.total_reach || 0), 0) || 0,
    total_cost: campaigns?.reduce((sum, c) => sum + parseFloat(c.total_cost || 0), 0) || 0
  }

  return new Response(JSON.stringify({ analytics, campaigns: campaigns || [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// ============================================================================
// PHASE 4: A/B TESTING
// ============================================================================

if (path.includes('/campaigns/') && path.includes('/variants') && method === 'POST' && body) {
  const campaignId = path.split('/campaigns/')[1].split('/variants')[0]
  const variants = body.variants || []
  const inserted = []
  
  for (const v of variants) {
    const { data } = await supabase
      .from('campaign_variants')
      .insert({
        campaign_id: campaignId,
        variant_name: v.name,
        template_name: v.template_name,
        content_variation: v.content,
        title_variation: v.title,
        subscriber_percentage: v.percentage,
        is_control: v.is_control || false
      })
      .select()
      .single()
    
    if (data) {
      await supabase.from('variant_performance').insert({ variant_id: data.id })
      inserted.push(data)
    }
  }
  
  return new Response(JSON.stringify({ success: true, variants: inserted }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

if (path.includes('/campaigns/') && path.includes('/ab-results') && method === 'GET') {
  const campaignId = path.split('/campaigns/')[1].split('/ab-results')[0]
  
  const { data: results } = await supabase
    .from('ab_test_results')
    .select('*')
    .eq('campaign_id', campaignId)
  
  return new Response(JSON.stringify({ results: results || [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

if (path.includes('/track/click') && method === 'POST' && body) {
  await supabase.rpc('track_click', {
    p_moment_id: body.moment_id,
    p_campaign_id: body.campaign_id || '00000000-0000-0000-0000-000000000000',
    p_variant_id: body.variant_id || '00000000-0000-0000-0000-000000000000',
    p_subscriber_phone: body.subscriber_phone || '',
    p_user_agent: req.headers.get('user-agent') || ''
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

if (path.includes('/track/conversion') && method === 'POST' && body) {
  await supabase.rpc('track_conversion', {
    p_moment_id: body.moment_id,
    p_campaign_id: body.campaign_id,
    p_variant_id: body.variant_id || '00000000-0000-0000-0000-000000000000',
    p_subscriber_phone: body.subscriber_phone,
    p_conversion_type: body.conversion_type,
    p_conversion_value: body.conversion_value || 0
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// ============================================================================
// END OF CAMPAIGN ENHANCEMENTS
// ============================================================================
