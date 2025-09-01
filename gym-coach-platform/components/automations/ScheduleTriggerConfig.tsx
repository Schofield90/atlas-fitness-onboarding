'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { format } from 'date-fns'
import * as dateFnsTz from 'date-fns-tz'
import { z } from 'zod'

// Types for schedule configuration
export type ScheduleMode = 'once' | 'daily' | 'weekly'

export interface ScheduleConfigBase {
  mode: ScheduleMode
  tz: string
  catchUp: boolean
  active: boolean
}

export interface OnceScheduleConfig extends ScheduleConfigBase {
  mode: 'once'
  date: string // YYYY-MM-DD format
  time: string // HH:MM format
}

export interface DailyScheduleConfig extends ScheduleConfigBase {
  mode: 'daily'
  time: string // HH:MM format
}

export interface WeeklyScheduleConfig extends ScheduleConfigBase {
  mode: 'weekly'
  daysOfWeek: number[] // 0-6, Sunday to Saturday
  time: string // HH:MM format
}

export type ScheduleConfig = OnceScheduleConfig | DailyScheduleConfig | WeeklyScheduleConfig

export interface ScheduleTriggerData {
  kind: 'schedule'
  name?: string
  description?: string
  schedule: ScheduleConfig
}

// Days of the week for weekly scheduling
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
]

// Zod validation schemas
const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')

const onceScheduleSchema = z.object({
  mode: z.literal('once'),
  date: dateSchema,
  time: timeSchema,
  tz: z.string(),
  catchUp: z.boolean(),
  active: z.boolean()
}).refine((data) => {
  // Validate that datetime is in the future
  try {
    const scheduleDate = new Date(`${data.date}T${data.time}:00`)
    const nowInTz = dateFnsTz.toZonedTime(new Date(), data.tz)
    const scheduleInTz = dateFnsTz.fromZonedTime(`${data.date} ${data.time}`, data.tz)
    return scheduleInTz > new Date()
  } catch {
    return false
  }
}, 'Scheduled time must be in the future')

const dailyScheduleSchema = z.object({
  mode: z.literal('daily'),
  time: timeSchema,
  tz: z.string(),
  catchUp: z.boolean(),
  active: z.boolean()
})

const weeklyScheduleSchema = z.object({
  mode: z.literal('weekly'),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1, 'Select at least one day'),
  time: timeSchema,
  tz: z.string(),
  catchUp: z.boolean(),
  active: z.boolean()
})

const scheduleConfigSchema = z.discriminatedUnion('mode', [
  onceScheduleSchema,
  dailyScheduleSchema,
  weeklyScheduleSchema
])

// Helper function to calculate next run time
export function getNextRun(schedule: ScheduleConfig): string {
  const now = new Date()
  const nowInTz = dateFnsTz.toZonedTime(now, schedule.tz)
  
  try {
    switch (schedule.mode) {
      case 'once': {
        const scheduleTime = dateFnsTz.fromZonedTime(`${schedule.date} ${schedule.time}`, schedule.tz)
        if (scheduleTime > now) {
          return dateFnsTz.formatInTimeZone(scheduleTime, schedule.tz, 'MMM d, yyyy \'at\' h:mm a')
        }
        return 'Already passed'
      }
      
      case 'daily': {
        const today = dateFnsTz.formatInTimeZone(nowInTz, schedule.tz, 'yyyy-MM-dd')
        const todayScheduled = dateFnsTz.fromZonedTime(`${today} ${schedule.time}`, schedule.tz)
        
        if (todayScheduled > now) {
          return dateFnsTz.formatInTimeZone(todayScheduled, schedule.tz, 'MMM d, yyyy \'at\' h:mm a')
        } else {
          // Tomorrow
          const tomorrow = new Date(nowInTz)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowDate = dateFnsTz.formatInTimeZone(tomorrow, schedule.tz, 'yyyy-MM-dd')
          const tomorrowScheduled = dateFnsTz.fromZonedTime(`${tomorrowDate} ${schedule.time}`, schedule.tz)
          return dateFnsTz.formatInTimeZone(tomorrowScheduled, schedule.tz, 'MMM d, yyyy \'at\' h:mm a')
        }
      }
      
      case 'weekly': {
        const currentDay = nowInTz.getDay()
        const currentTime = dateFnsTz.formatInTimeZone(nowInTz, schedule.tz, 'HH:mm')
        
        // Find next occurrence
        for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
          const checkDay = (currentDay + daysAhead) % 7
          const isToday = daysAhead === 0
          
          if (schedule.daysOfWeek.includes(checkDay)) {
            if (!isToday || schedule.time > currentTime) {
              const nextDate = new Date(nowInTz)
              nextDate.setDate(nextDate.getDate() + daysAhead)
              const dateStr = dateFnsTz.formatInTimeZone(nextDate, schedule.tz, 'yyyy-MM-dd')
              const nextScheduled = dateFnsTz.fromZonedTime(`${dateStr} ${schedule.time}`, schedule.tz)
              return dateFnsTz.formatInTimeZone(nextScheduled, schedule.tz, 'MMM d, yyyy \'at\' h:mm a')
            }
          }
        }
        
        return 'No upcoming runs'
      }
      
      default:
        return 'Unknown schedule type'
    }
  } catch (error) {
    return 'Invalid schedule'
  }
}

interface ScheduleTriggerConfigProps {
  value?: Partial<ScheduleConfig>
  onChange?: (schedule: ScheduleConfig) => void
  onSave?: () => void
  onCancel?: () => void
}

