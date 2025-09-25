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
  const [hasPassword, setHasPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    height_cm: "",
    weight_kg: "",
    fitness_goal: "maintain",
    activity_level: "moderately_active",
    dietary_type: "balanced",
    allergies: [] as string[],
    cooking_time: "moderate",
    meals_per_day: 3,
    target_calories: 0,
    protein_grams: 0,
    carbs_grams: 0,
    fat_grams: 0,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    medical_notes: "",
  });
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/simple-login");
      return;
    }

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!clientData) {
      router.push("/simple-login");
      return;
    }

    setClient(clientData);

    // Check if user has a password set (only if password_hash column exists)
    try {
      setHasPassword(!!clientData.password_hash);
    } catch (error) {
      // If password_hash column doesn't exist yet, default to false
      setHasPassword(false);
    }

    // Try to load nutrition data from localStorage if database columns don't exist
    const savedNutrition = localStorage.getItem(`nutrition_${clientData.id}`);
    const nutritionData = savedNutrition ? JSON.parse(savedNutrition) : {};

    setFormData({
      first_name: clientData.first_name || "",
      last_name: clientData.last_name || "",
      email: clientData.email || "",
      phone: clientData.phone || "",
      date_of_birth: clientData.date_of_birth || "",
      height_cm: clientData.height_cm || nutritionData.height_cm || "",
      weight_kg: clientData.weight_kg || nutritionData.weight_kg || "",
      fitness_goal:
        clientData.fitness_goal || nutritionData.fitness_goal || "maintain",
      activity_level:
        clientData.activity_level ||
        nutritionData.activity_level ||
        "moderately_active",
      dietary_type:
        clientData.dietary_type || nutritionData.dietary_type || "balanced",
      allergies: clientData.allergies || nutritionData.allergies || [],
      cooking_time:
        clientData.cooking_time || nutritionData.cooking_time || "moderate",
      meals_per_day:
        clientData.meals_per_day || nutritionData.meals_per_day || 3,
      target_calories: clientData.target_calories || 0,
      protein_grams: clientData.protein_grams || 0,
      carbs_grams: clientData.carbs_grams || 0,
      fat_grams: clientData.fat_grams || 0,
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
      // Try the full update first
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

      if (!result.success && response.status === 500) {
        // If it fails with 500, try the safe endpoint
        console.log("Using safe update endpoint...");
        const safeResponse = await fetch("/api/clients/update-safe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: client.id,
            ...formData,
          }),
        });

        const safeResult = await safeResponse.json();

        if (safeResult.success) {
          setClient({ ...client, ...formData });

          // Save nutrition data to localStorage
          if (safeResult.nutritionData) {
            localStorage.setItem(
              `nutrition_${client.id}`,
              JSON.stringify(safeResult.nutritionData),
            );
          }

          alert("Profile updated successfully! (Nutrition data saved locally)");
        } else {
          console.error("Error updating profile:", safeResult.error);
          alert("Failed to update profile");
        }
      } else if (result.success) {
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

          {/* Nutrition Preferences */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Nutrition Preferences
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Activity Level
                </label>
                <select
                  value={formData.activity_level}
                  onChange={(e) =>
                    setFormData({ ...formData, activity_level: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="sedentary">
                    Sedentary (little or no exercise)
                  </option>
                  <option value="lightly_active">
                    Lightly Active (1-3 days/week)
                  </option>
                  <option value="moderately_active">
                    Moderately Active (3-5 days/week)
                  </option>
                  <option value="very_active">
                    Very Active (6-7 days/week)
                  </option>
                  <option value="extra_active">Extra Active (athlete)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dietary Type
                </label>
                <select
                  value={formData.dietary_type}
                  onChange={(e) =>
                    setFormData({ ...formData, dietary_type: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="balanced">Balanced</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="paleo">Paleo</option>
                  <option value="mediterranean">Mediterranean</option>
                  <option value="low_carb">Low Carb</option>
                  <option value="high_protein">High Protein</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cooking Time Available
                </label>
                <select
                  value={formData.cooking_time}
                  onChange={(e) =>
                    setFormData({ ...formData, cooking_time: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="minimal">Minimal (15 mins or less)</option>
                  <option value="moderate">Moderate (30 mins)</option>
                  <option value="extensive">Extensive (1 hour+)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Meals Per Day
                </label>
                <select
                  value={formData.meals_per_day}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meals_per_day: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="2">2 meals</option>
                  <option value="3">3 meals</option>
                  <option value="4">4 meals</option>
                  <option value="5">5 meals</option>
                  <option value="6">6 meals</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Allergies or Dietary Restrictions
                </label>
                <input
                  type="text"
                  value={formData.allergies.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allergies: e.target.value
                        .split(",")
                        .map((a) => a.trim())
                        .filter((a) => a),
                    })
                  }
                  placeholder="e.g., nuts, dairy, gluten (comma separated)"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
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
            <button
              onClick={() => router.push("/client/settings/password")}
              className="w-full text-left px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-300">
                  {hasPassword ? "Change Password" : "Set Password"}
                </span>
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
