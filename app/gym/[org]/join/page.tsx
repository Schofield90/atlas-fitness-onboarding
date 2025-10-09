"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ program?: string }>;
}

export default function JoinPage(props: PageProps) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);
  const router = useRouter();
  const supabase = createClient();

  const [organization, setOrganization] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState(
    searchParams.program || "",
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    emergencyContact: "",
    emergencyPhone: "",
    marketingConsent: false,
    termsAccepted: false,
  });

  useEffect(() => {
    fetchOrganizationData();
  }, [params.org]);

  const fetchOrganizationData = async () => {
    try {
      // Fetch organization
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .or(`slug.eq.${params.org},name.ilike.${params.org.replace("-", " ")}`)
        .single();

      if (!org) {
        router.push("/404");
        return;
      }

      setOrganization(org);

      // Fetch programs
      const { data: progs } = await supabase
        .from("programs")
        .select("*")
        .eq("organization_id", org.id)
        .eq("is_active", true);

      setPrograms(progs || []);

      // Set default program if not specified
      if (!selectedProgram && progs && progs.length > 0) {
        setSelectedProgram(progs[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      alert("Please accept the terms and conditions");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
          },
        },
      });

      if (authError) throw authError;

      // Create client record
      const { error: clientError } = await supabase.from("clients").insert({
        organization_id: organization.id,
        user_id: authData.user?.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        emergency_contact_name: formData.emergencyContact,
        emergency_contact_phone: formData.emergencyPhone,
        marketing_consent: formData.marketingConsent,
        status: "active",
      });

      if (clientError) throw clientError;

      // Redirect to payment or success page
      router.push(`/${params.org}/welcome?program=${selectedProgram}`);
    } catch (error: any) {
      console.error("Signup error:", error);
      alert(error.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  const selectedProgramData = programs.find((p) => p.id === selectedProgram);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href={`/${params.org}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to {organization.name}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-8 sm:px-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Join {organization.name}
            </h1>
            <p className="text-gray-600 mb-8">
              Create your account and start your fitness journey today
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Program Selection */}
              {programs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Membership
                  </label>
                  <div className="grid gap-4">
                    {programs.map((program) => (
                      <div
                        key={program.id}
                        className={`border rounded-lg p-4 cursor-pointer transition ${
                          selectedProgram === program.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedProgram(program.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{program.name}</h3>
                            <p className="text-sm text-gray-600">
                              {program.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              £{(program.price_pennies / 100).toFixed(0)}
                              <span className="text-sm font-normal text-gray-600">
                                /month
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.emergencyContact}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.emergencyPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyPhone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Agreements */}
              <div className="space-y-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.marketingConsent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        marketingConsent: e.target.checked,
                      })
                    }
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to receive marketing communications about offers,
                    events, and updates
                  </span>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    required
                    checked={formData.termsAccepted}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        termsAccepted: e.target.checked,
                      })
                    }
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {/* Summary */}
              {selectedProgramData && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Membership Summary</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{selectedProgramData.name}</p>
                      <p className="text-sm text-gray-600">
                        {selectedProgramData.description}
                      </p>
                    </div>
                    <p className="text-2xl font-bold">
                      £{(selectedProgramData.price_pennies / 100).toFixed(2)}
                      /month
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Creating Account...
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
