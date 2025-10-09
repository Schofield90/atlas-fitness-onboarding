"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Calendar, MessageSquare, Activity } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ program?: string }>;
}

export default function WelcomePage(props: PageProps) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to client dashboard after 10 seconds
    const timeout = setTimeout(() => {
      router.push("/client/dashboard");
    }, 10000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to the Family! 🎉
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Your account has been created successfully. Get ready to transform
            your fitness journey!
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-lg mb-4">What's Next?</h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="flex flex-col items-center text-center">
                <Calendar className="h-10 w-10 text-blue-600 mb-2" />
                <h3 className="font-medium mb-1">Book Your First Class</h3>
                <p className="text-sm text-gray-600">
                  Browse our schedule and reserve your spot
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Activity className="h-10 w-10 text-blue-600 mb-2" />
                <h3 className="font-medium mb-1">Set Your Goals</h3>
                <p className="text-sm text-gray-600">
                  Tell us what you want to achieve
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <MessageSquare className="h-10 w-10 text-blue-600 mb-2" />
                <h3 className="font-medium mb-1">Meet Your Trainer</h3>
                <p className="text-sm text-gray-600">
                  Schedule your complimentary consultation
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="/client/booking"
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 transition"
            >
              Book Your First Class
            </Link>

            <Link
              href="/client/dashboard"
              className="block w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-md font-semibold hover:bg-gray-300 transition"
            >
              Go to Dashboard
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            You'll be automatically redirected to your dashboard in a few
            seconds...
          </p>
        </div>

        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Need Help Getting Started?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+441234567890"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              📞 Call Us
            </a>
            <a
              href="mailto:hello@atlasfitness.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ✉️ Email Support
            </a>
            <Link
              href="/client/help"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              📚 Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
