import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'

export interface ImportProgress {
  total: number
  processed: number
  success: number
  errors: number
  skipped: number
  currentItem?: string
}

export interface ImportResult {
  success: boolean
  message: string
  stats: {
    total: number
    success: number
    errors: number
    skipped: number
  }
  errors?: Array<{ row: number; error: string }>
}

interface PaymentRecord {
  'Client Name': string
  Email: string
  Date: string
  Amount: string
  'Payment Method': string
  Status: string
  Description: string
}

interface AttendanceRecord {
  'Client Name': string
  Email: string
  Date: string
  Time: string
  'Class Name': string
  Instructor: string
}

// Parse UK date format (DD/MM/YYYY)
function parseUKDate(dateStr: string): string {
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Parse amount to pennies
function parseAmount(amountStr: string): number {
  const amount = parseFloat(amountStr.replace(/[£,]/g, ''))
  return Math.round(amount * 100) // Convert to pennies
}

export class GoTeamUpImporter {
  private supabase: any
  private organizationId: string
  private onProgress?: (progress: ImportProgress) => void

  constructor(organizationId: string, onProgress?: (progress: ImportProgress) => void) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.organizationId = organizationId
    this.onProgress = onProgress
  }

  async importPayments(csvContent: string): Promise<ImportResult> {
    try {
      const parseResult = Papa.parse<PaymentRecord>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      })

      if (parseResult.errors.length > 0) {
        return {
          success: false,
          message: 'CSV parsing failed',
          stats: { total: 0, success: 0, errors: parseResult.errors.length, skipped: 0 },
          errors: parseResult.errors.map((err, idx) => ({ row: idx, error: err.message }))
        }
      }

      const payments = parseResult.data
      let successCount = 0
      let errorCount = 0
      let skippedCount = 0
      const errors: Array<{ row: number; error: string }> = []

      this.updateProgress({
        total: payments.length,
        processed: 0,
        success: 0,
        errors: 0,
        skipped: 0
      })

      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i]

        try {
          this.updateProgress({
            total: payments.length,
            processed: i,
            success: successCount,
            errors: errorCount,
            skipped: skippedCount,
            currentItem: `${payment['Client Name']} - £${payment.Amount}`
          })

          // Find client by email
          const { data: client } = await this.supabase
            .from('clients')
            .select('id')
            .eq('email', payment.Email)
            .eq('org_id', this.organizationId)
            .single()

          if (!client) {
            skippedCount++
            continue
          }

          // Check if payment already exists
          const paymentDate = parseUKDate(payment.Date)
          const amount = parseAmount(payment.Amount)

          const { data: existingPayment } = await this.supabase
            .from('payments')
            .select('id')
            .eq('client_id', client.id)
            .eq('payment_date', paymentDate)
            .eq('amount', amount)
            .single()

          if (existingPayment) {
            skippedCount++
            continue
          }

          // Insert payment
          const { error } = await this.supabase
            .from('payments')
            .insert({
              organization_id: this.organizationId,
              client_id: client.id,
              amount: amount,
              payment_date: paymentDate,
              payment_method: payment['Payment Method'].toLowerCase().replace(' ', '_'),
              payment_status: payment.Status.toLowerCase(),
              description: payment.Description,
              payment_type: 'membership',
              created_at: new Date().toISOString()
            })

          if (error) {
            errorCount++
            errors.push({ row: i + 1, error: error.message })
          } else {
            successCount++
          }
        } catch (error) {
          errorCount++
          errors.push({ row: i + 1, error: (error as Error).message })
        }
      }

      this.updateProgress({
        total: payments.length,
        processed: payments.length,
        success: successCount,
        errors: errorCount,
        skipped: skippedCount
      })

      return {
        success: errorCount === 0,
        message: `Import completed: ${successCount} payments imported, ${skippedCount} skipped, ${errorCount} errors`,
        stats: {
          total: payments.length,
          success: successCount,
          errors: errorCount,
          skipped: skippedCount
        },
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${(error as Error).message}`,
        stats: { total: 0, success: 0, errors: 1, skipped: 0 }
      }
    }
  }

  async importAttendance(csvContent: string): Promise<ImportResult> {
    try {
      const parseResult = Papa.parse<AttendanceRecord>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      })

      if (parseResult.errors.length > 0) {
        return {
          success: false,
          message: 'CSV parsing failed',
          stats: { total: 0, success: 0, errors: parseResult.errors.length, skipped: 0 },
          errors: parseResult.errors.map((err, idx) => ({ row: idx, error: err.message }))
        }
      }

      const attendances = parseResult.data
      let successCount = 0
      let errorCount = 0
      let skippedCount = 0
      const errors: Array<{ row: number; error: string }> = []

      this.updateProgress({
        total: attendances.length,
        processed: 0,
        success: 0,
        errors: 0,
        skipped: 0
      })

      for (let i = 0; i < attendances.length; i++) {
        const attendance = attendances[i]

        try {
          this.updateProgress({
            total: attendances.length,
            processed: i,
            success: successCount,
            errors: errorCount,
            skipped: skippedCount,
            currentItem: `${attendance['Client Name']} - ${attendance['Class Name']}`
          })

          // Find client by email
          const { data: client } = await this.supabase
            .from('clients')
            .select('id')
            .eq('email', attendance.Email)
            .eq('org_id', this.organizationId)
            .single()

          if (!client) {
            skippedCount++
            continue
          }

          // Check if attendance already exists
          const bookingDate = parseUKDate(attendance.Date)
          const bookingTime = attendance.Time

          const { data: existingBooking } = await this.supabase
            .from('class_bookings')
            .select('id')
            .eq('client_id', client.id)
            .eq('booking_date', bookingDate)
            .eq('booking_time', bookingTime)
            .single()

          if (existingBooking) {
            skippedCount++
            continue
          }

          // Insert attendance as class booking
          const attendedAt = `${bookingDate}T${bookingTime}:00`

          const { error } = await this.supabase
            .from('class_bookings')
            .insert({
              organization_id: this.organizationId,
              client_id: client.id,
              customer_id: client.id,
              booking_date: bookingDate,
              booking_time: bookingTime,
              booking_status: 'completed',
              booking_type: 'attendance_import',
              attended_at: attendedAt,
              notes: `${attendance['Class Name']} - ${attendance.Instructor}`,
              payment_status: 'succeeded',
              created_at: new Date().toISOString()
            })

          if (error) {
            errorCount++
            errors.push({ row: i + 1, error: error.message })
          } else {
            successCount++
          }
        } catch (error) {
          errorCount++
          errors.push({ row: i + 1, error: (error as Error).message })
        }
      }

      this.updateProgress({
        total: attendances.length,
        processed: attendances.length,
        success: successCount,
        errors: errorCount,
        skipped: skippedCount
      })

      return {
        success: errorCount === 0,
        message: `Import completed: ${successCount} attendance records imported, ${skippedCount} skipped, ${errorCount} errors`,
        stats: {
          total: attendances.length,
          success: successCount,
          errors: errorCount,
          skipped: skippedCount
        },
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${(error as Error).message}`,
        stats: { total: 0, success: 0, errors: 1, skipped: 0 }
      }
    }
  }

  private updateProgress(progress: ImportProgress) {
    if (this.onProgress) {
      this.onProgress(progress)
    }
  }

  // Auto-detect file type based on CSV headers
  static detectFileType(csvContent: string): 'payments' | 'attendance' | 'unknown' {
    const lines = csvContent.split('\n')
    if (lines.length === 0) return 'unknown'

    const headers = lines[0].toLowerCase()

    if (headers.includes('payment method') || headers.includes('amount')) {
      return 'payments'
    }

    if (headers.includes('class name') || headers.includes('instructor')) {
      return 'attendance'
    }

    return 'unknown'
  }
}