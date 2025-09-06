'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'expired' | 'accepted'>('checking')
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      checkInvitation()
    } else {
      setStatus('invalid')
    }
  }, [token])

  const checkInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*, organization:organizations(name)')
        .eq('invite_token', token)
        .single()

      if (error || !data) {
        setStatus('invalid')
        return
      }

      if (data.status === 'accepted') {
        setStatus('accepted')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setStatus('expired')
        return
      }

      setInvitation(data)
      setStatus('valid')
    } catch (error) {
      console.error('Error checking invitation:', error)
      setStatus('invalid')
    }
  }

  const acceptInvitation = async () => {
    if (!invitation) return

    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to signup with invitation token
        router.push(`/signup?invite=${token}`)
        return
      }

      // Update invitation
      const { error: updateError } = await supabase
        .from('staff_invitations')
        .update({
          status: 'accepted',
          accepted_by: user.id,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      // Create or update staff record
      const { error: staffError } = await supabase
        .from('organization_staff')
        .upsert({
          organization_id: invitation.organization_id,
          user_id: user.id,
          email: invitation.email,
          role: invitation.role,
          permissions: invitation.permissions,
          is_available: true,
          receives_calls: true,
          receives_sms: true,
          receives_whatsapp: true,
          receives_emails: true,
          routing_priority: 5
        })

      if (staffError) throw staffError

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error accepting invitation:', error)
      alert('Failed to accept invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-400">Checking invitation...</p>
          </div>
        )

      case 'invalid':
        return (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h2>
            <p className="text-gray-400 mb-6">This invitation link is invalid or has been used.</p>
            <Link href="/" className="text-orange-500 hover:text-orange-400">
              Go to homepage
            </Link>
          </div>
        )

      case 'expired':
        return (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Invitation Expired</h2>
            <p className="text-gray-400 mb-6">This invitation has expired. Please contact the person who invited you.</p>
            <Link href="/" className="text-orange-500 hover:text-orange-400">
              Go to homepage
            </Link>
          </div>
        )

      case 'accepted':
        return (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Already Accepted</h2>
            <p className="text-gray-400 mb-6">This invitation has already been accepted.</p>
            <Link href="/dashboard" className="text-orange-500 hover:text-orange-400">
              Go to dashboard
            </Link>
          </div>
        )

      case 'valid':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">You're Invited!</h2>
            <p className="text-gray-400 mb-6">
              You've been invited to join <span className="text-white font-medium">{invitation.organization?.name}</span> as a{' '}
              <span className="text-white font-medium">{invitation.role}</span>.
            </p>

            <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Your permissions:</h3>
              <ul className="space-y-1">
                {Object.entries(invitation.permissions || {}).map(([key, value]) => (
                  value && (
                    <li key={key} className="text-sm text-gray-400 flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  )
                ))}
              </ul>
            </div>

            <button
              onClick={acceptInvitation}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-6 py-3 rounded-lg text-white font-medium transition-colors"
            >
              {loading ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-lg w-full">
        {renderContent()}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-lg w-full">
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}