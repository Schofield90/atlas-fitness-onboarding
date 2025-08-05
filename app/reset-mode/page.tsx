'use client';

export default function ResetMode() {
  const resetToCRM = () => {
    localStorage.setItem('systemMode', 'crm');
    window.location.href = '/dashboard';
  };

  const setToBooking = () => {
    localStorage.setItem('systemMode', 'booking');
    window.location.href = '/dashboard/overview';
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Reset System Mode</h1>
        
        <div className="space-y-4">
          <button
            onClick={resetToCRM}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reset to CRM Mode
          </button>
          
          <button
            onClick={setToBooking}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Set to Booking Mode
          </button>
        </div>
      </div>
    </div>
  );
}