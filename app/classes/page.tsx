"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import AddClassTypeModal from "./AddClassTypeModal";
import { RequireOrganization } from "../components/auth/RequireOrganization";
import { useOrganization } from "../hooks/useOrganization";
import { useRouter } from "next/navigation";

interface ClassType {
  id: string;
  name: string;
  description?: string;
  price_pennies: number;
  is_active: boolean;
  metadata?: {
    category?: string;
    visibility?: string;
    registrationSetting?: string;
    defaultOccupancy?: string;
  };
  sessions_count?: number;
}

function ClassesPageContent() {
  const { organizationId } = useOrganization();
  const router = useRouter();
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const supabase = createClient();

  useEffect(() => {
    if (organizationId) {
      loadClassTypes();
    }
  }, [organizationId, lastRefresh]);

  const forceRefresh = () => {
    setLastRefresh(Date.now());
    setClassTypes([]); // Clear current state
    setLoading(true);
  };

  const loadClassTypes = async () => {
    if (!organizationId) {
      console.log("Waiting for organization ID...");
      return;
    }

    try {
      console.log("Loading class types for organization:", organizationId);

      // Use API route to bypass RLS issues
      const response = await fetch(
        `/api/programs?organizationId=${organizationId}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load programs");
      }

      const data = result.data;

      console.log("Programs loaded:", data?.length || 0);

      // Transform the data to ensure consistent capacity field
      const transformedData =
        data?.map((program) => ({
          ...program,
          sessions_count: 0, // We'll calculate this separately if needed
          // Use max_participants as the primary capacity field, fallback to default_capacity
          default_capacity:
            program.max_participants || program.default_capacity || 20,
        })) || [];

      setClassTypes(transformedData);
    } catch (error: any) {
      console.error("Error loading class types:", {
        message: error?.message || "Unknown error",
        details: error?.details,
        code: error?.code,
        fullError: error,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClassType = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this class type? This will also delete all associated class sessions.",
      )
    )
      return;

    try {
      // First delete all class sessions for this program
      await supabase.from("class_sessions").delete().eq("program_id", id);

      // Then delete the program
      const { error } = await supabase.from("programs").delete().eq("id", id);

      if (error) throw error;

      forceRefresh();
    } catch (error: any) {
      console.error("Error deleting class type:", error);
      alert("Failed to delete class type: " + error.message);
    }
  };

  const handleDeleteAll = async () => {
    if (!organizationId) return;

    setDeletingAll(true);
    try {
      // Delete all class sessions first
      await supabase
        .from("class_sessions")
        .delete()
        .eq("organization_id", organizationId);

      // Delete all programs
      const { error } = await supabase
        .from("programs")
        .delete()
        .eq("organization_id", organizationId);

      if (error) throw error;

      setShowDeleteAllModal(false);
      forceRefresh();
    } catch (error: any) {
      console.error("Error deleting all:", error);
      alert("Failed to delete all: " + error.message);
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Class Types</h1>
            <p className="text-gray-400 mt-2">
              Manage your class types and schedules
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={forceRefresh}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              🔄 Force Refresh
            </button>
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Class Type
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-400">Loading class types...</p>
          </div>
        ) : classTypes.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg shadow">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-white">
              No class types
            </h3>
            <p className="mt-1 text-gray-400">
              Get started by creating a new class type.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Class Type
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Class Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Default Capacity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {classTypes.map((classType) => (
                  <tr key={classType.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div
                          className="text-sm font-medium text-white hover:text-blue-400 cursor-pointer"
                          onClick={() =>
                            router.push(`/classes/${classType.id}`)
                          }
                        >
                          {classType.name}
                        </div>
                        {classType.description && (
                          <div className="text-sm text-gray-400">
                            {classType.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">
                        {classType.metadata?.category || "No category"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-300">
                        everyone
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {classType.sessions_count || 0} sessions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {classType.default_capacity || "Not set"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/classes/${classType.id}`);
                        }}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClassType(classType.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {showDeleteAllModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <h3 className="text-lg font-semibold text-white">
                  Delete All Class Types?
                </h3>
              </div>
              <p className="text-gray-300 mb-6">
                This will permanently delete all class types and their
                associated sessions. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600"
                  disabled={deletingAll}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                  disabled={deletingAll}
                >
                  {deletingAll ? "Deleting..." : "Delete All"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Class Type Modal */}
        {showAddModal && (
          <AddClassTypeModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              forceRefresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function ClassesPage() {
  return (
    <DashboardLayout>
      <RequireOrganization>
        <ClassesPageContent />
      </RequireOrganization>
    </DashboardLayout>
  );
}
