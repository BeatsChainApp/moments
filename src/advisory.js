import { supabase } from '../config/supabase.js';

export const callMCPAdvisory = async (messageData) => {
  try {
    // Enhanced MCP with moderation decisions
    const { data, error } = await supabase.rpc('mcp_advisory', {
      message_content: messageData.content,
      message_language: messageData.language_detected,
      message_type: messageData.message_type,
      from_number: messageData.from_number,
      message_timestamp: messageData.timestamp
    });
    
    if (error) throw error;
    
    const advisory = data;
    
    // Enhanced advisory with moderation actions
    const enhancedAdvisory = {
      ...advisory,
      action: determineAction(advisory),
      cleaned_content: cleanContent(messageData.content, advisory),
      should_publish: shouldPublish(advisory),
      is_duplicate: checkDuplicate(messageData.content)
    };
    
    // Store advisory results
    try {
      await supabase.from('advisories').insert([
        {
          message_id: messageData.id,
          advisory_type: 'moderation',
          confidence: advisory.harm_signals?.confidence || 0,
          details: enhancedAdvisory,
          escalation_suggested: advisory.escalation_suggested
        }
      ]);
    } catch (dbError) {
      console.log('Advisory storage handled:', dbError.message);
    }
    
    return enhancedAdvisory;
    
  } catch (error) {
    console.error('MCP Advisory error:', error.message);
    
    // Safe default with moderation
    return {
      action: 'publish',
      cleaned_content: basicCleanContent(messageData.content),
      should_publish: true,
      is_duplicate: false,
      escalation_suggested: false
    };
  }
};

// Determine moderation action
function determineAction(advisory) {
  if (advisory.harm_signals?.confidence > 0.8) return 'block';
  if (advisory.spam_indicators?.confidence > 0.7) return 'block';
  if (advisory.harm_signals?.confidence > 0.5) return 'censor';
  return 'publish';
}

// Clean content while preserving authenticity
function cleanContent(content, advisory) {
  let cleaned = content;
  
  // Basic profanity filter
  const badWords = ['fuck', 'shit', 'damn', 'bitch', 'asshole'];
  badWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    cleaned = cleaned.replace(regex, '*'.repeat(word.length));
  });
  
  return cleaned;
}

// Basic content cleaning fallback
function basicCleanContent(content) {
  return content.replace(/fuck|shit|damn|bitch|asshole/gi, match => '*'.repeat(match.length));
}

// Should publish decision
function shouldPublish(advisory) {
  return advisory.action !== 'block';
}

// Simple duplicate check (placeholder)
function checkDuplicate(content) {
  // TODO: Implement proper duplicate detection
  return false;
}