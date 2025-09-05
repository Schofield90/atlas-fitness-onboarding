#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET

async function syncFacebookLeadForms() {
  console.log('🔧 Fixing Facebook Lead Forms Sync\n')
  
  try {
    // Step 1: Get the active Facebook integration
    console.log('Step 1: Getting active Facebook integration...')
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('is_active', true)
      .single()
    
    if (intError || !integration) {
      console.error('❌ No active Facebook integration found')
      return
    }
    
    console.log('✅ Found integration for:', integration.facebook_user_name)
    console.log('   Organization ID:', integration.organization_id)
    
    // Step 2: Get the primary page or first active page
    console.log('\nStep 2: Getting primary Facebook page...')
    const { data: pages, error: pageError } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('integration_id', integration.id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
    
    if (pageError || !pages || pages.length === 0) {
      console.error('❌ No active Facebook pages found')
      return
    }
    
    const primaryPage = pages[0]
    console.log('✅ Using page:', primaryPage.page_name)
    console.log('   Page ID:', primaryPage.facebook_page_id)
    
    // Step 3: Fetch lead forms from Facebook API
    console.log('\nStep 3: Fetching lead forms from Facebook...')
    const accessToken = primaryPage.page_access_token || integration.access_token
    
    if (!accessToken) {
      console.error('❌ No access token available')
      return
    }
    
    const formsUrl = `https://graph.facebook.com/v18.0/${primaryPage.facebook_page_id}/leadgen_forms?access_token=${accessToken}&limit=100`
    
    try {
      const response = await fetch(formsUrl)
      const data = await response.json()
      
      if (data.error) {
        console.error('❌ Facebook API error:', data.error.message)
        return
      }
      
      if (!data.data || data.data.length === 0) {
        console.log('⚠️  No lead forms found on this page')
        console.log('   Create lead forms in Facebook Ads Manager first')
        return
      }
      
      console.log(`✅ Found ${data.data.length} lead form(s)`)
      
      // Step 4: Fetch detailed info for each form
      console.log('\nStep 4: Fetching form details and questions...')
      const detailedForms = []
      
      for (const form of data.data) {
        console.log(`\n   Fetching details for: ${form.name}`)
        
        // Get form details including questions
        const formDetailsUrl = `https://graph.facebook.com/v18.0/${form.id}?fields=id,name,status,questions,created_time,leads_count&access_token=${accessToken}`
        
        try {
          const detailResponse = await fetch(formDetailsUrl)
          const formDetails = await detailResponse.json()
          
          if (formDetails.error) {
            console.error(`   ❌ Error fetching form ${form.id}:`, formDetails.error.message)
            continue
          }
          
          console.log(`   ✅ Got details for: ${formDetails.name}`)
          console.log(`      - Status: ${formDetails.status || 'UNKNOWN'}`)
          console.log(`      - Questions: ${formDetails.questions ? formDetails.questions.length : 0}`)
          console.log(`      - Leads count: ${formDetails.leads_count || 0}`)
          
          detailedForms.push({
            facebook_form_id: formDetails.id,
            form_name: formDetails.name,
            form_status: formDetails.status || 'ACTIVE',
            questions: formDetails.questions || [],
            leads_count: formDetails.leads_count || 0,
            created_time: formDetails.created_time,
            organization_id: integration.organization_id,
            facebook_page_id: primaryPage.facebook_page_id,
            page_id: primaryPage.id,
            is_active: true,
            auto_sync_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        } catch (error) {
          console.error(`   ❌ Failed to fetch details for form ${form.id}:`, error.message)
        }
      }
      
      if (detailedForms.length === 0) {
        console.log('\n❌ No forms could be fetched successfully')
        return
      }
      
      // Step 5: Save forms to database
      console.log(`\nStep 5: Saving ${detailedForms.length} form(s) to database...`)
      
      // First, deactivate all existing forms for this organization
      await supabase
        .from('facebook_lead_forms')
        .update({ is_active: false })
        .eq('organization_id', integration.organization_id)
      
      // Save each form
      for (const form of detailedForms) {
        console.log(`\n   Saving form: ${form.form_name}`)
        
        // Try to upsert
        const { data: savedForm, error: saveError } = await supabase
          .from('facebook_lead_forms')
          .upsert(form, {
            onConflict: 'organization_id,facebook_form_id',
            ignoreDuplicates: false
          })
          .select()
          .single()
        
        if (saveError) {
          // If upsert fails, try insert then update
          const { error: insertError } = await supabase
            .from('facebook_lead_forms')
            .insert(form)
          
          if (insertError && insertError.code === '23505') {
            // Duplicate, so update
            const { error: updateError } = await supabase
              .from('facebook_lead_forms')
              .update({
                form_name: form.form_name,
                form_status: form.form_status,
                questions: form.questions,
                leads_count: form.leads_count,
                is_active: true,
                auto_sync_enabled: true,
                updated_at: new Date().toISOString()
              })
              .eq('organization_id', form.organization_id)
              .eq('facebook_form_id', form.facebook_form_id)
            
            if (updateError) {
              console.error(`   ❌ Failed to save form:`, updateError.message)
            } else {
              console.log(`   ✅ Updated existing form`)
            }
          } else if (insertError) {
            console.error(`   ❌ Failed to insert form:`, insertError.message)
          } else {
            console.log(`   ✅ Inserted new form`)
          }
        } else {
          console.log(`   ✅ Saved form successfully`)
        }
        
        // Auto-detect field mappings for this form
        console.log(`   🔄 Auto-detecting field mappings...`)
        if (form.questions && form.questions.length > 0) {
          const mappings = autoDetectMappings(form.questions)
          
          if (mappings.length > 0) {
            const fieldMappingData = {
              version: '1.0',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              mappings: mappings,
              custom_mappings: [],
              auto_create_contact: true,
              default_lead_source: 'Facebook Lead Form'
            }
            
            // Save field mappings
            await supabase
              .from('facebook_lead_forms')
              .update({
                field_mappings: fieldMappingData,
                updated_at: new Date().toISOString()
              })
              .eq('organization_id', form.organization_id)
              .eq('facebook_form_id', form.facebook_form_id)
            
            console.log(`   ✅ Saved ${mappings.length} auto-detected field mappings`)
          }
        }
      }
      
      // Step 6: Summary
      console.log('\n' + '='.repeat(50))
      console.log('✅ Facebook Lead Forms Sync Complete!')
      console.log(`   - Forms synced: ${detailedForms.length}`)
      console.log(`   - Organization: ${integration.organization_id}`)
      console.log(`   - Page: ${primaryPage.page_name}`)
      console.log('\n💡 Next steps:')
      console.log('   1. Go to /settings/integrations/facebook')
      console.log('   2. Review the synced forms')
      console.log('   3. Configure field mappings if needed')
      console.log('   4. Enable real-time sync (webhooks)')
      
    } catch (error) {
      console.error('❌ Failed to fetch forms from Facebook:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

// Helper function to auto-detect field mappings
function autoDetectMappings(questions) {
  const mappings = []
  
  const fieldMap = {
    // Direct matches
    'email': 'email',
    'EMAIL': 'email',
    'email_address': 'email',
    'phone': 'phone',
    'PHONE': 'phone',
    'phone_number': 'phone',
    'mobile': 'phone',
    'first_name': 'first_name',
    'FIRST_NAME': 'first_name',
    'last_name': 'last_name',
    'LAST_NAME': 'last_name',
    'full_name': 'full_name',
    'FULL_NAME': 'full_name',
    'city': 'city',
    'CITY': 'city',
    'postcode': 'postcode',
    'POSTCODE': 'postcode',
    'postal_code': 'postcode',
    'ZIP': 'postcode',
    'ZIP_CODE': 'postcode',
    
    // Common variations
    'nombre': 'first_name',
    'apellido': 'last_name',
    'correo': 'email',
    'telefono': 'phone',
    'empresa': 'company',
    'company': 'company',
    'business': 'company',
    'address': 'address',
    'street': 'address',
    'message': 'notes',
    'comments': 'notes',
    'notes': 'notes'
  }
  
  questions.forEach(question => {
    const fbField = question.key || question.id
    const fbLabel = question.label || question.name || ''
    const fbType = question.type || 'SHORT_ANSWER'
    
    // Try to find CRM field mapping
    let crmField = null
    
    // Check direct mapping by key
    if (fieldMap[fbField]) {
      crmField = fieldMap[fbField]
    } 
    // Check by label (case-insensitive)
    else {
      const labelLower = fbLabel.toLowerCase()
      for (const [pattern, field] of Object.entries(fieldMap)) {
        if (labelLower.includes(pattern.toLowerCase())) {
          crmField = field
          break
        }
      }
    }
    
    // If we found a mapping, add it
    if (crmField) {
      mappings.push({
        id: `map_${Date.now()}_${Math.random()}`,
        facebook_field_name: fbField,
        facebook_field_label: fbLabel,
        facebook_field_type: fbType,
        crm_field: crmField,
        crm_field_type: 'standard',
        is_required: question.required || false,
        auto_detected: true
      })
    }
  })
  
  return mappings
}

// Run the sync
syncFacebookLeadForms().catch(console.error)