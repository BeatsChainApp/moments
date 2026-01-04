import { supabase } from '../config/supabase.js';

const MCP_ENDPOINT = process.env.MCP_ENDPOINT || 'https://mcp-production.up.railway.app/advisory';

export async function screenCampaignContent(campaignData) {
  try {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: campaignData.content,
        title: campaignData.title,
        type: 'sponsored_content',
        metadata: {
          sponsor_id: campaignData.sponsor_id,
          budget: campaignData.budget,
          regions: campaignData.target_regions,
          categories: campaignData.target_categories
        }
      })
    });

    if (!response.ok) {
      return { safe: true, confidence: 0.5, advisory: 'MCP unavailable - manual review required' };
    }

    const advisory = await response.json();
    
    // Store advisory for audit trail
    await supabase.from('campaign_advisories').insert({
      campaign_id: campaignData.id,
      advisory_data: advisory,
      confidence: advisory.confidence || 0.5,
      escalation_suggested: advisory.confidence > 0.8,
      created_at: new Date().toISOString()
    });

    return advisory;
  } catch (error) {
    console.error('MCP screening error:', error);
    return { safe: true, confidence: 0.5, advisory: 'MCP error - manual review required' };
  }
}

export async function getCampaignRiskScore(campaignId) {
  try {
    const { data } = await supabase
      .from('campaign_advisories')
      .select('confidence, advisory_data')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.confidence || 0.5;
  } catch (error) {
    return 0.5;
  }
}