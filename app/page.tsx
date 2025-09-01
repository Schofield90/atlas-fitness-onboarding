import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'

export default async function HomePage() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Auth error on home page:', error)
      redirect('/landing')
    }
    
    if (user) {
      redirect('/dashboard')
    } else {
      redirect('/landing')
    }
  } catch (error) {
    console.error('Error on home page:', error)
    redirect('/landing')
  }
}