'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, Clock, MapPin, User, Users, Check, 
  AlertCircle, ChevronLeft, ChevronRight, Loader2,
  Video, Phone, Coffee, Zap, Target, Award
} from 'lucide-react'
import { format, parseISO, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isBefore } from 'date-fns'
import Button from '@/app/components/ui/Button'

interface BookingWidgetProps {
  slug: string
  embedded?: boolean
  className?: string
}

interface BookingLinkDetails {
  booking_link: {
    id: string
    slug: string
    name: string
    description?: string
    meeting_location: {
      type: 'in_person' | 'video_call' | 'phone' | 'custom'
      details?: string
      zoom_link?: string
    }
    style_settings: {
      primary_color: string
      background_color: string
      text_color?: string
      logo_url?: string
      custom_css?: string
    }
    payment_settings: {
      enabled: boolean
      amount: number
      currency: string
      description?: string
    }
    cancellation_policy: {
      allowed: boolean
      hours_before: number
      policy_text: string
    }
    form_configuration: {
      fields: FormField[]
      consent_text: string
    }
    confirmation_settings: {
      auto_confirm: boolean
      custom_message?: string
    }
  }
  appointment_types: AppointmentType[]
  form_fields: FormField[]
  organization: {
    name?: string
    logo_url?: string
  }
  equipment_requirements: EquipmentRequirement[]
  assigned_staff: StaffMember[]
}

interface AppointmentType {
  id: string
  name: string
  description?: string
  duration_minutes: number
  session_type: string
  max_capacity: number
  fitness_level?: string
  price_pennies: number
}

interface FormField {
  id: string
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio'
  options?: string[]
  required: boolean
  placeholder?: string
}

interface AvailableSlot {
  start_time: string
  end_time: string
  staff_id?: string
  staff_name?: string
  appointment_type_id: string
  appointment_type_name: string
  duration_minutes: number
}

interface StaffMember {
  id: string
  full_name: string
  avatar_url?: string
  title?: string
  specializations?: Array<{
    type: string
    certification: string
    active: boolean
  }>
}

interface EquipmentRequirement {
  name: string
  type: string
  required: boolean
  alternatives: string[]
}

type Step = 'service' | 'staff' | 'datetime' | 'form' | 'payment' | 'confirmation'

