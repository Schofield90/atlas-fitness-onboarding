'use client';

import { useEffect } from 'react';

export default function FixDashboard() {
  useEffect(() => {
    // Clear all potential problematic localStorage items
    localStorage.removeItem('systemMode');
    localStorage.removeItem('selectedOrganizationId');
    
    // Set default data
    const defaultData = {
      organizationName: 'Atlas Fitness',
      gymName: 'Atlas Fitness',
      email: 'samschofield90@hotmail.co.uk',
      trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem('gymleadhub_trial_data', JSON.stringify(defaultData));
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-white">Fixing dashboard...</p>
      </div>
    </div>
  );
}