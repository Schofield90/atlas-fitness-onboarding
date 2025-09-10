"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/app/hooks/useOrganization";
import { Building2, Dumbbell, Users, ArrowRight } from "lucide-react";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { refreshOrganization } = useOrganization();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "gym",
    phone: "",
    address: "",
    city: "",
    postcode: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }

      // Ensure user exists in users table
      const { error: userInsertError } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email || "",
          full_name:
            user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          metadata: user.user_metadata || {},
        },
        {
          onConflict: "id",
        },
      );

      if (userInsertError) {
        console.error("Error ensuring user record:", userInsertError);
      }

      // Create a slug from the organization name
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Create organization - using actual database schema
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: formData.name,
          slug: slug,
          plan: "starter", // Default plan
          type: formData.type, // type column exists
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          settings: {
            postcode: formData.postcode,
            // Store features in settings since there's no features column
            features: {
              gym: formData.type === "gym" || formData.type === "hybrid",
              coaching:
                formData.type === "coaching" || formData.type === "hybrid",
            },
          },
          metadata: {
            created_by: user.id,
            owner_id: user.id, // Store owner in metadata since there's no owner_id column
          },
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        if (orgError.code === "23505") {
          alert(
            "An organization with this name already exists. Please choose a different name.",
          );
        } else {
          alert(orgError.message || "Failed to create organization");
        }
        return;
      }

      // Create organization_members entry to link the user as owner
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          user_id: user.id,
          org_id: org.id,
          role: "owner",
          permissions: {
            all: true, // Owner has all permissions
          },
        });

      if (memberError) {
        console.error("Error creating organization member:", memberError);
        // Try to clean up the organization if member creation fails
        await supabase.from("organizations").delete().eq("id", org.id);
        alert("Failed to complete organization setup. Please try again.");
        return;
      }

      // Refresh organization context
      await refreshOrganization();

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error creating organization:", error);
      alert(
        error.message || "An error occurred while creating your organization",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            Welcome to GymLeadHub!
          </h2>
          <p className="mt-2 text-gray-400">
            Let's set up your organization to get started
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="GymLeadHub Manchester"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "gym" })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.type === "gym"
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : "border-gray-600 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  <Dumbbell className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">Gym</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "coaching" })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.type === "coaching"
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : "border-gray-600 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  <Users className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">Coaching</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "hybrid" })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.type === "hybrid"
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : "border-gray-600 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  <div className="flex justify-center gap-1">
                    <Dumbbell className="h-4 w-4" />
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-xs">Both</span>
                </button>
              </div>
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="+44 7777 777777"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  placeholder="Manchester"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) =>
                    setFormData({ ...formData, postcode: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  placeholder="M1 1AA"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating || !formData.name}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Organization...
                </>
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500">
          By creating an organization, you agree to our{" "}
          <Link href="/terms" className="text-orange-500 hover:text-orange-400">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-orange-500 hover:text-orange-400"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
