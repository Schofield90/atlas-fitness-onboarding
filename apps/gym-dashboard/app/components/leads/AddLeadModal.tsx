'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadAdded: () => void
}

export function AddLeadModal({ isOpen, onClose, onLeadAdded }: AddLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const schema = z.object({
    name: z.string().min(1, 'Full name is required'),
    email: z
      .string()
      .email('Enter a valid email')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    phone: z.string().optional(),
    source: z.string().default('manual'),
    form_name: z.string().optional(),
  }).superRefine((data, ctx) => {
    const hasEmail = typeof data.email === 'string' && data.email.trim().length > 0
    const hasPhone = typeof data.phone === 'string' && data.phone.trim().length > 0
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Provide email or phone' })
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Provide email or phone' })
    }
    if (hasPhone) {
      const digits = (data.phone || '').replace(/[^0-9]/g, '')
      if (digits.length < 7) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Phone looks invalid' })
      }
    }
  })

  type FormValues = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors }, reset, setError: setFieldError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      source: 'manual',
      form_name: ''
    }
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (response.status === 409 && data?.duplicateField) {
          const field = data.duplicateField as 'email' | 'phone'
          setFieldError(field, { type: 'manual', message: data.error || 'Duplicate record' })
          throw new Error(data.error || 'Duplicate record')
        }
        const errorMessage = data?.details
          ? `${data.error}: ${data.details}`
          : data?.error || 'Failed to add lead'
        throw new Error(errorMessage)
      }

      reset()
      onLeadAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lead')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add New Lead</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="John Smith"
            />
            {errors.name && (
              <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Phone
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-400 mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Source
            </label>
            <select
              {...register('source')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="manual">Manual Entry</option>
              <option value="website">Website</option>
              <option value="facebook">Facebook</option>
              <option value="referral">Referral</option>
              <option value="walk-in">Walk-in</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Form/Campaign Name
            </label>
            <input
              type="text"
              {...register('form_name')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="e.g., Free Trial Sign Up"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}