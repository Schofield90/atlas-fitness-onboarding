import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClassCalendarClient } from '@/components/class-calendar/ClassCalendarClient';

export default async function ClassCalendarPage() {
  // Server-side authentication check
  const supabase = await createClient();

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    redirect('/auth/login');
  }

  return <ClassCalendarClient />;
}