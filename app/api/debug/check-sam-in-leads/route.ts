import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check for Sam in leads table
    const { data: samInLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .or(`name.ilike.%sam%,email.eq.samschofield90@hotmail.co.uk`);
    
    // Check for any customer with that email
    const { data: byEmail } = await supabase
      .from('leads')
      .select('id, name, email, status')
      .eq('email', 'samschofield90@hotmail.co.uk');
    
    // Check if Sam exists in clients table still
    const { data: samInClients } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('email', 'samschofield90@hotmail.co.uk');
    
    // Get total count of leads
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      samInLeads: samInLeads || [],
      samByEmail: byEmail || [],
      samInClients: samInClients || [],
      totalLeadsCount: count,
      leadsError: leadsError?.message
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}