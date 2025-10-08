"use client";

import { useState, useEffect } from "react";
import { Calendar, Check, ExternalLink, Loader2, X } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

interface GoogleCalendarStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function GoogleCalendarStep({
  onComplete,
  onSkip,
  onClose,
}: GoogleCalendarStepProps) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    checkConnection();
    // Poll connection status every 3 seconds
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check if we have Google tokens
      const { data: tokens } = await supabase
        .from("google_calendar_tokens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokens && tokens.access_token) {
        setConnected(true);
        // Auto-complete when connected
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = () => {
    // Open OAuth in new window to preserve modal state
    const width = 600;
    const height = 700;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;

    window.open(
      "/api/auth/google",
      "google_oauth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Connect Google Calendar
              </h2>
              <p className="text-sm text-gray-400">
                Sync bookings automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          {connected ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-green-500 font-semibold">
                    Successfully Connected!
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Your Google Calendar is now synced with Atlas Fitness
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-300">
                {checking
                  ? "Checking connection status..."
                  : "Connect your Google Calendar to automatically sync class bookings and events."}
              </p>
            </div>
          )}

          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Why Connect?</h3>
            <div className="space-y-2">
              {[
                "📅 Auto-sync class bookings to your calendar",
                "🔔 Get reminders for upcoming classes",
                "📊 View availability at a glance",
                "🔄 Two-way sync keeps everything up to date",
                "⏱️ Saves hours of manual scheduling",
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-gray-300 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          {!connected && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3">Quick Setup:</h4>
              <ol className="space-y-2 text-sm text-gray-300">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-500">1.</span>
                  <span>
                    Click <strong>"Connect Google Calendar"</strong> below
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-500">2.</span>
                  <span>
                    Sign in to your Google account (opens in new window)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-500">3.</span>
                  <span>
                    Grant permission to access your calendar (read & write)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-500">4.</span>
                  <span>
                    You'll be redirected back - connection will auto-verify!
                  </span>
                </li>
              </ol>
              <p className="text-xs text-gray-500 mt-3">
                ⏱️ Takes less than 60 seconds • 🔒 Secure OAuth 2.0
                authentication
              </p>
            </div>
          )}

          {/* Video Tutorial (optional) */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-semibold text-sm">Need Help?</h4>
              <a
                href="/docs/integrations/google-calendar"
                target="_blank"
                className="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1"
              >
                View Guide
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-gray-500">
              Check our step-by-step guide with screenshots if you need
              assistance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white text-sm transition-colors"
            disabled={connected}
          >
            {connected ? "Completed ✓" : "Skip for now"}
          </button>
          <div className="flex gap-3">
            {!connected && (
              <button
                onClick={handleConnect}
                disabled={checking}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {checking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Connect Google Calendar
                  </>
                )}
              </button>
            )}
            {connected && (
              <button
                onClick={onComplete}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
