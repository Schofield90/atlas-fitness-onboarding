'use client';

import { useEffect } from 'react';

export default function SetupOrg() {
  useEffect(() => {
    // Set up organization data in localStorage
    const trialData = {
      name: "Sam",
      email: "sam@atlas-gyms.co.uk",
      gymName: "Atlas Fitness",
      organizationId: "63589490-8f55-4157-bd3a-e141594b748e",
      trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('gymleadhub_trial_data', JSON.stringify(trialData));
    
    // Redirect to booking page
    window.location.href = '/booking';
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl mb-4">Setting up your organization...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
      </div>
    </div>
  );
}