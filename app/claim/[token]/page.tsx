"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ClaimInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [valid, setValid] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [clientInfo, setClientInfo] = useState<any>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch("/api/members/validate-claim-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setValid(true);
        setClaimed(false);
        setClientInfo(data.member);
      } else {
        setValid(false);
        setError(data.message || "Invalid invitation link");
        if (data.message?.includes("already been claimed")) {
          setClaimed(true);
        }
      }
    } catch (err) {
      setError("Failed to verify invitation");
      setValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError("Password must contain uppercase, lowercase, and numbers");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/members/claim-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);

        // Redirect to member portal login page with email pre-filled
        // In production, this should go to the members subdomain
        const isProduction =
          window.location.hostname.includes("gymleadhub.co.uk");
        const redirectUrl = isProduction
          ? `https://members.gymleadhub.co.uk/simple-login?email=${encodeURIComponent(data.email)}`
          : `/simple-login?email=${encodeURIComponent(data.email)}`;
        console.log("Redirecting to:", redirectUrl);
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
      } else {
        setError(data.message || "Failed to set password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (!valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-600 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-300 mb-6">
            {error || "This invitation link is invalid or has expired."}
          </p>
          <p className="text-gray-400 text-sm">
            Please contact your gym for a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  // Already claimed
  if (claimed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-green-600 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Already Activated
          </h1>
          <p className="text-gray-300 mb-6">
            Your account has already been activated.
          </p>
          <button
            onClick={() => {
              const isProduction =
                window.location.hostname.includes("gymleadhub.co.uk");
              const loginUrl = isProduction
                ? "https://members.gymleadhub.co.uk/simple-login"
                : "/simple-login";
              window.location.href = loginUrl;
            }}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition-all"
          >
            Go to Member Login
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-green-600 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-2xl font-bold text-white mb-2">Success!</h1>
          <p className="text-gray-300 mb-2">
            Your password has been set successfully.
          </p>
          <p className="text-gray-400 text-sm">
            Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Password setup form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mx-auto flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to GymLeadHub
          </h1>
          {clientInfo && (
            <p className="text-gray-300">
              Hi {clientInfo.first_name}, let's set up your account
            </p>
          )}
        </div>

        <form onSubmit={handleSetPassword} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Create Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-400 mt-1">
              At least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Confirm your password"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/30 border border-red-600 text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-105 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Setting Password...
              </>
            ) : (
              "Set Password & Continue"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            After setting your password, you'll use it to login with your email
            address.
          </p>
        </div>
      </div>
    </div>
  );
}
