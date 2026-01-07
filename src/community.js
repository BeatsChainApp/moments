import { supabase } from '../config/supabase.js';
import { callMCPAdvisory } from './advisory.js';

// Process community messages into moments
export async function processUserMessage(messageId) {
  try {
    // Get message with advisory
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(`
        *,
        advisories(*)
      `)
      .eq('id', messageId)
      .single();

    if (msgError || !message) return null;

    // Skip if already processed or no content
    if (message.processed || !message.content?.trim()) return null;

    // Get or create MCP advisory
    let advisory = message.advisories?.[0];
    if (!advisory) {
      advisory = await callMCPAdvisory(message);
    }

    // Auto-publish if safe (confidence < 0.7 for harmful content)
    const shouldPublish = !advisory?.escalation_suggested && 
                         (advisory?.confidence || 0) < 0.7;

    if (shouldPublish) {
      // Create community moment
      const { data: moment, error: momentError } = await supabase
        .from('moments')
        .insert({
          title: generateTitle(message.content),
          content: message.content,
          region: detectRegion(message.content) || 'National',
          category: detectCategory(message.content) || 'Community',
          language: message.language_detected || 'eng',
          status: 'broadcasted',
          broadcasted_at: new Date().toISOString(),
          created_by: 'community',
          source_message_id: message.id,
          is_sponsored: false
        })
        .select()
        .single();

      if (!momentError && moment) {
        // Mark message as processed
        await supabase
          .from('messages')
          .update({ processed: true })
          .eq('id', messageId);

        return moment;
      }
    }

    return null;
  } catch (error) {
    console.error('Community processing error:', error);
    return null;
  }
}

// Generate title from content
function generateTitle(content) {
  const words = content.trim().split(' ');
  if (words.length <= 8) return content;
  return words.slice(0, 8).join(' ') + '...';
}

// Simple region detection
function detectRegion(content) {
  const regions = {
    'KZN': ['durban', 'pietermaritzburg', 'kwazulu', 'natal'],
    'WC': ['cape town', 'western cape', 'stellenbosch'],
    'GP': ['johannesburg', 'pretoria', 'soweto', 'gauteng'],
    'EC': ['east london', 'port elizabeth', 'eastern cape'],
    'FS': ['bloemfontein', 'free state'],
    'LP': ['polokwane', 'limpopo'],
    'MP': ['nelspruit', 'mpumalanga'],
    'NC': ['kimberley', 'northern cape'],
    'NW': ['mahikeng', 'north west']
  };

  const lowerContent = content.toLowerCase();
  for (const [region, keywords] of Object.entries(regions)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      return region;
    }
  }
  return null;
}

// Simple category detection
function detectCategory(content) {
  const categories = {
    'Safety': ['crime', 'police', 'danger', 'theft', 'robbery', 'accident'],
    'Health': ['hospital', 'clinic', 'doctor', 'medicine', 'sick', 'health'],
    'Education': ['school', 'university', 'college', 'learn', 'study', 'education'],
    'Opportunity': ['job', 'work', 'employment', 'business', 'opportunity'],
    'Events': ['event', 'meeting', 'celebration', 'festival', 'gathering'],
    'Culture': ['culture', 'tradition', 'heritage', 'community', 'celebration']
  };

  const lowerContent = content.toLowerCase();
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      return category;
    }
  }
  return 'Community';
}