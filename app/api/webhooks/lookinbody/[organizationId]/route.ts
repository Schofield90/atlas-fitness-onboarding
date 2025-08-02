import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params
  console.log(`Received LookInBody webhook for organization: ${organizationId}`)

  try {
    const adminSupabase = createAdminClient()

    // Verify organization exists
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      console.error('Organization not found:', organizationId)
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Parse webhook data
    const body = await request.json()
    console.log('Webhook payload:', JSON.stringify(body, null, 2))

    // Extract scan data (adjust based on actual LookInBody webhook format)
    const scanData = {
      scanId: body.scan_id || body.id,
      clientPhone: body.user_token || body.phone || body.member_phone,
      scanDate: body.scan_date || body.created_at || new Date().toISOString(),
      measurements: {
        weight: body.weight || body.measurements?.weight,
        bodyFatPercentage: body.body_fat_percentage || body.measurements?.body_fat_percentage,
        muscleMass: body.muscle_mass || body.measurements?.muscle_mass,
        visceralFat: body.visceral_fat || body.measurements?.visceral_fat_level,
        metabolicAge: body.metabolic_age || body.measurements?.metabolic_age,
        bodyWaterPercentage: body.body_water || body.measurements?.body_water_percentage,
        boneMass: body.bone_mass || body.measurements?.bone_mass,
        bmi: body.bmi || body.measurements?.bmi
      },
      rawData: body
    }

    // Try to match client by phone number
    let client = null
    if (scanData.clientPhone) {
      // Normalize phone number (remove spaces, add country code if needed)
      const normalizedPhone = normalizePhoneNumber(scanData.clientPhone)
      
      const { data: clients } = await adminSupabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`phone.eq.${normalizedPhone},phone.eq.${scanData.clientPhone}`)
        .single()

      client = clients
    }

    if (!client) {
      // Log unmatched scan
      await adminSupabase
        .from('unmatched_scans')
        .insert({
          organization_id: organizationId,
          phone_number: scanData.clientPhone,
          scan_data: scanData.rawData,
          webhook_received_at: new Date().toISOString()
        })

      return NextResponse.json({
        status: 'no_match',
        message: 'No client found with this phone number',
        phone: scanData.clientPhone,
        organization_id: organizationId
      })
    }

    // Save body composition measurement
    const { data: measurement, error: measurementError } = await adminSupabase
      .from('body_composition_measurements')
      .insert({
        organization_id: organizationId,
        client_id: client.id,
        lookinbody_scan_id: scanData.scanId,
        measurement_date: scanData.scanDate,
        weight_kg: scanData.measurements.weight,
        body_fat_percentage: scanData.measurements.bodyFatPercentage,
        muscle_mass_kg: scanData.measurements.muscleMass,
        visceral_fat_level: scanData.measurements.visceralFat,
        metabolic_age: scanData.measurements.metabolicAge,
        body_water_percentage: scanData.measurements.bodyWaterPercentage,
        bone_mass_kg: scanData.measurements.boneMass,
        bmi: scanData.measurements.bmi,
        raw_data: scanData.rawData
      })
      .select()
      .single()

    if (measurementError) {
      console.error('Error saving measurement:', measurementError)
      throw measurementError
    }

    // Check for health alerts
    const alerts = await checkHealthAlerts(measurement, client, organizationId, adminSupabase)

    // Log webhook processing
    await adminSupabase
      .from('webhook_logs')
      .insert({
        organization_id: organizationId,
        webhook_type: 'lookinbody',
        status: 'success',
        payload: body,
        response: {
          measurement_id: measurement.id,
          alerts_generated: alerts.length
        }
      })

    return NextResponse.json({
      status: 'success',
      measurement_id: measurement.id,
      client_id: client.id,
      alerts_generated: alerts.length,
      organization_id: organizationId
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    // Log error
    try {
      const adminSupabase = createAdminClient()
      await adminSupabase
        .from('webhook_logs')
        .insert({
          organization_id: organizationId,
          webhook_type: 'lookinbody',
          status: 'error',
          payload: await request.json().catch(() => ({})),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for testing/verification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params
  
  return NextResponse.json({
    status: 'ok',
    message: 'LookInBody webhook endpoint',
    organization_id: organizationId,
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/webhooks/lookinbody/${organizationId}`,
    instructions: 'Configure this URL in your LookInBody Web dashboard'
  })
}

// Helper function to normalize phone numbers
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // Handle UK numbers
  if (cleaned.startsWith('44')) {
    return '+' + cleaned
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // UK number without country code
    return '+44' + cleaned.substring(1)
  } else if (cleaned.length === 10) {
    // Assume UK number without leading 0
    return '+44' + cleaned
  }
  
  // Return with + if it looks like it has a country code
  if (cleaned.length > 10) {
    return '+' + cleaned
  }
  
  return phone
}

// Check for health alerts based on measurements
async function checkHealthAlerts(
  measurement: any,
  client: any,
  organizationId: string,
  supabase: any
): Promise<any[]> {
  const alerts = []

  // Get previous measurement for comparison
  const { data: previousMeasurement } = await supabase
    .from('body_composition_measurements')
    .select('*')
    .eq('client_id', client.id)
    .lt('measurement_date', measurement.measurement_date)
    .order('measurement_date', { ascending: false })
    .limit(1)
    .single()

  // Check for significant weight change
  if (previousMeasurement && measurement.weight_kg && previousMeasurement.weight_kg) {
    const weightChange = Math.abs(measurement.weight_kg - previousMeasurement.weight_kg)
    if (weightChange >= 2.0) {
      alerts.push({
        organization_id: organizationId,
        client_id: client.id,
        measurement_id: measurement.id,
        alert_type: 'significant_weight_change',
        severity: weightChange >= 5.0 ? 'high' : 'medium',
        message: `Weight changed by ${weightChange.toFixed(1)}kg since last scan`
      })
    }
  }

  // Check for high visceral fat
  if (measurement.visceral_fat_level && measurement.visceral_fat_level >= 13) {
    alerts.push({
      organization_id: organizationId,
      client_id: client.id,
      measurement_id: measurement.id,
      alert_type: 'high_visceral_fat',
      severity: measurement.visceral_fat_level >= 15 ? 'high' : 'medium',
      message: `Visceral fat level is ${measurement.visceral_fat_level} (healthy range: 1-12)`
    })
  }

  // Check for significant body fat change
  if (previousMeasurement && measurement.body_fat_percentage && previousMeasurement.body_fat_percentage) {
    const fatChange = Math.abs(measurement.body_fat_percentage - previousMeasurement.body_fat_percentage)
    if (fatChange >= 3.0) {
      alerts.push({
        organization_id: organizationId,
        client_id: client.id,
        measurement_id: measurement.id,
        alert_type: 'significant_fat_change',
        severity: fatChange >= 5.0 ? 'high' : 'medium',
        message: `Body fat changed by ${fatChange.toFixed(1)}% since last scan`
      })
    }
  }

  // Save alerts if any
  if (alerts.length > 0) {
    const { error } = await supabase
      .from('health_alerts')
      .insert(alerts)

    if (error) {
      console.error('Error saving health alerts:', error)
    }
  }

  return alerts
}