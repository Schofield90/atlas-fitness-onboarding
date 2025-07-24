import { notFound } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import BookingPage from './booking-page'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: link } = await supabase
    .from('booking_links')
    .select('title, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  
  if (!link) {
    return {
      title: 'Booking Not Found',
      description: 'This booking link is not available'
    }
  }
  
  return {
    title: `Book ${link.title} | Gymleadhub`,
    description: link.description || `Schedule a ${link.title} with us`
  }
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  
  // Get booking link details
  const { data: bookingLink, error } = await supabase
    .from('booking_links')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  
  if (error || !bookingLink) {
    notFound()
  }
  
  // Get user's calendar settings
  const { data: settings } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('user_id', bookingLink.user_id)
    .single()
  
  return (
    <BookingPage 
      bookingLink={bookingLink}
      settings={settings}
    />
  )
}