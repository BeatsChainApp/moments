    // Enhanced Analytics with Revenue
    if (path.includes('/analytics/revenue') && method === 'GET') {
      const [campaigns, revenue, budgets] = await Promise.all([
        supabase.from('campaigns').select('*', { count: 'exact' }),
        supabase.from('revenue_events').select('revenue_amount').gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString()),
        supabase.from('campaign_budgets').select('total_budget, spent_amount, revenue_generated')
      ])

      const totalRevenue = revenue.data?.reduce((sum, event) => sum + parseFloat(event.revenue_amount), 0) || 0
      const totalBudget = budgets.data?.reduce((sum, budget) => sum + parseFloat(budget.total_budget), 0) || 0
      const totalSpent = budgets.data?.reduce((sum, budget) => sum + parseFloat(budget.spent_amount), 0) || 0
      const totalGenerated = budgets.data?.reduce((sum, budget) => sum + parseFloat(budget.revenue_generated), 0) || 0

      return new Response(JSON.stringify({
        totalCampaigns: campaigns.count || 0,
        totalRevenue30Days: totalRevenue,
        totalBudgetAllocated: totalBudget,
        totalSpent: totalSpent,
        totalRevenueGenerated: totalGenerated,
        roi: totalSpent > 0 ? ((totalGenerated - totalSpent) / totalSpent * 100).toFixed(2) : 0,
        profitMargin: totalGenerated > 0 ? ((totalGenerated - totalSpent) / totalGenerated * 100).toFixed(2) : 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Campaign Performance Analytics
    if (path.includes('/analytics/campaigns') && method === 'GET') {
      const { data: campaignPerformance } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_budgets(*),
          campaign_metrics(*),
          revenue_events(revenue_amount)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      return new Response(JSON.stringify({ 
        campaigns: campaignPerformance || [],
        summary: {
          topPerforming: campaignPerformance?.sort((a, b) => 
            (b.campaign_metrics?.[0]?.conversion_rate || 0) - (a.campaign_metrics?.[0]?.conversion_rate || 0)
          ).slice(0, 5) || []
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }