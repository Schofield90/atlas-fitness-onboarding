"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

export default function SignupSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Give Stripe webhook time to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Welcome to GymLeadHub!
        </h1>

        <p className="text-gray-300 mb-6">
          Your subscription has been activated successfully. You'll receive a
          confirmation email shortly with your login details.
        </p>

        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400 mb-2">Session ID</p>
          <p className="text-xs text-gray-300 font-mono break-all">
            {sessionId}
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="https://login.gymleadhub.co.uk"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Dashboard
          </a>

          <a
            href="https://gymleadhub.co.uk/support"
            className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Need help getting started? Check out our{" "}
          <a
            href="https://gymleadhub.co.uk/docs"
            className="text-blue-400 hover:underline"
          >
            documentation
          </a>
        </p>
      </div>
    </div>
  );
}
