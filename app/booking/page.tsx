'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Users, Plus, Link, Settings, Video, Phone, Coffee } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import toast from '@/app/lib/toast'
import { useRouter } from 'next/navigation'

interface Booking {
	id: string
	title: string
	start_time: string
	end_time: string
	attendee_name: string
	attendee_email: string
	attendee_phone?: string
	booking_status: string
	meeting_type?: 'video' | 'phone' | 'in_person'
	meeting_link?: string
	notes?: string
	duration_minutes?: number
}

export default function BookingPage() {
	const [activeTab, setActiveTab] = useState<'upcoming' | 'calls' | 'past' | 'cancelled'>('upcoming')
	const [bookings, setBookings] = useState<Booking[]>([])
	const [loading, setLoading] = useState(true)
	const router = useRouter()

	useEffect(() => {
		fetchBookings()
	}, [activeTab])

	const fetchBookings = async () => {
		setLoading(true)
		try {
			// Fetch events from our stable API which already handles auth/org filters
			const params = new URLSearchParams()
			if (activeTab === 'upcoming' || activeTab === 'calls') {
				params.set('start', new Date().toISOString())
			}
			const response = await fetch(`/api/calendar/events?${params.toString()}`)
			const payload = await response.json()

			if (!response.ok) {
				console.error('Error loading events:', payload?.error || payload)
				toast.error('Failed to load bookings. Please try again.')
				setBookings([])
				return
			}

			const events = (payload?.events || []) as Array<any>

			// Transform calendar events to Booking shape expected by UI
			const transformed: Booking[] = events.map(evt => {
				// Derive meeting type from meetingUrl if possible
				let meetingType: Booking['meeting_type'] | undefined
				if (evt.meetingUrl) meetingType = 'video'

				// Extract primary attendee if available
				const primaryAttendee = Array.isArray(evt.attendees) && evt.attendees.length > 0 ? evt.attendees[0] : undefined
				const attendeeName = primaryAttendee?.name || primaryAttendee?.email || 'Guest'
				const attendeeEmail = primaryAttendee?.email || ''
				const attendeePhone = primaryAttendee?.phone || undefined

				return {
					id: evt.id,
					title: evt.title || 'Sales Call',
					start_time: evt.startTime,
					end_time: evt.endTime,
					attendee_name: attendeeName,
					attendee_email: attendeeEmail,
					attendee_phone: attendeePhone,
					booking_status: evt.status || 'confirmed',
					meeting_type: meetingType,
					meeting_link: evt.meetingUrl,
					notes: evt.description || undefined,
					duration_minutes: evt.startTime && evt.endTime ? Math.max(0, Math.round((new Date(evt.endTime).getTime() - new Date(evt.startTime).getTime()) / 60000)) : undefined,
				}
			})

			// Apply tab filters
			let filtered = transformed
			const nowIso = new Date().toISOString()
			if (activeTab === 'upcoming') {
				filtered = transformed.filter(b => b.start_time >= nowIso && ['confirmed', 'pending'].includes(b.booking_status))
			} else if (activeTab === 'calls') {
				filtered = transformed.filter(b => b.start_time >= nowIso && b.meeting_type === 'phone' && ['confirmed', 'pending'].includes(b.booking_status))
			} else if (activeTab === 'past') {
				filtered = transformed.filter(b => b.start_time < nowIso && b.booking_status === 'completed')
			} else if (activeTab === 'cancelled') {
				filtered = transformed.filter(b => b.booking_status === 'cancelled')
			}

			setBookings(filtered)
		} catch (error) {
			console.error('Error fetching bookings:', error)
			toast.error('Failed to load bookings. Please try again.')
			setBookings([])
		} finally {
			setLoading(false)
		}
	}

	const getBookingIcon = (booking: Booking) => {
		if (booking.meeting_type === 'video') return <Video className="w-4 h-4" />
		if (booking.meeting_type === 'phone') return <Phone className="w-4 h-4" />
		return <Coffee className="w-4 h-4" />
	}

	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	return (
		<div className="min-h-screen bg-gray-900 text-white">
			<div className="p-6">
				{/* Header */}
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold">Sales Calls & Consultations</h1>
						<p className="text-gray-400 mt-1">Manage your sales calls, consultations, and appointments</p>
					</div>
					<div className="flex gap-3">
						<Button
							onClick={() => router.push('/settings/booking')}
							variant="outline"
							className="flex items-center gap-2"
						>
							<Settings className="w-4 h-4" />
							Settings
						</Button>
						<Button
							onClick={() => {
								try {
									router.push('/booking-links')
								} catch (err) {
									console.error((err as Error).message)
								}
							}}
							className="border border-gray-300 text-white hover:bg-gray-700 hover:border-gray-500 px-4 py-2 text-sm flex items-center gap-2"
						>
							<Link className="w-4 h-4" />
							Manage Links
						</Button>
						<Button
							onClick={() => router.push('/booking-links/create')}
							className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2"
						>
							<Plus className="w-4 h-4" />
							Create Booking Link
						</Button>
					</div>
				</div>

				{/* Quick Stats */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
					<div className="bg-gray-800 rounded-lg p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-400 text-sm">Today's Calls</p>
								<p className="text-2xl font-bold">
									{bookings.filter(b => {
										const bookingDate = new Date(b.start_time).toDateString()
										return bookingDate === new Date().toDateString() && b.booking_status === 'confirmed'
									}).length}
								</p>
							</div>
							<Calendar className="w-8 h-8 text-orange-500" />
						</div>
					</div>

					<div className="bg-gray-800 rounded-lg p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-400 text-sm">This Week</p>
								<p className="text-2xl font-bold">
									{bookings.filter(b => {
										const bookingDate = new Date(b.start_time)
										const weekStart = new Date()
										weekStart.setDate(weekStart.getDate() - weekStart.getDay())
										const weekEnd = new Date(weekStart)
										weekEnd.setDate(weekEnd.getDate() + 6)
										return bookingDate >= weekStart && bookingDate <= weekEnd && b.booking_status === 'confirmed'
									}).length}
								</p>
							</div>
							<Clock className="w-8 h-8 text-blue-500" />
						</div>
					</div>

					<div className="bg-gray-800 rounded-lg p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-400 text-sm">Total Bookings</p>
								<p className="text-2xl font-bold">{bookings.length}</p>
							</div>
							<Users className="w-8 h-8 text-green-500" />
						</div>
					</div>

					<div className="bg-gray-800 rounded-lg p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-400 text-sm">Booking Links</p>
								<div className="text-orange-500 text-sm">&nbsp;</div>
							</div>
							<Link className="w-8 h-8 text-purple-500" />
						</div>
					</div>
				</div>

				{/* Tabs */}
				<div className="border-b border-gray-700 mb-6">
					<nav className="-mb-px flex space-x-8">
						<button
							onClick={() => setActiveTab('upcoming')}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === 'upcoming'
									? 'border-orange-500 text-orange-500'
									: 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
							}`}
						>
							Upcoming
						</button>
						<button
							onClick={() => setActiveTab('calls')}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === 'calls'
									? 'border-orange-500 text-orange-500'
									: 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
							}`}
						>
							Calls
						</button>
						<button
							onClick={() => setActiveTab('past')}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === 'past'
									? 'border-orange-500 text-orange-500'
									: 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
							}`}
						>
							Past
						</button>
						<button
							onClick={() => setActiveTab('cancelled')}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === 'cancelled'
									? 'border-orange-500 text-orange-500'
									: 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
							}`}
						>
							Cancelled
						</button>
					</nav>
				</div>

				{/* Bookings List */}
				<div className="bg-gray-800 rounded-lg">
					{loading ? (
						<div className="p-8 text-center text-gray-400">
							Loading bookings...
						</div>
					) : bookings.length === 0 ? (
						<div className="p-8 text-center">
							<Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
							<p className="text-gray-400 mb-4">
								{activeTab === 'upcoming' && 'No upcoming bookings'}
								{activeTab === 'calls' && 'No scheduled calls'}
								{activeTab === 'past' && 'No past bookings'}
								{activeTab === 'cancelled' && 'No cancelled bookings'}
							</p>
							{activeTab === 'upcoming' && (
								<Button
									onClick={() => router.push('/booking-links/create')}
									className="bg-orange-600 hover:bg-orange-700"
								>
									New Booking Link
								</Button>
							)}
						</div>
					) : (
						<div className="divide-y divide-gray-700">
							{bookings.map((booking) => (
								<div key={booking.id} className="p-6 hover:bg-gray-750 transition-colors">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												{getBookingIcon(booking)}
												<h3 className="font-semibold text-white">
													{booking.title || 'Sales Call'}
												</h3>
												<span className={`text-xs px-2 py-1 rounded-full ${
													booking.booking_status === 'confirmed' ? 'bg-green-900 text-green-300' :
													booking.booking_status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
													booking.booking_status === 'cancelled' ? 'bg-red-900 text-red-300' :
													'bg-gray-700 text-gray-300'
												}`}
											>
												{booking.booking_status}
											</span>
											</div>
											
											<div className="text-sm text-gray-400 space-y-1">
												<p className="flex items-center gap-2">
													<Clock className="w-4 h-4" />
													{formatDateTime(booking.start_time)} - {new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
													{booking.duration_minutes && ` (${booking.duration_minutes} min)`}
												</p>
												
												<p className="flex items-center gap-2">
													<Users className="w-4 h-4" />
													{booking.attendee_name} • {booking.attendee_email}
													{booking.attendee_phone && ` • ${booking.attendee_phone}`}
												</p>
												
												{booking.notes && (
													<p className="text-gray-500 mt-2">
														Note: {booking.notes}
													</p>
												)}
											</div>
										</div>

										{activeTab === 'upcoming' && (
											<div className="flex gap-2 ml-4">
												{booking.meeting_link && (
													<a
														href={booking.meeting_link}
														target="_blank"
														rel="noopener noreferrer"
														className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
													>
														Join Call
														</a>
												)}
												<button
													onClick={() => {/* Handle reschedule */}}
													className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
												>
													Reschedule
												</button>
												<button
													onClick={() => {/* Handle cancel */}}
													className="px-3 py-1.5 bg-gray-700 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
												>
													Cancel
												</button>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Help Text */}
				<div className="mt-8 bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg p-4">
					<h4 className="text-sm font-semibold text-blue-400 mb-2">Quick Tips</h4>
					<ul className="text-sm text-gray-300 space-y-1">
						<li>• Generate booking URLs in the Calendar → Booking Links section</li>
						<li>• Set your availability in Settings → Booking → Availability Rules</li>
						<li>• Appointment types define the duration and details of your calls</li>
						<li>• Share booking links with prospects to let them self-schedule</li>
					</ul>
				</div>
			</div>
		</div>
	)
}