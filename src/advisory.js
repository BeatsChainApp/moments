import axios from 'axios';
import { supabase } from '../config/supabase.js';

export const callMCPAdvisory = async (messageData) => {
  try {
    const response = await axios.post(process.env.MCP_ENDPOINT, {
      message: messageData.content,
      language: messageData.language_detected,
      media_type: messageData.message_type,
      from_number: messageData.from_number,
      timestamp: messageData.timestamp
    }, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const advisory = response.data;
    
    // Store advisory results
    await supabase.from('advisories').insert([
      {
        message_id: messageData.id,
        advisory_type: 'language',
        confidence: advisory.language_confidence,
        details: { language: messageData.language_detected }
      },
      {
        message_id: messageData.id,
        advisory_type: 'urgency',
        confidence: advisory.urgency_level === 'high' ? 0.9 : advisory.urgency_level === 'medium' ? 0.6 : 0.3,
        details: { level: advisory.urgency_level }
      },
      {
        message_id: messageData.id,
        advisory_type: 'harm',
        confidence: advisory.harm_signals.confidence,
        details: advisory.harm_signals,
        escalation_suggested: advisory.escalation_suggested
      },
      {
        message_id: messageData.id,
        advisory_type: 'spam',
        confidence: advisory.spam_indicators.confidence,
        details: advisory.spam_indicators
      }
    ]);
    
    return advisory;
    
  } catch (error) {
    console.error('MCP Advisory error:', error.message);
    
    // Log failure but continue processing
    await supabase.from('flags').insert({
      message_id: messageData.id,
      flag_type: 'advisory_failed',
      severity: 'low',
      action_taken: 'logged',
      notes: `MCP advisory call failed: ${error.message}`
    });
    
    // Return safe default
    return {
      language_confidence: 0.5,
      urgency_level: 'low',
      harm_signals: { detected: false, confidence: 0 },
      spam_indicators: { detected: false, confidence: 0 },
      escalation_suggested: false,
      notes: 'Advisory system unavailable'
    };
  }
};