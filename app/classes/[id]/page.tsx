"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  Users,
  DollarSign,
  MapPin,
  Activity,
  Trash2,
  Repeat,
  List,
} from "lucide-react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { createClient } from "@/app/lib/supabase/client";
import { useOrganization } from "@/app/hooks/useOrganization";
import RecurrenceModal from "@/app/components/classes/RecurrenceModal";
import WaitlistManager from "@/app/components/classes/WaitlistManager";

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { organizationId } = useOrganization();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classType, setClassType] = useState<any>(null);
  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "details" | "sessions" | "waitlist"
  >("details");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_pennies: 0,
    duration_minutes: 60,
    capacity: 0, // Will be set from database
    location: "",
    instructor_types: [] as string[],
    category: "",
    color: "#3B82F6",
    metadata: {},
  });

  const [updateOptions, setUpdateOptions] = useState({
    updateFutureSessions: false,
    updateAllSessions: false,
    effectiveDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (classId && organizationId) {
      loadClassType();
      loadClassSessions();
    }
  }, [classId, organizationId]);

  const loadClassType = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("id", classId)
        .eq("organization_id", organizationId)
        .single();

      if (error) throw error;

      if (data) {
        setClassType(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          price_pennies: data.price_pennies || 0,
          duration_minutes: data.duration_minutes || 60,
          capacity: data.default_capacity || data.max_participants || 20,
          location: data.metadata?.location || "", // Load location from metadata
          instructor_types: data.metadata?.instructor_types || [], // Load from metadata
          category: data.metadata?.category || "",
          color: data.color || "#3B82F6",
          metadata: data.metadata || {},
        });
      }
    } catch (error) {
      console.error("Error loading class type:", error);
      alert("Failed to load class type");
      router.push("/classes");
    } finally {
      setLoading(false);
    }
  };

  const loadClassSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("class_sessions")
        .select(
          `
          *,
          programs:program_id (
            name,
            program_type
          ),
          staff:trainer_id (
            name,
            email
          )
        `,
        )
        .eq("program_id", classId)
        .eq("organization_id", organizationId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setClassSessions(data || []);
    } catch (error) {
      console.error("Error loading class sessions:", error);
    }
  };

  const handleCreateRecurringClasses = async (recurrenceData: any) => {
    if (!selectedSession) return;

    try {
      const response = await fetch("/api/classes/recurring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classSessionId: selectedSession.id,
          recurrenceRule: recurrenceData.rrule,
          endDate: recurrenceData.endDate,
          maxOccurrences: recurrenceData.occurrences,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `Successfully created ${data.instances} recurring class instances`,
        );
        await loadClassSessions();
        setShowRecurrenceModal(false);
        setSelectedSession(null);
      } else {
        alert("Failed to create recurring classes: " + data.error);
      }
    } catch (error) {
      console.error("Error creating recurring classes:", error);
      alert("Failed to create recurring classes");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build update object - only include metadata if the column exists
      const updateData: any = {
        name: formData.name,
        description: formData.description,
        price_pennies: formData.price_pennies,
        duration_minutes: formData.duration_minutes,
        max_participants: formData.capacity, // Use max_participants as that's the actual column name in programs table
        default_capacity: formData.capacity, // Keep for backward compatibility if column exists
        color: formData.color,
        updated_at: new Date().toISOString(),
      };

      // Try to update with metadata first
      let { error } = await supabase
        .from("programs")
        .update({
          ...updateData,
          metadata: {
            ...formData.metadata,
            category: formData.category,
            location: formData.location,
            instructor_types: formData.instructor_types,
          },
        })
        .eq("id", classId)
        .eq("organization_id", organizationId);

      // If metadata column doesn't exist, update without it
      if (error && error.message.includes("metadata")) {
        console.log("Metadata column not found, updating without it");
        const { error: retryError } = await supabase
          .from("programs")
          .update(updateData)
          .eq("id", classId)
          .eq("organization_id", organizationId);

        if (retryError) throw retryError;
      } else if (error) {
        throw error;
      }

      // Update class sessions if requested
      if (
        updateOptions.updateFutureSessions ||
        updateOptions.updateAllSessions
      ) {
        let query = supabase
          .from("class_sessions")
          .update({ max_capacity: formData.capacity })
          .eq("program_id", classId)
          .eq("organization_id", organizationId);

        if (updateOptions.updateFutureSessions) {
          // Only update sessions on or after the effective date
          query = query.gte(
            "start_time",
            updateOptions.effectiveDate + "T00:00:00",
          );
        }

        const { error: sessionsError } = await query;

        if (sessionsError) {
          console.error("Error updating class sessions:", sessionsError);
          alert(
            "Warning: Class type updated but sessions may not have been updated",
          );
        } else {
          console.log("Successfully updated class sessions capacity");
        }
      }

      alert("Class type updated successfully");

      // Reload to show updated data
      await loadClassSessions();
    } catch (error: any) {
      console.error("Error saving class type:", error);
      alert("Failed to save changes: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this class type? This will also delete all associated class sessions.",
      )
    ) {
      return;
    }

    try {
      // First delete all class sessions
      await supabase.from("class_sessions").delete().eq("program_id", classId);

      // Then delete the program
      const { error } = await supabase
        .from("programs")
        .delete()
        .eq("id", classId)
        .eq("organization_id", organizationId);

      if (error) throw error;

      alert("Class type deleted successfully");
      router.push("/classes");
    } catch (error: any) {
      console.error("Error deleting class type:", error);
      alert("Failed to delete class type: " + error.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading class type...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/classes")}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Edit Class Type
                </h1>
                <p className="text-gray-400 mt-1">
                  Modify class type details and settings
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6">
            {[
              { key: "details", label: "Class Details", icon: Activity },
              {
                key: "sessions",
                label: "Sessions & Scheduling",
                icon: Calendar,
              },
              { key: "waitlist", label: "Waitlist Management", icon: List },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === key
                    ? "bg-orange-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Basic Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., HIIT Training"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={3}
                      placeholder="Brief description of the class..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">No Category</option>
                      <option value="strength">Strength Training</option>
                      <option value="cardio">Cardio</option>
                      <option value="yoga">Yoga</option>
                      <option value="pilates">Pilates</option>
                      <option value="dance">Dance</option>
                      <option value="martial-arts">Martial Arts</option>
                      <option value="swimming">Swimming</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Color Theme
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Class Settings */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-400" />
                  Class Settings
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration_minutes: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="15"
                        max="240"
                        step="15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        Default Capacity
                      </label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            capacity: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* Capacity Update Options */}
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">
                      Apply Capacity Changes To:
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={updateOptions.updateFutureSessions}
                          onChange={(e) =>
                            setUpdateOptions({
                              ...updateOptions,
                              updateFutureSessions: e.target.checked,
                              updateAllSessions: false, // Uncheck all if future is checked
                            })
                          }
                          className="mr-2 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-300">
                          Future sessions only (from effective date)
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={updateOptions.updateAllSessions}
                          onChange={(e) =>
                            setUpdateOptions({
                              ...updateOptions,
                              updateAllSessions: e.target.checked,
                              updateFutureSessions: false, // Uncheck future if all is checked
                            })
                          }
                          className="mr-2 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-300">
                          All existing sessions
                        </span>
                      </label>
                      {updateOptions.updateFutureSessions && (
                        <div className="mt-2 ml-6">
                          <label className="block text-xs text-gray-400 mb-1">
                            Effective Date:
                          </label>
                          <input
                            type="date"
                            value={updateOptions.effectiveDate}
                            onChange={(e) =>
                              setUpdateOptions({
                                ...updateOptions,
                                effectiveDate: e.target.value,
                              })
                            }
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Leave unchecked to only update the default for new
                      sessions
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Price (£)
                    </label>
                    <input
                      type="number"
                      value={formData.price_pennies / 100}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_pennies: Math.round(
                            parseFloat(e.target.value) * 100,
                          ),
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Default Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Studio A, Main Gym Floor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Instructor Types
                    </label>
                    <div className="space-y-2">
                      {[
                        "Personal Trainer",
                        "Group Instructor",
                        "Yoga Teacher",
                        "Specialist",
                      ].map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.instructor_types.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  instructor_types: [
                                    ...formData.instructor_types,
                                    type,
                                  ],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  instructor_types:
                                    formData.instructor_types.filter(
                                      (t) => t !== type,
                                    ),
                                });
                              }
                            }}
                            className="mr-2 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-300">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Eligibility & Rules */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Eligibility & Rules
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Membership Plans
                    </label>
                    <p className="text-sm text-gray-500 mb-2">
                      Select which membership plans can access this class
                    </p>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2 rounded border-gray-600 bg-gray-700 text-orange-500"
                          defaultChecked
                        />
                        <span className="text-sm text-gray-300">
                          All Memberships
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2 rounded border-gray-600 bg-gray-700 text-orange-500"
                        />
                        <span className="text-sm text-gray-300">
                          Pay-per-class
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2 rounded border-gray-600 bg-gray-700 text-orange-500"
                        />
                        <span className="text-sm text-gray-300">
                          Trial Members
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Cancellation Policy
                    </label>
                    <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option>2 hours before class</option>
                      <option>4 hours before class</option>
                      <option>12 hours before class</option>
                      <option>24 hours before class</option>
                      <option>No cancellation allowed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Statistics
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">
                      Total Sessions
                    </span>
                    <span className="text-sm text-white font-medium">
                      {classType?.sessions_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">
                      Average Attendance
                    </span>
                    <span className="text-sm text-white font-medium">85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">
                      Revenue This Month
                    </span>
                    <span className="text-sm text-green-400 font-medium">
                      £1,250
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Created</span>
                    <span className="text-sm text-white font-medium">
                      {classType?.created_at
                        ? new Date(classType.created_at).toLocaleDateString(
                            "en-GB",
                          )
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === "sessions" && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Class Sessions
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedSession(classSessions[0] || null);
                      setShowRecurrenceModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Repeat className="w-4 h-4" />
                    Create Recurring
                  </button>
                </div>

                {classSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sessions scheduled for this class type</p>
                    <p className="text-sm mt-1">
                      Create sessions from the main classes page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">
                              {session.name || classType?.name}
                            </span>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(
                                  session.start_time,
                                ).toLocaleDateString("en-GB")}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(
                                  session.start_time,
                                ).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {session.current_bookings}/
                                {session.max_capacity}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {session.is_recurring && (
                            <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs">
                              Recurring
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowRecurrenceModal(true);
                            }}
                            className="p-2 text-orange-400 hover:bg-orange-900/20 rounded transition-colors"
                            title="Create recurring instances"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Waitlist Tab */}
          {activeTab === "waitlist" && classSessions.length > 0 && (
            <div className="space-y-6">
              {classSessions.map((session) => (
                <div key={session.id}>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      {session.name || classType?.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {new Date(session.start_time).toLocaleDateString("en-GB")}{" "}
                      at{" "}
                      {new Date(session.start_time).toLocaleTimeString(
                        "en-GB",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                  <WaitlistManager
                    classSessionId={session.id}
                    organizationId={organizationId!}
                    onWaitlistChange={() => loadClassSessions()}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === "waitlist" && classSessions.length === 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-center py-8 text-gray-400">
                <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No sessions available for waitlist management</p>
                <p className="text-sm mt-1">Create class sessions first</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RecurrenceModal
        isOpen={showRecurrenceModal}
        onClose={() => {
          setShowRecurrenceModal(false);
          setSelectedSession(null);
        }}
        onSave={handleCreateRecurringClasses}
        classSession={selectedSession}
      />
    </DashboardLayout>
  );
}
