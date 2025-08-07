import { NextRequest, NextResponse } from 'next/server'
import { handleApiRoute, supabaseAdmin, parseSearchParams } from '@/lib/api/middleware'
import { z } from 'zod'
import { requireAuth, createOrgScopedClient } from '@/lib/auth-middleware'

const birthdayQuerySchema = z.object({
  days_ahead: z.string().optional().transform((val) => val ? parseInt(val) : 30),
  include_past: z.string().optional().transform((val) => val === 'true')
})

export async function GET(request: NextRequest) {
  // Authentication check
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    const params = parseSearchParams(request, birthdayQuerySchema)
    const { days_ahead, include_past } = params

    // Calculate date range for birthdays
    const today = new Date()
    const startDate = include_past ? new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)) : today // 7 days ago if including past
    const endDate = new Date(today.getTime() + (days_ahead * 24 * 60 * 60 * 1000))

    // Query birthday reminders for the organization
    const { data: birthdayReminders, error } = await supabaseAdmin
      .from('birthday_reminders')
      .select(`
        id,
        birth_date,
        birth_year,
        reminder_enabled,
        reminder_days_before,
        custom_message,
        last_reminder_sent,
        next_reminder_date,
        created_at,
        contacts:contacts(
          id,
          first_name,
          last_name,
          email,
          phone,
          lead_id,
          client_id
        )
      `)
      .eq('organization_id', user.organization_id)
      .eq('reminder_enabled', true)

    if (error) {
      throw new Error('Failed to fetch contacts with birthdays')
    }

    // Process birthdays and filter by date range
    const contactsWithUpcomingBirthdays = birthdayReminders
      ?.map(reminder => {
        const contact = Array.isArray(reminder.contacts) ? reminder.contacts[0] : reminder.contacts
        if (!contact || !reminder.birth_date) return null

        const birthDate = new Date(reminder.birth_date)
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        
        // If birthday already passed this year, check next year
        const nextBirthday = thisYearBirthday < today 
          ? new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate())
          : thisYearBirthday

        const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

        const ageTurning = reminder.birth_year 
          ? today.getFullYear() - reminder.birth_year + (thisYearBirthday < today ? 1 : 0)
          : null

        return {
          id: contact.id,
          reminder_id: reminder.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          birth_date: reminder.birth_date,
          birth_year: reminder.birth_year,
          next_birthday: nextBirthday.toISOString().split('T')[0],
          days_until_birthday: daysUntilBirthday,
          age_turning: ageTurning,
          custom_message: reminder.custom_message,
          reminder_days_before: reminder.reminder_days_before,
          last_reminder_sent: reminder.last_reminder_sent,
          lead_id: contact.lead_id,
          client_id: contact.client_id,
          type: contact.lead_id ? 'lead' : (contact.client_id ? 'client' : 'contact')
        }
      })
      .filter((contact): contact is NonNullable<typeof contact> => {
        if (!contact) return false
        
        // Filter by date range
        if (include_past) {
          return contact.days_until_birthday >= -7 && contact.days_until_birthday <= days_ahead
        } else {
          return contact.days_until_birthday >= 0 && contact.days_until_birthday <= days_ahead
        }
      })
      .sort((a, b) => a.days_until_birthday - b.days_until_birthday)

    return NextResponse.json({
      contacts: contactsWithUpcomingBirthdays,
      total: contactsWithUpcomingBirthdays.length,
      date_range: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        days_ahead
      }
    })
  })
}