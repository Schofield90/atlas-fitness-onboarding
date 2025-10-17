import { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export interface SecureDeleteOptions {
  table: string
  id: string
  organizationId: string
  supabase: SupabaseClient
}

export interface SecureDeleteResult {
  success: boolean
  error?: string
  status: number
}

/**
 * Securely delete a record after verifying organization ownership
 * This prevents users from deleting data from other organizations
 */
export async function secureDelete({
  table,
  id,
  organizationId,
  supabase
}: SecureDeleteOptions): Promise<SecureDeleteResult> {
  try {
    // First, verify the record exists and belongs to the user's organization
    const { data: existingRecord, error: selectError } = await supabase
      .from(table)
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (selectError || !existingRecord) {
      // Return 404 for both "not found" and "not authorized" to avoid information leakage
      return {
        success: false,
        error: 'Record not found',
        status: 404
      }
    }

    // Now safe to delete - include organization_id in WHERE clause for extra safety
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (deleteError) {
      console.error(`Error deleting from ${table}:`, deleteError)
      return {
        success: false,
        error: 'Failed to delete record',
        status: 500
      }
    }

    return {
      success: true,
      status: 200
    }
  } catch (error) {
    console.error(`Unexpected error in secureDelete for ${table}:`, error)
    return {
      success: false,
      error: 'An unexpected error occurred',
      status: 500
    }
  }
}

export interface SecureUpdateOptions<T = any> {
  table: string
  id: string
  organizationId: string
  data: T
  supabase: SupabaseClient
}

export interface SecureUpdateResult<T = any> {
  success: boolean
  data?: T
  error?: string
  status: number
}

/**
 * Securely update a record after verifying organization ownership
 * This prevents users from updating data from other organizations
 */
export async function secureUpdate<T = any>({
  table,
  id,
  organizationId,
  data,
  supabase
}: SecureUpdateOptions<T>): Promise<SecureUpdateResult<T>> {
  try {
    // First, verify the record exists and belongs to the user's organization
    const { data: existingRecord, error: selectError } = await supabase
      .from(table)
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (selectError || !existingRecord) {
      // Return 404 for both "not found" and "not authorized" to avoid information leakage
      return {
        success: false,
        error: 'Record not found',
        status: 404
      }
    }

    // Now safe to update - include organization_id in WHERE clause for extra safety
    const { data: updatedRecord, error: updateError } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (updateError) {
      console.error(`Error updating ${table}:`, updateError)
      return {
        success: false,
        error: 'Failed to update record',
        status: 500
      }
    }

    return {
      success: true,
      data: updatedRecord,
      status: 200
    }
  } catch (error) {
    console.error(`Unexpected error in secureUpdate for ${table}:`, error)
    return {
      success: false,
      error: 'An unexpected error occurred',
      status: 500
    }
  }
}

/**
 * Create a NextResponse for delete/update results
 */
export function createSecureResponse<T = any>(result: SecureDeleteResult | SecureUpdateResult<T>) {
  if (result.success) {
    if ('data' in result && result.data) {
      return NextResponse.json({ data: result.data }, { status: result.status })
    }
    return new NextResponse(null, { status: 204 }) // No content for successful delete
  }

  return NextResponse.json(
    { error: result.error },
    { status: result.status }
  )
}