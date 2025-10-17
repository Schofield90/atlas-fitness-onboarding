import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAuth } from '@/app/lib/api/auth-check'

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY FIX: Require authentication
    const user = await requireAuth()

    // ✅ SECURITY FIX: Require admin or owner role
    if (!['owner', 'admin', 'super_admin'].includes(user.role)) {
      console.warn(
        `[Dedupe API] Unauthorized access attempt by user ${user.id} with role ${user.role}`
      )
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // ✅ SECURITY FIX: Scope to user's organization only
    const organizationId = user.organizationId

    const supabase = await createAdminClient()

    // Find duplicate emails across clients (case-insensitive) within the same org
    // ✅ SECURITY FIX: Filter by organization_id
    const { data: allClients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
    if (error) throw error

    const orgEmailToPrimary: Record<string, any> = {}
    const duplicates: { primary: any, dup: any }[] = []

    for (const c of allClients || []) {
      const orgId = c.organization_id || c.org_id
      const emailKey = `${orgId}::${(c.email || '').toLowerCase().trim()}`
      if (!orgId || !emailKey.endsWith('::')) {
        // Skip if org or email missing
        continue
      }
      if (!orgEmailToPrimary[emailKey]) {
        orgEmailToPrimary[emailKey] = c
      } else {
        const existing = orgEmailToPrimary[emailKey]
        const existingDate = new Date(existing.updated_at || existing.created_at || 0)
        const currentDate = new Date(c.updated_at || c.created_at || 0)
        if (currentDate > existingDate) {
          orgEmailToPrimary[emailKey] = c
          duplicates.push({ primary: c, dup: existing })
        } else {
          duplicates.push({ primary: existing, dup: c })
        }
      }
    }

    // For each duplicate, reassign foreign keys we know about and archive dup
    for (const { primary, dup } of duplicates) {
      const primaryId = primary.id
      const dupId = dup.id
      // ✅ SECURITY FIX: Add organization_id filter to all updates
      // bookings
      await supabase
        .from('bookings')
        .update({ client_id: primaryId, customer_id: primaryId })
        .eq('organization_id', organizationId)
        .or(`client_id.eq.${dupId},customer_id.eq.${dupId}`)
      // customer_memberships
      await supabase
        .from('customer_memberships')
        .update({ customer_id: primaryId })
        .eq('organization_id', organizationId)
        .or(`customer_id.eq.${dupId},client_id.eq.${dupId}`)
      // payment_transactions
      await supabase
        .from('payment_transactions')
        .update({ client_id: primaryId, customer_id: primaryId })
        .eq('organization_id', organizationId)
        .or(`client_id.eq.${dupId},customer_id.eq.${dupId}`)
      // emergency_contacts, medical, family members (best-effort)
      await supabase
        .from('emergency_contacts')
        .update({ client_id: primaryId })
        .eq('organization_id', organizationId)
        .eq('client_id', dupId)
      await supabase
        .from('customer_medical_info')
        .update({ client_id: primaryId })
        .eq('organization_id', organizationId)
        .eq('client_id', dupId)
      await supabase
        .from('customer_family_members')
        .update({ primary_client_id: primaryId })
        .eq('organization_id', organizationId)
        .eq('primary_client_id', dupId)
      await supabase
        .from('customer_family_members')
        .update({ family_member_client_id: primaryId })
        .eq('organization_id', organizationId)
        .eq('family_member_client_id', dupId)
      // Archive duplicate client
      await supabase
        .from('clients')
        .update({
          status: 'inactive',
          metadata: {
            ...(dup.metadata || {}),
            archived_as_duplicate_of: primaryId,
            archived_at: new Date().toISOString()
          }
        })
        .eq('organization_id', organizationId)
        .eq('id', dupId)
    }

    return NextResponse.json({ success: true, merged: duplicates.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

