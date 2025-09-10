"use client";

import { useState, useEffect } from "react";
import {
  User,
  Target,
  Activity,
  Utensils,
  ChevronRight,
  ChevronLeft,
  Calculator,
  Info,
  Check,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

interface NutritionSetupProps {
  client: any;
  onComplete: (profile: any) => void;
  existingProfile?: any;
}

// Unit conversion helpers
const convertHeight = (formData: any): number => {
  if (formData.heightUnit === "ft") {
    const feet = parseFloat(formData.heightFt) || 0;
    const inches = parseFloat(formData.heightIn) || 0;
    return Math.round(feet * 30.48 + inches * 2.54); // Convert to cm
  }
  return parseFloat(formData.height) || 0;
};

const convertWeight = (formData: any): number => {
  if (formData.weightUnit === "lbs") {
    return parseFloat(formData.weightLbs) * 0.453592; // Convert to kg
  } else if (formData.weightUnit === "stone") {
    const stone = parseFloat(formData.weightStone) || 0;
    const lbs = parseFloat(formData.weightStoneLbs) || 0;
    return stone * 6.35029 + lbs * 0.453592; // Convert to kg
  }
  return parseFloat(formData.weight) || 0;
};

// BMR calculation using Mifflin-St Jeor formula
const calculateBMR = (
  weight: number,
  height: number,
  age: number,
  gender: string,
): number => {
  if (gender === "male") {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
};

// TDEE calculation based on activity level
const calculateTDEE = (bmr: number, activityLevel: string): number => {
  const multipliers: { [key: string]: number } = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  return Math.round(bmr * multipliers[activityLevel]);
};

// Calculate target calories based on goal
const calculateTargetCalories = (
  tdee: number,
  goal: string,
  weeklyChange: number = 0.5,
): number => {
  const dailyDeficitSurplus = (weeklyChange * 7700) / 7; // 7700 cal = 1kg fat

  switch (goal) {
    case "lose_weight":
      return Math.round(tdee - dailyDeficitSurplus);
    case "gain_muscle":
      return Math.round(tdee + dailyDeficitSurplus * 0.5); // More conservative for muscle gain
    case "maintain":
    default:
      return tdee;
  }
};

export default function NutritionSetup({
  client,
  onComplete,
  existingProfile,
}: NutritionSetupProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Form data
  const [formData, setFormData] = useState({
    // Basic stats
    height: existingProfile?.height_cm || "",
    weight: existingProfile?.weight_kg || "",
    heightFt: "",
    heightIn: "",
    weightLbs: "",
    weightStone: "",
    weightStoneLbs: "",
    heightUnit: "cm" as "cm" | "ft",
    weightUnit: "kg" as "kg" | "lbs" | "stone",
    age: existingProfile?.age || "",
    gender: existingProfile?.gender || "male",
    activityLevel: existingProfile?.activity_level || "moderately_active",

    // Goals
    goal: existingProfile?.goal || "maintain",
    targetWeight: existingProfile?.target_weight_kg || "",
    weeklyChange: existingProfile?.weekly_weight_change_kg || 0.5,

    // Calculated values
    bmr: 0,
    tdee: 0,
    targetCalories: 0,

    // Macros (will be calculated)
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    proteinPercent: 30,
    carbsPercent: 40,
    fatPercent: 30,

    // Meal preferences
    mealsPerDay: existingProfile?.meals_per_day || 3,
    snacksPerDay: existingProfile?.snacks_per_day || 2,

    // Food preferences
    dietaryType: "",
    allergies: [] as string[],
    intolerances: [] as string[],
    likedFoods: [] as string[],
    dislikedFoods: [] as string[],
    cookingTime: "moderate",
    cookingSkill: "intermediate",
  });

  // Recalculate when units or values change
  useEffect(() => {
    if (step >= 2) {
      updateCalculations();
    }
  }, [
    formData.heightUnit,
    formData.weightUnit,
    formData.height,
    formData.weight,
    formData.heightFt,
    formData.heightIn,
    formData.weightLbs,
    formData.weightStone,
    formData.weightStoneLbs,
  ]);

  const updateCalculations = () => {
    const heightCm = convertHeight(formData);
    const weightKg = convertWeight(formData);

    if (weightKg > 0 && heightCm > 0 && formData.age) {
      const bmr = calculateBMR(
        weightKg,
        heightCm,
        parseInt(formData.age),
        formData.gender,
      );

      const tdee = calculateTDEE(bmr, formData.activityLevel);
      const targetCalories = calculateTargetCalories(
        tdee,
        formData.goal,
        formData.weeklyChange,
      );

      // Calculate macros based on percentages
      const proteinCalories = (targetCalories * formData.proteinPercent) / 100;
      const carbsCalories = (targetCalories * formData.carbsPercent) / 100;
      const fatCalories = (targetCalories * formData.fatPercent) / 100;

      setFormData((prev) => ({
        ...prev,
        bmr,
        tdee,
        targetCalories,
        proteinGrams: Math.round(proteinCalories / 4),
        carbsGrams: Math.round(carbsCalories / 4),
        fatGrams: Math.round(fatCalories / 9),
      }));
    }
  };

  const handleMacroPercentChange = (macro: string, value: number) => {
    const newData = { ...formData, [`${macro}Percent`]: value };

    // Adjust other macros to maintain 100% total
    const total =
      newData.proteinPercent + newData.carbsPercent + newData.fatPercent;
    if (total !== 100) {
      const diff = 100 - value;
      const otherMacros = ["protein", "carbs", "fat"].filter(
        (m) => m !== macro,
      );
      const splitDiff = diff / otherMacros.length;

      otherMacros.forEach((m) => {
        newData[`${m}Percent`] = Math.round(splitDiff);
      });
    }

    setFormData(newData);
    updateCalculations();
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Convert units to metric for database storage
      const heightCm = convertHeight(formData);
      const weightKg = convertWeight(formData);

      // Determine whether to use client_id or lead_id based on what's available
      let useClientId = null;
      let useLeadId = null;

      // Priority 1: Use client.id directly if available
      if (client.id) {
        useClientId = client.id;
        console.log("Using client_id for nutrition profile:", useClientId);
      } else if (client.lead_id) {
        // Priority 2: Use existing lead_id from client
        useLeadId = client.lead_id;
        console.log("Using existing lead_id for nutrition profile:", useLeadId);
      } else {
        // Priority 3: Search for lead by email or other identifiers
        console.log(
          "No direct client_id or lead_id, searching for matching lead...",
        );

        if (client.email) {
          const { data: leadByEmail, error: emailError } = await supabase
            .from("leads")
            .select("id")
            .eq("email", client.email)
            .single();

          if (!emailError && leadByEmail) {
            useLeadId = leadByEmail.id;
            console.log("Found matching lead by email:", useLeadId);
          }
        }

        // If still no lead found, try by any available client identifier
        if (!useLeadId && client.id) {
          const { data: leadByClientId, error: clientIdError } = await supabase
            .from("leads")
            .select("id")
            .eq("client_id", client.id)
            .single();

          if (!clientIdError && leadByClientId) {
            useLeadId = leadByClientId.id;
            console.log("Found matching lead by client reference:", useLeadId);
          }
        }

        // If neither client_id nor lead_id can be determined, show error
        if (!useClientId && !useLeadId) {
          alert(
            "Unable to save nutrition profile: No valid client or lead reference found. Please contact support.",
          );
          setSaving(false);
          return;
        }
      }

      // Map activity level to match database expectations (UPPERCASE)
      const activityLevelMap: Record<string, string> = {
        sedentary: "SEDENTARY",
        lightly_active: "LIGHTLY_ACTIVE",
        moderately_active: "MODERATELY_ACTIVE",
        very_active: "VERY_ACTIVE",
        extra_active: "EXTRA_ACTIVE",
      };

      // Map cooking time to match database expectations (UPPERCASE)
      const cookingTimeMap: Record<string, string> = {
        quick: "MINIMAL",
        moderate: "MODERATE",
        extensive: "EXTENSIVE",
      };

      // Build nutrition profile data with flexible FK approach
      const profileData: any = {
        // Organization is always required
        organization_id: client.organization_id || client.org_id,

        // Set either client_id OR lead_id, never both
        ...(useClientId && { client_id: useClientId }),
        ...(useLeadId && { lead_id: useLeadId }),

        // Required demographic fields
        age: parseInt(formData.age),
        gender:
          formData.gender === "male"
            ? "MALE"
            : formData.gender === "female"
              ? "FEMALE"
              : "OTHER",
        sex:
          formData.gender === "male"
            ? "MALE"
            : formData.gender === "female"
              ? "FEMALE"
              : "OTHER",
        activity_level:
          activityLevelMap[formData.activityLevel] || "MODERATELY_ACTIVE",

        // Physical measurements - use the actual column names from database
        height: heightCm, // The column is named 'height' not 'height_cm'
        height_cm: heightCm, // Keep both for compatibility
        current_weight: weightKg, // The column is named 'current_weight' not 'weight_kg'
        weight_kg: weightKg, // Keep both for compatibility
        goal_weight: formData.targetWeight
          ? parseFloat(formData.targetWeight)
          : weightKg,
        target_weight_kg: formData.targetWeight
          ? parseFloat(formData.targetWeight)
          : weightKg,

        // Goals
        goal: formData.goal?.toUpperCase() || "MAINTAIN",
        weekly_weight_change_kg: formData.weeklyChange || 0.5,

        // Calculated nutrition values
        bmr: formData.bmr || null,
        tdee: formData.tdee || null,
        target_calories: formData.targetCalories || null,
        protein_grams: Math.round(formData.proteinGrams) || null,
        carbs_grams: Math.round(formData.carbsGrams) || null,
        fat_grams: Math.round(formData.fatGrams) || null,
        fiber_grams: 25, // Default recommended fiber

        // Training and lifestyle preferences
        training_frequency: 3, // Default 3x per week
        training_types: [], // Empty array - can be populated later
        dietary_preferences: formData.dietaryType ? [formData.dietaryType] : [],
        allergies: formData.allergies || [],
        food_likes: formData.likedFoods || [],
        food_dislikes: formData.dislikedFoods || [],
        cooking_time: cookingTimeMap[formData.cookingTime] || "MODERATE",
        budget_constraint: "MODERATE", // Default

        // Meal planning
        meals_per_day: formData.mealsPerDay || 3,
        snacks_per_day: formData.snacksPerDay || 2,

        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save to database - try with client_id first, fall back to lead_id
      let { data, error } = await supabase
        .from("nutrition_profiles")
        .upsert(profileData)
        .select()
        .single();

      // If client_id column doesn't exist, retry with only lead_id
      if (
        error &&
        error.code === "PGRST204" &&
        error.message.includes("client_id")
      ) {
        console.log("client_id not supported, retrying with lead_id only");

        // Remove client_id and ensure we have lead_id
        delete profileData.client_id;

        // If we don't have a lead_id, we need to find or create one
        if (!profileData.lead_id) {
          console.log(
            "No lead_id available, searching for or creating lead...",
          );

          // Try to find existing lead by email
          let leadId = null;
          if (client.email) {
            const { data: leadByEmail } = await supabase
              .from("leads")
              .select("id")
              .eq("email", client.email)
              .eq("organization_id", client.organization_id || client.org_id)
              .single();

            if (leadByEmail) {
              leadId = leadByEmail.id;
              console.log("Found existing lead by email:", leadId);
            }
          }

          // If no lead found, create one
          if (!leadId) {
            const { data: newLead, error: leadError } = await supabase
              .from("leads")
              .insert({
                email: client.email || `client_${client.id}@temp.com`,
                first_name:
                  client.first_name || client.name?.split(" ")[0] || "Unknown",
                last_name:
                  client.last_name ||
                  client.name?.split(" ").slice(1).join(" ") ||
                  "",
                phone: client.phone || "",
                organization_id: client.organization_id || client.org_id,
                client_id: client.id,
                status: "CLIENT",
                source: "NUTRITION_PROFILE",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!leadError && newLead) {
              leadId = newLead.id;
              console.log("Created new lead:", leadId);
            } else {
              console.error("Failed to create lead:", leadError);
              alert(
                "Unable to save nutrition profile. Please contact support.",
              );
              setSaving(false);
              return;
            }
          }

          profileData.lead_id = leadId;
        }

        // Retry with lead_id only
        const retryResult = await supabase
          .from("nutrition_profiles")
          .upsert(profileData)
          .select()
          .single();

        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error("Error saving nutrition profile:", error);
        console.error("Error details:", error.code, error.message);

        if (
          error.code === "23503" &&
          error.message.includes("foreign key constraint")
        ) {
          // Foreign key constraint error - try to create a lead and retry
          console.log("Foreign key error detected, attempting recovery...");

          try {
            // Create a lead record if it doesn't exist
            const { data: newLead, error: leadError } = await supabase
              .from("leads")
              .insert({
                email: client.email || `client_${client.id}@placeholder.com`,
                first_name:
                  client.first_name || client.name?.split(" ")[0] || "Unknown",
                last_name:
                  client.last_name ||
                  client.name?.split(" ").slice(1).join(" ") ||
                  "User",
                phone: client.phone || "",
                organization_id: client.organization_id || client.org_id,
                client_id: client.id,
                status: "CLIENT",
                source: "NUTRITION_SETUP",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!leadError && newLead) {
              console.log("Created lead for recovery:", newLead.id);

              // Retry with the new lead_id
              const retryData = {
                ...profileData,
                lead_id: newLead.id,
                client_id: undefined, // Remove client_id to use lead_id instead
              };

              const { data: retryResult, error: retryError } = await supabase
                .from("nutrition_profiles")
                .upsert(retryData)
                .select()
                .single();

              if (!retryError && retryResult) {
                console.log("Profile saved successfully after lead creation");
                onComplete(retryResult);
                return;
              }
            }
          } catch (recoveryError) {
            console.error("Recovery failed:", recoveryError);
          }

          // If recovery failed, show user-friendly error
          alert(
            "Unable to save nutrition profile. We're working on fixing this issue. Please try again later or contact support.",
          );
        } else if (error.code === "23502") {
          alert(
            "Unable to save nutrition profile: Missing required information. Please check all fields are completed.",
          );
        } else if (error.code === "23514") {
          alert(
            "Unable to save nutrition profile: Data validation error. Please check your input values.",
          );
        } else if (error.code === "42P01") {
          alert(
            "Unable to save nutrition profile: Database configuration issue. Please contact support.",
          );
        } else {
          alert(
            "Failed to save your nutrition profile. Please try again or contact support if the problem persists.",
          );
        }
        return;
      }

      console.log("Nutrition profile saved successfully:", data);

      // Update client record with the lead_id reference if we used lead_id
      if (useLeadId && useLeadId !== client.lead_id && client.id) {
        const { error: updateError } = await supabase
          .from("clients")
          .update({ lead_id: useLeadId })
          .eq("id", client.id);

        if (updateError) {
          console.warn("Failed to update client.lead_id:", updateError);
        } else {
          console.log("Updated client record with lead_id:", useLeadId);
        }
      }

      // Complete the setup
      onComplete(data);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(
        "An unexpected error occurred. Please try again or contact support if the problem persists.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  s <= step
                    ? "bg-orange-600 text-white"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {s < step ? <Check className="h-5 w-5" /> : s}
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-700 rounded-full">
            <div
              className="h-full bg-orange-600 rounded-full transition-all"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <User className="h-6 w-6 text-orange-500" />
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Height Input with Unit Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Height
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.heightUnit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        heightUnit: e.target.value as any,
                      })
                    }
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="cm">cm</option>
                    <option value="ft">ft/in</option>
                  </select>
                  {formData.heightUnit === "cm" ? (
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) =>
                        setFormData({ ...formData, height: e.target.value })
                      }
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                      placeholder="170"
                    />
                  ) : (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="number"
                        value={formData.heightFt}
                        onChange={(e) =>
                          setFormData({ ...formData, heightFt: e.target.value })
                        }
                        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                        placeholder="5"
                      />
                      <span className="text-gray-400 py-2">ft</span>
                      <input
                        type="number"
                        value={formData.heightIn}
                        onChange={(e) =>
                          setFormData({ ...formData, heightIn: e.target.value })
                        }
                        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                        placeholder="10"
                      />
                      <span className="text-gray-400 py-2">in</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Weight Input with Unit Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Weight
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.weightUnit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weightUnit: e.target.value as any,
                      })
                    }
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="stone">st/lbs</option>
                  </select>
                  {formData.weightUnit === "kg" ? (
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({ ...formData, weight: e.target.value })
                      }
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                      placeholder="70"
                    />
                  ) : formData.weightUnit === "lbs" ? (
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weightLbs}
                      onChange={(e) =>
                        setFormData({ ...formData, weightLbs: e.target.value })
                      }
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                      placeholder="154"
                    />
                  ) : (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="number"
                        value={formData.weightStone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            weightStone: e.target.value,
                          })
                        }
                        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                        placeholder="11"
                      />
                      <span className="text-gray-400 py-2">st</span>
                      <input
                        type="number"
                        value={formData.weightStoneLbs}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            weightStoneLbs: e.target.value,
                          })
                        }
                        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                        placeholder="0"
                      />
                      <span className="text-gray-400 py-2">lbs</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({ ...formData, age: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Activity Level
                </label>
                <select
                  value={formData.activityLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, activityLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                  <option value="extra_active">
                    Extra Active (very hard exercise/physical job)
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  updateCalculations();
                  setStep(2);
                }}
                disabled={
                  !formData.age ||
                  (formData.heightUnit === "cm" && !formData.height) ||
                  (formData.heightUnit === "ft" &&
                    (!formData.heightFt || !formData.heightIn)) ||
                  (formData.weightUnit === "kg" && !formData.weight) ||
                  (formData.weightUnit === "lbs" && !formData.weightLbs) ||
                  (formData.weightUnit === "stone" &&
                    (!formData.weightStone || !formData.weightStoneLbs))
                }
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="h-6 w-6 text-orange-500" />
              Your Goals
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Primary Goal
                </label>
                <select
                  value={formData.goal}
                  onChange={(e) => {
                    setFormData({ ...formData, goal: e.target.value });
                    updateCalculations();
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="lose_weight">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain_muscle">Gain Muscle</option>
                  <option value="improve_health">Improve Overall Health</option>
                </select>
              </div>

              {formData.goal !== "maintain" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Target Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.targetWeight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetWeight: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="65"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Weekly Change Target (kg)
                    </label>
                    <select
                      value={formData.weeklyChange}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          weeklyChange: parseFloat(e.target.value),
                        });
                        updateCalculations();
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="0.25">0.25 kg/week (Slow & Steady)</option>
                      <option value="0.5">0.5 kg/week (Moderate)</option>
                      <option value="0.75">0.75 kg/week (Aggressive)</option>
                      <option value="1">1 kg/week (Very Aggressive)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Calorie Calculation Display */}
              {formData.bmr > 0 && (
                <div className="bg-gray-700 rounded-lg p-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Your Calorie Calculations
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        BMR (Basal Metabolic Rate)
                      </span>
                      <span className="text-white font-medium">
                        {formData.bmr} cal
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">TDEE (Maintenance)</span>
                      <span className="text-white font-medium">
                        {formData.tdee} cal
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600 pt-2">
                      <span className="text-gray-400">Daily Target</span>
                      <span className="text-orange-500 font-bold text-lg">
                        {formData.targetCalories} cal
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Macros */}
        {step === 3 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="h-6 w-6 text-orange-500" />
              Macro Breakdown
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Daily Calories</span>
                  <span className="text-xl font-bold text-orange-500">
                    {formData.targetCalories}
                  </span>
                </div>
              </div>

              {/* Protein */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-white">
                    Protein
                  </label>
                  <span className="text-white">
                    {formData.proteinGrams}g ({formData.proteinPercent}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="40"
                  value={formData.proteinPercent}
                  onChange={(e) =>
                    handleMacroPercentChange(
                      "protein",
                      parseInt(e.target.value),
                    )
                  }
                  className="w-full"
                />
                <div className="mt-1 text-xs text-gray-500">
                  {formData.proteinGrams * 4} calories from protein
                </div>
              </div>

              {/* Carbs */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-white">
                    Carbohydrates
                  </label>
                  <span className="text-white">
                    {formData.carbsGrams}g ({formData.carbsPercent}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="65"
                  value={formData.carbsPercent}
                  onChange={(e) =>
                    handleMacroPercentChange("carbs", parseInt(e.target.value))
                  }
                  className="w-full"
                />
                <div className="mt-1 text-xs text-gray-500">
                  {formData.carbsGrams * 4} calories from carbs
                </div>
              </div>

              {/* Fat */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-white">Fat</label>
                  <span className="text-white">
                    {formData.fatGrams}g ({formData.fatPercent}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="40"
                  value={formData.fatPercent}
                  onChange={(e) =>
                    handleMacroPercentChange("fat", parseInt(e.target.value))
                  }
                  className="w-full"
                />
                <div className="mt-1 text-xs text-gray-500">
                  {formData.fatGrams * 9} calories from fat
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-400 mt-0.5" />
                  <p className="text-sm text-blue-300">
                    These macros are fully customizable. Your coach can also
                    adjust them based on your progress and needs.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Meal Preferences */}
        {step === 4 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Utensils className="h-6 w-6 text-orange-500" />
              Meal Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Meals per Day
                </label>
                <select
                  value={formData.mealsPerDay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mealsPerDay: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "meal" : "meals"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Snacks per Day
                </label>
                <select
                  value={formData.snacksPerDay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      snacksPerDay: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "snack" : "snacks"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Dietary Type (Optional)
                </label>
                <select
                  value={formData.dietaryType}
                  onChange={(e) =>
                    setFormData({ ...formData, dietaryType: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">None</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="pescatarian">Pescatarian</option>
                  <option value="keto">Keto</option>
                  <option value="paleo">Paleo</option>
                  <option value="mediterranean">Mediterranean</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cooking Time Preference
                </label>
                <select
                  value={formData.cookingTime}
                  onChange={(e) =>
                    setFormData({ ...formData, cookingTime: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="quick">Quick (Under 30 mins)</option>
                  <option value="moderate">Moderate (30-60 mins)</option>
                  <option value="extensive">Extensive (Over 60 mins)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cooking Skill Level
                </label>
                <select
                  value={formData.cookingSkill}
                  onChange={(e) =>
                    setFormData({ ...formData, cookingSkill: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Food Preferences & Allergies */}
        {step === 5 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              Allergies & Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Allergies (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., peanuts, shellfish, dairy"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allergies: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Food Intolerances (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., lactose, gluten"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intolerances: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Foods You Love (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., chicken, rice, broccoli"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      likedFoods: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Foods to Avoid (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., mushrooms, tomatoes"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dislikedFoods: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-400 mt-0.5" />
                  <p className="text-sm text-blue-300">
                    The AI will use this information to create personalized meal
                    plans that match your preferences and avoid anything you
                    can't or don't want to eat.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
