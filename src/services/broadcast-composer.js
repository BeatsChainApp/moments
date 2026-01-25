// Broadcast Composition Service - Standardized message formatting
// Integrates attribution, content, and footer per governance standards

import { supabase } from '../config/supabase.js';
import { buildAttributionBlock, buildFooter, generateAttributionMetadata } from './attribution.js';

/**
 * Compose complete Moment message with attribution and footer
 * @param {string} momentId - Moment UUID
 * @returns {Promise<string>} Formatted message ready for broadcast
 */
export async function composeMomentMessage(momentId) {
  const { data: moment, error } = await supabase
    .from('moments')
    .select(`
      *,
      creator:created_by(role, organization),
      sponsor:sponsor_id(name, display_name, website)
    `)
    .eq('id', momentId)
    .single();
  
  if (error) throw error;
  
  // Ensure slug exists
  if (!moment.slug) {
    const slug = generateSlug(moment.title, moment.id);
    await supabase.from('moments').update({ slug }).eq('id', momentId);
    moment.slug = slug;
  }
  
  // Generate and store attribution metadata
  const attributionMetadata = generateAttributionMetadata(moment.creator, moment.sponsor);
  await supabase
    .from('moments')
    .update({ attribution_data: attributionMetadata })
    .eq('id', momentId);
  
  // Build message components
  const attribution = buildAttributionBlock(moment, moment.creator, moment.sponsor);
  const content = moment.content.trim();
  const canonicalUrl = `https://moments.unamifoundation.org/moments/${moment.slug}`;
  const footer = buildFooter(canonicalUrl, moment.sponsor);
  
  return attribution + content + footer;
}

/**
 * Generate slug from title and ID
 * @param {string} title - Moment title
 * @param {string} id - Moment UUID
 * @returns {string} Kebab-case slug with hash
 */
function generateSlug(title, id) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
  
  slug += '-' + id.substring(0, 6);
  return slug;
}
