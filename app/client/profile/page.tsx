"use client";

import {
  User,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  Save,
  Camera,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { format, parseISO } from "date-fns";

export default function ClientProfilePage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    height_cm: "",
    weight_kg: "",
    fitness_goal: "maintain",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    medical_notes: "",
  });
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/client-portal/login");
      return;
    }

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!clientData) {
      router.push("/client-portal/login");
      return;
    }

    setClient(clientData);
    setFormData({
      first_name: clientData.first_name || "",
      last_name: clientData.last_name || "",
      email: clientData.email || "",
      phone: clientData.phone || "",
      date_of_birth: clientData.date_of_birth || "",
      height_cm: clientData.height_cm || "",
      weight_kg: clientData.weight_kg || "",
      fitness_goal: clientData.fitness_goal || "maintain",
      emergency_contact_name: clientData.emergency_contact_name || "",
      emergency_contact_phone: clientData.emergency_contact_phone || "",
      medical_notes: clientData.medical_notes || "",
    });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Use the API endpoint to update client and sync with nutrition profile
      const response = await fetch("/api/clients/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: client.id,
          ...formData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setClient({ ...client, ...formData });
        alert("Profile updated successfully!");
      } else {
        console.error("Error updating profile:", result.error);
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push("/client")}
              className="mr-4 text-gray-300 hover:text-orange-500 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="h-24 w-24 rounded-full bg-gray-700 flex items-center justify-center">
                <User className="h-12 w-12 text-gray-500" />
              </div>
              <div className="ml-6">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Change Photo
                </button>
                <p className="text-sm text-gray-400 mt-1">
                  JPG, PNG or GIF. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+44 7XXX XXXXXX"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Fitness Information */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Fitness Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) =>
                    setFormData({ ...formData, height_cm: e.target.value })
                  }
                  placeholder="170"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={(e) =>
                    setFormData({ ...formData, weight_kg: e.target.value })
                  }
                  placeholder="70"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Fitness Goal
                </label>
                <select
                  value={formData.fitness_goal}
                  onChange={(e) =>
                    setFormData({ ...formData, fitness_goal: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="lose_weight">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain_muscle">Gain Muscle</option>
                  <option value="improve_health">Improve Health</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-3">
              This information will be used to personalize your nutrition and
              workout plans.
            </p>
          </div>

          {/* Emergency Contact */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergency_contact_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergency_contact_phone: e.target.value,
                    })
                  }
                  placeholder="+44 7XXX XXXXXX"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Medical Information
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Medical Notes / Conditions
              </label>
              <textarea
                value={formData.medical_notes}
                onChange={(e) =>
                  setFormData({ ...formData, medical_notes: e.target.value })
                }
                rows={4}
                placeholder="Please list any medical conditions, injuries, or medications we should be aware of..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Account Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Member ID</span>
                <span className="font-medium text-gray-200">
                  {client.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Member Since</span>
                <span className="font-medium text-gray-200">
                  {client.created_at
                    ? format(parseISO(client.created_at), "MMMM yyyy")
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Account Status</span>
                <span className="font-medium text-green-400">Active</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Waivers & Forms */}
        <div className="mt-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Waivers & Forms
          </h3>
          <div className="space-y-3">
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <p className="text-gray-400 text-sm">
                No forms or waivers to sign at this time.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Required forms will appear here when available.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Account Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Change Password</span>
                <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Privacy Settings</span>
                <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Download My Data</span>
                <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
