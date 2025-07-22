import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    // Validate the configuration
    if (!config.selectedPages || config.selectedPages.length === 0) {
      return NextResponse.json(
        { error: 'At least one page must be selected' },
        { status: 400 }
      )
    }
    
    if (!config.selectedForms || config.selectedForms.length === 0) {
      return NextResponse.json(
        { error: 'At least one lead form must be selected' },
        { status: 400 }
      )
    }
    
    // Get the Facebook user data from cookie
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('fb_token_data')
    
    if (!tokenCookie?.value) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 401 }
      )
    }
    
    const tokenData = JSON.parse(tokenCookie.value)
    const userId = tokenData.user_id
    
    // In a real app, you would save this configuration to a database
    // For now, we'll store it in a cookie (not ideal for production)
    const configData = {
      user_id: userId,
      selected_pages: config.selectedPages,
      selected_ad_accounts: config.selectedAdAccounts,
      selected_forms: config.selectedForms,
      sync_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Store configuration in cookie (in production, use a database)
    cookieStore.set('fb_sync_config', JSON.stringify(configData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 24 * 60 * 60, // 60 days
      path: '/'
    })
    
    console.log('💾 Saved Facebook sync configuration:', {
      pages: config.selectedPages.length,
      adAccounts: config.selectedAdAccounts.length,
      forms: config.selectedForms.length
    })
    
    // In a real app, you would trigger the initial lead sync here
    // await triggerLeadSync(config.selectedForms)
    
    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: {
        pages_count: config.selectedPages.length,
        ad_accounts_count: config.selectedAdAccounts.length,
        forms_count: config.selectedForms.length
      }
    })
    
  } catch (error) {
    console.error('❌ Error saving Facebook configuration:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to save configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}