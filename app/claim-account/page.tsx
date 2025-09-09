"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { Eye, EyeOff, Check, X, Loader2, CheckCircle } from "lucide-react";

function ClaimAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  useEffect(() => {
    // Check password strength
    const pwd = formData.password;
    setPasswordStrength({
      hasMinLength: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    });
  }, [formData.password]);

  const validateToken = async () => {
    if (!token) {
      console.error("DEBUG: No token provided in URL");
      setError("No claim token provided");
      setLoading(false);
      return;
    }

    console.log("DEBUG: Starting token validation for token:", token);
    console.log("DEBUG: Current timestamp:", new Date().toISOString());

    try {
      const supabase = createClient();

      // First, fetch just the token
      console.log("DEBUG: Querying account_claim_tokens table");
      const { data: tokenData, error: fetchError } = await supabase
        .from("account_claim_tokens")
        .select("*")
        .eq("token", token)
        .single();

      console.log("DEBUG: Token query result:", { tokenData, fetchError });

      if (fetchError || !tokenData) {
        console.error("DEBUG: Token not found in database");
        console.error("DEBUG: Fetch error details:", fetchError);
        if (fetchError?.code === "PGRST116") {
          setError(
            "This claim link is invalid. The token was not found. Please request a new welcome email.",
          );
        } else {
          setError(
            "Unable to validate claim link. Please try again or request a new welcome email.",
          );
        }
        setLoading(false);
        return;
      }

      console.log("DEBUG: Token found, checking if already claimed");
      // No expiration check - tokens are valid until claimed
      console.log("DEBUG: Token claimed_at:", tokenData.claimed_at);

      // Check if already claimed - set a special error state
      if (tokenData.claimed_at) {
        console.error(
          "DEBUG: Token has already been claimed at:",
          tokenData.claimed_at,
        );
        setError("ALREADY_CLAIMED");
        setTokenData(tokenData);
        setLoading(false);
        return;
      }

      console.log("DEBUG: Token is valid and available for claiming");
      console.log("DEBUG: Token data:", JSON.stringify(tokenData, null, 2));

      // Now fetch the client separately
      console.log("Token data client_id:", tokenData.client_id);
      console.log("Fetching client with ID:", tokenData.client_id);

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, phone, date_of_birth")
        .eq("id", tokenData.client_id)
        .single();

      if (clientError) {
        console.error("=== CLIENT FETCH ERROR ===");
        console.error("Error code:", clientError.code);
        console.error("Error message:", clientError.message);
        console.error("Error details:", clientError.details);
        console.error("Error hint:", clientError.hint);
        console.error("Token data:", tokenData);
        console.error("Client ID being queried:", tokenData.client_id);
        console.error(
          "Failed query: SELECT * FROM clients WHERE id =",
          tokenData.client_id,
        );

        // Check if it's an RLS error
        if (
          clientError.code === "42501" ||
          clientError.message?.includes("permission")
        ) {
          console.error("This appears to be an RLS (Row Level Security) issue");
          console.error("The public/anon user cannot read this client record");
        }

        // Don't fail completely, just log the error
      }

      console.log("Client data fetched:", clientData);

      setTokenValid(true);
      setTokenData(tokenData);

      // Pre-fill form with existing client data
      if (clientData) {
        console.log("Pre-filling form with client data:");
        console.log("- First name:", clientData.first_name);
        console.log("- Last name:", clientData.last_name);
        console.log("- Phone:", clientData.phone);
        console.log("- Date of birth:", clientData.date_of_birth);

        setFormData((prev) => ({
          ...prev,
          firstName: clientData.first_name || "",
          lastName: clientData.last_name || "",
          phone: clientData.phone || "",
          dateOfBirth: clientData.date_of_birth || "",
        }));
      } else {
        console.log("No client data found to pre-fill");
        console.log("This means the query returned null/undefined");
      }
    } catch (err) {
      console.error("Error validating token:", err);
      setError("An error occurred validating your link");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!Object.values(passwordStrength).every(Boolean)) {
      setError("Password does not meet all requirements");
      return;
    }

    if (!formData.acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    setClaiming(true);
    setError("");

    try {
      const response = await fetch("/api/claim-account-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactPhone: formData.emergencyContactPhone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to claim account");
      }

      // Success! Show appropriate message
      if (result.requiresPasswordReset) {
        alert(
          "Your account already exists. Please use the 'Forgot Password' link on the login page to reset your password.",
        );
        router.push(
          `/portal/login?email=${encodeURIComponent(tokenData.email)}`,
        );
      } else if (result.requiresEmailConfirmation) {
        alert(
          "Account created successfully! Please check your email to confirm your account before logging in. You may need to check your spam folder.",
        );
        router.push("/portal/login");
      } else {
        alert(
          result.message ||
            "Account successfully claimed! You can now log in with your email and password.",
        );
        router.push(
          `/portal/login?email=${encodeURIComponent(tokenData.email)}`,
        );
      }
    } catch (err: any) {
      console.error("Error claiming account:", err);
      setError(err.message || "Failed to claim account");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!tokenValid || error) {
    // Special case for already claimed accounts
    if (error === "ALREADY_CLAIMED") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Account Already Claimed
            </h1>
            <p className="text-gray-400 mb-6">
              Great news! You've already claimed your account for{" "}
              <span className="text-white font-medium">{tokenData?.email}</span>
              .
            </p>
            <p className="text-gray-400 mb-6">
              You can now log in with your email and the password you created.
            </p>
            <button
              onClick={() => router.push("/portal/login")}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Go to Login
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Forgot your password?{" "}
              <Link
                href="/portal/forgot-password"
                className="text-blue-400 hover:text-blue-300"
              >
                Reset it here
              </Link>
            </p>
          </div>
        </div>
      );
    }

    // Regular error display
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-gray-400">
            {error || "This link is invalid or has expired."}
          </p>
          <button
            onClick={() => router.push("/portal/login")}
            className="mt-6 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Claim Your Account
          </h1>
          <p className="text-gray-400 mb-8">
            Welcome! Please set up your password and complete your profile to
            access your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={tokenData?.email || ""}
                disabled
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Create Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password strength indicators */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  {passwordStrength.hasMinLength ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-500" />
                  )}
                  <span
                    className={`text-sm ${passwordStrength.hasMinLength ? "text-green-500" : "text-gray-500"}`}
                  >
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.hasUpperCase ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-500" />
                  )}
                  <span
                    className={`text-sm ${passwordStrength.hasUpperCase ? "text-green-500" : "text-gray-500"}`}
                  >
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.hasLowerCase ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-500" />
                  )}
                  <span
                    className={`text-sm ${passwordStrength.hasLowerCase ? "text-green-500" : "text-gray-500"}`}
                  >
                    One lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.hasNumber ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-500" />
                  )}
                  <span
                    className={`text-sm ${passwordStrength.hasNumber ? "text-green-500" : "text-gray-500"}`}
                  >
                    One number
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.hasSpecialChar ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-500" />
                  )}
                  <span
                    className={`text-sm ${passwordStrength.hasSpecialChar ? "text-green-500" : "text-gray-500"}`}
                  >
                    One special character
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">
                    Passwords do not match
                  </p>
                )}
            </div>

            {/* Personal Information */}
            <div className="border-t border-gray-700 pt-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="border-t border-gray-700 pt-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Emergency Contact
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContactName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContactPhone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={formData.acceptTerms}
                onChange={(e) =>
                  setFormData({ ...formData, acceptTerms: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-300">
                I accept the terms and conditions and privacy policy *
              </label>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                claiming ||
                !formData.acceptTerms ||
                !Object.values(passwordStrength).every(Boolean)
              }
              className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                "Claim Your Account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ClaimAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <ClaimAccountContent />
    </Suspense>
  );
}
