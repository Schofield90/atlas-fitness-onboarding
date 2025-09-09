"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/app/lib/supabase-browser";
import { Eye, EyeOff, Check, X, Loader2, CreditCard, Mail } from "lucide-react";

// Membership plans (in production these would come from database)
const MEMBERSHIP_PLANS = [
  {
    id: "basic",
    name: "Basic Membership",
    price: 29.99,
    features: ["Gym access", "Basic equipment", "Locker room access"],
  },
  {
    id: "premium",
    name: "Premium Membership",
    price: 59.99,
    features: [
      "All Basic features",
      "Group classes",
      "Personal training discount",
      "Guest passes",
    ],
  },
  {
    id: "elite",
    name: "Elite Membership",
    price: 99.99,
    features: [
      "All Premium features",
      "Unlimited personal training",
      "Nutrition coaching",
      "Priority booking",
    ],
  },
];

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get("plan") || "basic";
  const organizationId = searchParams.get("org");

  const [step, setStep] = useState(1); // 1: Plan, 2: Account, 3: Payment
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(planId);
  const [authMethod, setAuthMethod] = useState<"password" | "magic-link">(
    "password",
  );

  const [formData, setFormData] = useState({
    email: "",
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

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setStep(2);
  };

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate based on auth method
    if (authMethod === "password") {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (!Object.values(passwordStrength).every(Boolean)) {
        setError("Password does not meet all requirements");
        return;
      }
    }

    if (!formData.acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();

      if (authMethod === "password") {
        // Create account with password
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone,
              },
            },
          },
        );

        if (authError) {
          throw authError;
        }

        if (!authData.user) {
          throw new Error("Failed to create account");
        }

        // Create client record
        const { error: clientError } = await supabase.from("clients").insert({
          user_id: authData.user.id,
          organization_id: organizationId || "default", // In production, get from context
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth || null,
          emergency_contact_name: formData.emergencyContactName || null,
          emergency_contact_phone: formData.emergencyContactPhone || null,
          status: "active",
          is_claimed: true,
          metadata: {
            selected_plan: selectedPlan,
            signup_method: "self-serve",
          },
        });

        if (clientError) {
          console.error("Error creating client record:", clientError);
          // Don't fail the whole process
        }

        // Check if email confirmation is required
        if (authData.user.email_confirmed_at === null) {
          alert(
            "Account created! Please check your email to confirm your account before logging in.",
          );
        } else {
          alert("Account created successfully! Redirecting to payment...");
          // In production, redirect to payment flow
          // For now, redirect to dashboard
          router.push("/dashboard");
        }
      } else {
        // Send magic link
        const { error: magicError } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              phone: formData.phone,
            },
          },
        });

        if (magicError) {
          throw magicError;
        }

        alert(
          "Magic link sent! Please check your email for a login link. You may need to check your spam folder.",
        );
        router.push("/portal/login");
      }
    } catch (err: any) {
      console.error("Error creating account:", err);
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 1
                  ? "bg-orange-500 text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              1
            </div>
            <div
              className={`w-20 h-1 ${step >= 2 ? "bg-orange-500" : "bg-gray-700"}`}
            />
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 2
                  ? "bg-orange-500 text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              2
            </div>
            <div
              className={`w-20 h-1 ${step >= 3 ? "bg-orange-500" : "bg-gray-700"}`}
            />
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 3
                  ? "bg-orange-500 text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              3
            </div>
          </div>
        </div>

        {/* Step 1: Choose Plan */}
        {step === 1 && (
          <div className="bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Choose Your Membership
            </h1>
            <p className="text-gray-400 mb-8">
              Select the plan that works best for you
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {MEMBERSHIP_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-3xl font-bold text-orange-500 mb-4">
                    ${plan.price}
                    <span className="text-sm text-gray-400">/month</span>
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePlanSelect(plan.id)}
                    className="w-full mt-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Create Account */}
        {step === 2 && (
          <div className="bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Create Your Account
            </h1>
            <p className="text-gray-400 mb-8">
              Join Atlas Fitness with the{" "}
              {MEMBERSHIP_PLANS.find((p) => p.id === selectedPlan)?.name}
            </p>

            {/* Auth Method Toggle */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setAuthMethod("password")}
                className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  authMethod === "password"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Password
              </button>
              <button
                onClick={() => setAuthMethod("magic-link")}
                className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  authMethod === "magic-link"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <Mail className="w-5 h-5" />
                Magic Link
              </button>
            </div>

            <form onSubmit={handleAccountCreation} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="your@email.com"
                />
              </div>

              {/* Password fields (only for password auth) */}
              {authMethod === "password" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password *
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
                      {Object.entries(passwordStrength).map(([key, valid]) => (
                        <div key={key} className="flex items-center gap-2">
                          {valid ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-gray-500" />
                          )}
                          <span
                            className={`text-sm ${valid ? "text-green-500" : "text-gray-500"}`}
                          >
                            {key === "hasMinLength" && "At least 8 characters"}
                            {key === "hasUpperCase" && "One uppercase letter"}
                            {key === "hasLowerCase" && "One lowercase letter"}
                            {key === "hasNumber" && "One number"}
                            {key === "hasSpecialChar" &&
                              "One special character"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

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
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
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
                </>
              )}

              {/* Personal Information */}
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

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.acceptTerms ||
                    (authMethod === "password" &&
                      !Object.values(passwordStrength).every(Boolean))
                  }
                  className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : authMethod === "password" ? (
                    "Create Account & Continue"
                  ) : (
                    "Send Magic Link"
                  )}
                </button>
              </div>
            </form>

            <p className="text-center text-gray-400 mt-6">
              Already have an account?{" "}
              <Link
                href="/portal/login"
                className="text-orange-500 hover:text-orange-400"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