export default function BookingWidget({ slug, embedded = false, className = '' }: BookingWidgetProps) {
  const [step, setStep] = useState<Step>('service')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [details, setDetails] = useState<BookingLinkDetails | null>(null)
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [availability, setAvailability] = useState<{ date: string; slots: AvailableSlot[] }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    consent: false
  })

  const [bookingResult, setBookingResult] = useState<{
    success: boolean
    message: string
    confirmation_token?: string
  } | null>(null)

  useEffect(() => {
    fetchBookingDetails()
  }, [slug])

  useEffect(() => {
    if (details && selectedAppointmentType) {
      fetchAvailability()
    }
  }, [details, selectedAppointmentType, currentWeek])

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/booking-links/${slug}/details`)
      if (!response.ok) throw new Error('Booking link not found')
      
      const data = await response.json()
      setDetails(data)
      
      // Auto-select appointment type if only one available
      if (data.appointment_types.length === 1) {
        setSelectedAppointmentType(data.appointment_types[0])
        setStep('staff')
      }
    } catch (error) {
      console.error('Error fetching booking details:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async () => {
    if (!selectedAppointmentType) return
    
    setLoadingSlots(true)
    try {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
      
      const params = new URLSearchParams({
        start_date: weekStart.toISOString().split('T')[0],
        end_date: weekEnd.toISOString().split('T')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      
      const response = await fetch(`/api/booking-links/${slug}/availability?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data.availability || [])
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot || !selectedAppointmentType) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/booking-links/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_type_id: selectedAppointmentType.id,
          start_time: selectedSlot.start_time,
          staff_id: selectedSlot.staff_id,
          attendee_name: formData.name,
          attendee_email: formData.email,
          attendee_phone: formData.phone,
          notes: formData.notes,
          custom_fields: Object.fromEntries(
            details?.form_fields.map(field => [field.name, formData[field.name]]) || []
          ),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }

      setBookingResult({
        success: true,
        message: result.message,
        confirmation_token: result.booking.confirmation_token
      })
      setStep('confirmation')

      // Redirect if configured
      if (result.redirect_url) {
        setTimeout(() => {
          window.location.href = result.redirect_url
        }, 3000)
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      setBookingResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create booking'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'video_call': return <Video className="w-4 h-4" />
      case 'phone': return <Phone className="w-4 h-4" />
      default: return <MapPin className="w-4 h-4" />
    }
  }

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'personal_training': return <Target className="w-4 h-4" />
      case 'group_class': return <Users className="w-4 h-4" />
      case 'assessment': return <Zap className="w-4 h-4" />
      case 'nutrition_consult': return <Award className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!details) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-red-900">Booking Link Not Available</h3>
        <p className="text-red-700">This booking link may have been removed or is no longer active.</p>
      </div>
    )
  }

  const { booking_link, appointment_types, organization, assigned_staff } = details
  const primaryColor = booking_link.style_settings.primary_color
  const backgroundColor = booking_link.style_settings.background_color

  return (
    <div 
      className={`booking-widget ${className}`}
      style={{ 
        backgroundColor,
        color: booking_link.style_settings.text_color || '#1f2937'
      }}
    >
      {/* Custom CSS */}
      {booking_link.style_settings.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: booking_link.style_settings.custom_css }} />
      )}

      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          {(booking_link.style_settings.logo_url || organization.logo_url) && (
            <img
              src={booking_link.style_settings.logo_url || organization.logo_url}
              alt={organization.name || 'Logo'}
              className="h-12 mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-bold mb-2">{booking_link.name}</h1>
          {booking_link.description && (
            <p className="text-gray-600">{booking_link.description}</p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {['service', 'staff', 'datetime', 'form', 'confirmation'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName 
                    ? 'text-white' 
                    : ['service', 'staff', 'datetime', 'form'].indexOf(step) > index
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-500'
                }`}
                style={{
                  backgroundColor: step === stepName ? primaryColor : undefined
                }}
              >
                {['service', 'staff', 'datetime', 'form'].indexOf(step) > index ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 4 && <div className="w-8 h-px bg-gray-300 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 'service' && (
          <ServiceSelectionStep
            appointmentTypes={appointment_types}
            selected={selectedAppointmentType}
            onSelect={(type) => {
              setSelectedAppointmentType(type)
              setStep(assigned_staff.length > 1 ? 'staff' : 'datetime')
            }}
            primaryColor={primaryColor}
          />
        )}

        {step === 'staff' && (
          <StaffSelectionStep
            staff={assigned_staff}
            selected={selectedStaff}
            onSelect={(staff) => {
              setSelectedStaff(staff)
              setStep('datetime')
            }}
            onBack={() => setStep('service')}
            primaryColor={primaryColor}
          />
        )}

        {step === 'datetime' && (
          <DateTimeSelectionStep
            availability={availability}
            currentWeek={currentWeek}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            loadingSlots={loadingSlots}
            onWeekChange={setCurrentWeek}
            onDateSelect={setSelectedDate}
            onSlotSelect={(slot) => {
              setSelectedSlot(slot)
              setStep('form')
            }}
            onBack={() => setStep(assigned_staff.length > 1 ? 'staff' : 'service')}
            primaryColor={primaryColor}
          />
        )}

        {step === 'form' && (
          <BookingFormStep
            formFields={details.form_fields}
            formData={formData}
            onFormChange={setFormData}
            consentText={booking_link.form_configuration.consent_text}
            selectedSlot={selectedSlot}
            appointmentType={selectedAppointmentType}
            paymentSettings={booking_link.payment_settings}
            onSubmit={() => {
              if (booking_link.payment_settings.enabled) {
                setStep('payment')
              } else {
                handleBooking()
              }
            }}
            onBack={() => setStep('datetime')}
            submitting={submitting}
            primaryColor={primaryColor}
          />
        )}

        {step === 'payment' && booking_link.payment_settings.enabled && (
          <PaymentStep
            amount={booking_link.payment_settings.amount}
            currency={booking_link.payment_settings.currency}
            description={booking_link.payment_settings.description}
            onPaymentComplete={handleBooking}
            onBack={() => setStep('form')}
            primaryColor={primaryColor}
          />
        )}

        {step === 'confirmation' && (
          <ConfirmationStep
            result={bookingResult}
            customMessage={booking_link.confirmation_settings.custom_message}
            autoConfirm={booking_link.confirmation_settings.auto_confirm}
            onNewBooking={() => {
              setStep('service')
              setSelectedAppointmentType(null)
              setSelectedStaff(null)
              setSelectedSlot(null)
              setFormData({
                name: '',
                email: '',
                phone: '',
                notes: '',
                consent: false
              })
              setBookingResult(null)
            }}
            primaryColor={primaryColor}
          />
        )}
      </div>
    </div>
  )
}

// =============================================
// STEP COMPONENTS
// =============================================

function ServiceSelectionStep({ 
  appointmentTypes, 
  selected, 
  onSelect, 
  primaryColor 
}: {
  appointmentTypes: AppointmentType[]
  selected: AppointmentType | null
  onSelect: (type: AppointmentType) => void
  primaryColor: string
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-center">Select a Service</h2>
      
      <div className="grid gap-4">
        {appointmentTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type)}
            className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
              selected?.id === type.id
                ? 'border-current shadow-lg'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              borderColor: selected?.id === type.id ? primaryColor : undefined,
              backgroundColor: selected?.id === type.id ? `${primaryColor}10` : undefined
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getSessionTypeIcon(type.session_type)}
                  <h3 className="font-semibold">{type.name}</h3>
                </div>
                {type.description && (
                  <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{type.duration_minutes} minutes</span>
                  </div>
                  {type.max_capacity > 1 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>Max {type.max_capacity} people</span>
                    </div>
                  )}
                  {type.fitness_level && type.fitness_level !== 'any' && (
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      <span className="capitalize">{type.fitness_level}</span>
                    </div>
                  )}
                </div>
              </div>
              {type.price_pennies > 0 && (
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: primaryColor }}>
                    £{(type.price_pennies / 100).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function StaffSelectionStep({ 
  staff, 
  selected, 
  onSelect, 
  onBack, 
  primaryColor 
}: {
  staff: StaffMember[]
  selected: StaffMember | null
  onSelect: (staff: StaffMember) => void
  onBack: () => void
  primaryColor: string
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Choose Your Trainer</h2>
      </div>
      
      <div className="grid gap-4">
        {staff.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
              selected?.id === member.id
                ? 'border-current shadow-lg'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              borderColor: selected?.id === member.id ? primaryColor : undefined,
              backgroundColor: selected?.id === member.id ? `${primaryColor}10` : undefined
            }}
          >
            <div className="flex items-center gap-4">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {member.full_name.split(' ').map(n => n[0]).join('')}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{member.full_name}</h3>
                {member.title && (
                  <p className="text-sm text-gray-600">{member.title}</p>
                )}
                {member.specializations && member.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {member.specializations.slice(0, 3).map((spec, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                      >
                        {spec.type.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DateTimeSelectionStep({ 
  availability, 
  currentWeek, 
  selectedDate, 
  selectedSlot, 
  loadingSlots,
  onWeekChange, 
  onDateSelect, 
  onSlotSelect, 
  onBack, 
  primaryColor 
}: {
  availability: { date: string; slots: AvailableSlot[] }[]
  currentWeek: Date
  selectedDate: Date
  selectedSlot: AvailableSlot | null
  loadingSlots: boolean
  onWeekChange: (date: Date) => void
  onDateSelect: (date: Date) => void
  onSlotSelect: (slot: AvailableSlot) => void
  onBack: () => void
  primaryColor: string
}) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getDateSlots = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return availability.find(day => day.date === dateStr)?.slots || []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Select Date & Time</h2>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onWeekChange(addDays(currentWeek, -7))}
          disabled={isBefore(addDays(currentWeek, -7), new Date())}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h3>
        <button
          onClick={() => onWeekChange(addDays(currentWeek, 7))}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
        
        {weekDays.map((date) => {
          const slots = getDateSlots(date)
          const isSelected = isSameDay(date, selectedDate)
          const isPast = isBefore(date, startOfDay(new Date()))
          
          return (
            <button
              key={date.toISOString()}
              onClick={() => !isPast && onDateSelect(date)}
              disabled={isPast}
              className={`p-2 rounded-md text-sm transition-colors ${
                isPast
                  ? 'text-gray-300 cursor-not-allowed'
                  : isSelected
                  ? 'text-white'
                  : slots.length > 0
                  ? 'hover:bg-gray-100 text-gray-900'
                  : 'text-gray-400'
              }`}
              style={{
                backgroundColor: isSelected ? primaryColor : undefined
              }}
            >
              <div className="font-medium">{format(date, 'd')}</div>
              {!isPast && (
                <div className="text-xs">
                  {slots.length > 0 ? `${slots.length} slots` : 'No slots'}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Available Slots */}
      <div>
        <h3 className="font-semibold mb-4">
          Available times for {format(selectedDate, 'EEEE, MMMM d')}
        </h3>
        
        {loadingSlots ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {getDateSlots(selectedDate).map((slot, index) => (
              <button
                key={index}
                onClick={() => onSlotSelect(slot)}
                className={`p-3 rounded-md border-2 transition-all hover:shadow-md ${
                  selectedSlot === slot
                    ? 'border-current text-white'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{
                  borderColor: selectedSlot === slot ? primaryColor : undefined,
                  backgroundColor: selectedSlot === slot ? primaryColor : undefined
                }}
              >
                <div className="text-center">
                  <div className="font-medium">
                    {format(parseISO(slot.start_time), 'h:mm a')}
                  </div>
                  {slot.staff_name && (
                    <div className="text-xs opacity-75 mt-1">
                      with {slot.staff_name}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {!loadingSlots && getDateSlots(selectedDate).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No available times for this date</p>
            <p className="text-sm">Please select a different date</p>
          </div>
        )}
      </div>
    </div>
  )
}

function BookingFormStep({ 
  formFields, 
  formData, 
  onFormChange, 
  consentText,
  selectedSlot,
  appointmentType,
  paymentSettings,
  onSubmit, 
  onBack, 
  submitting, 
  primaryColor 
}: {
  formFields: FormField[]
  formData: Record<string, any>
  onFormChange: (data: Record<string, any>) => void
  consentText: string
  selectedSlot: AvailableSlot | null
  appointmentType: AppointmentType | null
  paymentSettings: any
  onSubmit: () => void
  onBack: () => void
  submitting: boolean
  primaryColor: string
}) {
  const allFields = [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email Address', type: 'email', required: true },
    { name: 'phone', label: 'Phone Number', type: 'phone', required: false },
    { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
    ...formFields
  ]

  const isFormValid = () => {
    return allFields.every(field => 
      !field.required || (formData[field.name] && formData[field.name].toString().trim().length > 0)
    ) && formData.consent
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Enter Your Details</h2>
      </div>

      {/* Booking Summary */}
      {selectedSlot && appointmentType && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{appointmentType.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {format(parseISO(selectedSlot.start_time), 'EEEE, MMMM d, yyyy at h:mm a')}
                ({appointmentType.duration_minutes} minutes)
              </span>
            </div>
            {selectedSlot.staff_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>with {selectedSlot.staff_name}</span>
              </div>
            )}
            {paymentSettings.enabled && paymentSettings.amount > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  Total: £{(paymentSettings.amount / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {allFields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.name] || ''}
                onChange={(e) => onFormChange({ ...formData, [field.name]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: primaryColor }}
                rows={3}
                placeholder={field.placeholder}
                required={field.required}
              />
            ) : field.type === 'select' && field.options ? (
              <select
                value={formData[field.name] || ''}
                onChange={(e) => onFormChange({ ...formData, [field.name]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: primaryColor }}
                required={field.required}
              >
                <option value="">Select an option</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => onFormChange({ ...formData, [field.name]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: primaryColor }}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>

      {/* Consent */}
      <div className="border-t pt-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.consent || false}
            onChange={(e) => onFormChange({ ...formData, consent: e.target.checked })}
            className="mt-1"
            required
          />
          <span className="text-sm text-gray-600">{consentText}</span>
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button
          onClick={onSubmit}
          disabled={!isFormValid() || submitting}
          className="flex-1 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : paymentSettings.enabled ? (
            'Continue to Payment'
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>
    </div>
  )
}

function PaymentStep({ 
  amount, 
  currency, 
  description, 
  onPaymentComplete, 
  onBack, 
  primaryColor 
}: {
  amount: number
  currency: string
  description?: string
  onPaymentComplete: () => void
  onBack: () => void
  primaryColor: string
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Payment</h2>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-2xl font-bold mb-2">
          £{(amount / 100).toFixed(2)} {currency}
        </div>
        {description && (
          <p className="text-gray-600">{description}</p>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          <strong>Payment Integration:</strong> Stripe payment processing will be implemented in the next phase.
          For now, bookings will be created without payment.
        </p>
      </div>

      <Button
        onClick={onPaymentComplete}
        className="w-full text-white"
        style={{ backgroundColor: primaryColor }}
      >
        Complete Booking (Skip Payment)
      </Button>
    </div>
  )
}

function ConfirmationStep({ 
  result, 
  customMessage, 
  autoConfirm, 
  onNewBooking, 
  primaryColor 
}: {
  result: { success: boolean; message: string; confirmation_token?: string } | null
  customMessage?: string
  autoConfirm: boolean
  onNewBooking: () => void
  primaryColor: string
}) {
  return (
    <div className="text-center space-y-6">
      {result?.success ? (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">
              {autoConfirm ? 'Booking Confirmed!' : 'Booking Request Received!'}
            </h2>
            <p className="text-gray-600">
              {customMessage || result.message}
            </p>
            {result.confirmation_token && (
              <p className="text-sm text-gray-500 mt-2">
                Confirmation: {result.confirmation_token.slice(0, 8)}...
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Booking Failed</h2>
            <p className="text-gray-600">{result?.message || 'An error occurred'}</p>
          </div>
        </>
      )}

      <Button
        onClick={onNewBooking}
        variant="outline"
        className="border-current"
        style={{ borderColor: primaryColor, color: primaryColor }}
      >
        Book Another Appointment
      </Button>
    </div>
  )
}

function getSessionTypeIcon(type: string) {
  switch (type) {
    case 'personal_training': return <Target className="w-4 h-4" />
    case 'group_class': return <Users className="w-4 h-4" />
    case 'assessment': return <Zap className="w-4 h-4" />
    case 'nutrition_consult': return <Award className="w-4 h-4" />
    default: return <Calendar className="w-4 h-4" />
  }
}

export { BookingWidget }