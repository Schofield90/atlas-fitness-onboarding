'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DirectDashboard() {
  useEffect(() => {
    // Set up necessary localStorage items
    const setupAndRedirect = async () => {
      // Set system mode to CRM
      localStorage.setItem('systemMode', 'crm');
      
      // Set default organization data
      const defaultData = {
        organizationName: 'Atlas Fitness',
        gymName: 'Atlas Fitness', 
        email: 'sam@atlas-gyms.co.uk',
        trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };
      localStorage.setItem('gymleadhub_trial_data', JSON.stringify(defaultData));
      
      // Force authenticate with Supabase
      const supabase = createClient();
      
      // Check if we have any session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Create a test user session manually
        const { data, error } = await supabase.auth.signUp({
          email: `test-${Date.now()}@atlas-gyms.co.uk`,
          password: 'TestPassword123!',
          options: {
            data: {
              organization_id: '63589490-8f55-4157-bd3a-e141594b748e'
            }
          }
        });
      }
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    };
    
    setupAndRedirect();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-white">Setting up dashboard access...</p>
      </div>
    </div>
  );
}