-- Fix subscription UPSERT logic in webhook
-- The current handlers only update partial fields, causing data loss

-- PROBLEM: Current UPSERT overwrites entire row with partial data
-- SOLUTION: Use UPDATE with WHERE clause, or fetch existing data first

-- Example of the issue:
-- User has: regions=['KZN', 'WC'], categories=['Education', 'Safety']
-- User updates categories to ['Health']
-- Current UPSERT: regions=NULL, categories=['Health'] ← DATA LOSS!

-- Fixed approach needed in webhook handlers:

/*
async function handleCategorySelection(phoneNumber: string, categoryString: string, supabase: any) {
  try {
    // ... category mapping logic ...
    
    // FIXED: Get existing subscription first
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()
    
    // FIXED: Preserve existing data while updating categories
    await supabase
      .from('subscriptions')
      .upsert({
        phone_number: phoneNumber,
        categories: selectedCategories,
        regions: existing?.regions || ['National'], // ← PRESERVE
        language: existing?.language || 'eng',      // ← PRESERVE
        opted_in: true,
        last_activity: new Date().toISOString(),
        // Preserve other fields...
        opted_in_at: existing?.opted_in_at || new Date().toISOString(),
        consent_timestamp: existing?.consent_timestamp || new Date().toISOString(),
        consent_method: existing?.consent_method || 'whatsapp_optin'
      }, { onConflict: 'phone_number' })
  } catch (error) {
    console.error('Category selection error:', error)
  }
}

async function handleRegionSelection(phoneNumber: string, regionString: string, supabase: any) {
  try {
    // ... region mapping logic ...
    
    // FIXED: Get existing subscription first
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()
    
    // FIXED: Preserve existing data while updating regions
    await supabase
      .from('subscriptions')
      .upsert({
        phone_number: phoneNumber,
        regions: selectedRegions,
        categories: existing?.categories || ['Education', 'Safety', 'Opportunity'], // ← PRESERVE
        language: existing?.language || 'eng',      // ← PRESERVE
        opted_in: true,
        last_activity: new Date().toISOString(),
        // Preserve other fields...
        opted_in_at: existing?.opted_in_at || new Date().toISOString(),
        consent_timestamp: existing?.consent_timestamp || new Date().toISOString(),
        consent_method: existing?.consent_method || 'whatsapp_optin'
      }, { onConflict: 'phone_number' })
  } catch (error) {
    console.error('Region selection error:', error)
  }
}
*/