export function ScheduleTriggerConfig({
  value = {},
  onChange,
  onSave,
  onCancel
}: ScheduleTriggerConfigProps) {
  // Initialize with default values
  const [schedule, setSchedule] = useState<ScheduleConfig>(() => {
    const defaultSchedule: ScheduleConfig = {
      mode: 'once',
      date: format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Tomorrow
      time: '09:00',
      tz: 'Europe/London',
      catchUp: false,
      active: true
    }
    
    if (value && typeof value === 'object' && 'mode' in value) {
      return { ...defaultSchedule, ...value } as ScheduleConfig
    }
    
    return defaultSchedule
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update parent when schedule changes
  useEffect(() => {
    const result = scheduleConfigSchema.safeParse(schedule)
    if (result.success) {
      setErrors({})
      onChange?.(result.data)
    } else {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(error => {
        const path = error.path.join('.')
        fieldErrors[path] = error.message
      })
      setErrors(fieldErrors)
    }
  }, [schedule, onChange])

  const handleScheduleChange = (updates: Partial<ScheduleConfig>) => {
    setSchedule(prev => ({ ...prev, ...updates }))
  }

  const handleModeChange = (mode: ScheduleMode) => {
    const baseConfig = {
      tz: schedule.tz,
      catchUp: schedule.catchUp,
      active: schedule.active
    }

    switch (mode) {
      case 'once':
        setSchedule({
          mode: 'once',
          date: format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          time: '09:00',
          ...baseConfig
        })
        break
      case 'daily':
        setSchedule({
          mode: 'daily',
          time: '09:00',
          ...baseConfig
        })
        break
      case 'weekly':
        setSchedule({
          mode: 'weekly',
          daysOfWeek: [1], // Monday
          time: '09:00',
          ...baseConfig
        })
        break
    }
  }

  const handleDayToggle = (day: number) => {
    if (schedule.mode !== 'weekly') return
    
    const newDays = schedule.daysOfWeek.includes(day)
      ? schedule.daysOfWeek.filter(d => d !== day)
      : [...schedule.daysOfWeek, day].sort()
    
    handleScheduleChange({ daysOfWeek: newDays })
  }

  const isValid = Object.keys(errors).length === 0
  const nextRun = isValid ? getNextRun(schedule) : 'Invalid configuration'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <span>Schedule Trigger</span>
        </CardTitle>
        <CardDescription>
          Trigger this automation at specific times or intervals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule Mode */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Schedule Type</Label>
          <RadioGroup
            value={schedule.mode}
            onValueChange={handleModeChange}
            className="flex flex-col space-y-2"
            data-testid="schedule-mode"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="once" id="once" />
              <Label htmlFor="once" className="font-normal">One-time</Label>
              <span className="text-sm text-gray-500">Run once at a specific date and time</span>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily" className="font-normal">Daily</Label>
              <span className="text-sm text-gray-500">Run every day at a specific time</span>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weekly" id="weekly" />
              <Label htmlFor="weekly" className="font-normal">Weekly</Label>
              <span className="text-sm text-gray-500">Run on specific days of the week</span>
            </div>
          </RadioGroup>
        </div>

        {/* One-time Configuration */}
        {schedule.mode === 'once' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">Date</Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={schedule.date}
                  onChange={(e) => handleScheduleChange({ date: e.target.value })}
                  data-testid="schedule-date"
                />
                {errors.date && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.date}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={schedule.time}
                  onChange={(e) => handleScheduleChange({ time: e.target.value })}
                  data-testid="schedule-time"
                />
                {errors.time && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.time}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Daily Configuration */}
        {schedule.mode === 'daily' && (
          <div className="space-y-2">
            <Label htmlFor="daily-time">Time</Label>
            <div className="w-32">
              <Input
                id="daily-time"
                type="time"
                value={schedule.time}
                onChange={(e) => handleScheduleChange({ time: e.target.value })}
                data-testid="daily-time"
              />
            </div>
            {errors.time && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.time}
              </p>
            )}
          </div>
        )}

        {/* Weekly Configuration */}
        {schedule.mode === 'weekly' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={schedule.daysOfWeek.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                      data-testid={`day-${day.value}`}
                    />
                    <Label htmlFor={`day-${day.value}`} className="font-normal">
                      {day.short}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.daysOfWeek && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.daysOfWeek}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-time">Time</Label>
              <div className="w-32">
                <Input
                  id="weekly-time"
                  type="time"
                  value={schedule.time}
                  onChange={(e) => handleScheduleChange({ time: e.target.value })}
                  data-testid="weekly-time"
                />
              </div>
              {errors.time && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.time}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Timezone */}
        <div className="space-y-2">
          <Label>Timezone</Label>
          <p className="text-sm text-gray-600">{schedule.tz}</p>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            Next Run Preview
          </h4>
          <p className="text-sm text-blue-800 font-medium">
            {nextRun}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="catch-up"
              checked={schedule.catchUp}
              onCheckedChange={(checked) => handleScheduleChange({ catchUp: !!checked })}
              data-testid="catch-up"
            />
            <Label htmlFor="catch-up" className="font-normal">
              Catch up missed runs
            </Label>
            <span className="text-sm text-gray-500">
              Run automation for missed schedules when reactivated
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={schedule.active}
              onCheckedChange={(checked) => handleScheduleChange({ active: !!checked })}
              data-testid="active"
            />
            <Label htmlFor="active" className="font-normal">
              Active
            </Label>
            <span className="text-sm text-gray-500">
              Enable this scheduled trigger
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {(onSave || onCancel) && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onSave && (
              <Button
                onClick={onSave}
                disabled={!isValid}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                data-testid="save-schedule-config"
              >
                Save Configuration
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}