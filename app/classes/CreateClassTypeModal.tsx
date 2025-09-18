"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { X } from "lucide-react";
import { getCurrentUserOrganization } from "@/app/lib/organization-service";

interface CreateClassTypeModalProps {
  onClose: () => void;
  onSuccess: (classType: any) => void;
}

export default function CreateClassTypeModal({
  onClose,
  onSuccess,
}: CreateClassTypeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    visibility: "everyone", // everyone, membership_holders, business_only
    registration_window_days: "180",
    default_capacity: "",
    allow_drop_ins: "no", // no, yes
    age_restriction: "no", // no, yes
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Handle Esc key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get organization ID
      const { organizationId, error } = await getCurrentUserOrganization();

      if (error || !organizationId) {
        throw new Error(error || "Organization not found");
      }

      // Create class type (program)
      const { data: classType, error: insertError } = await supabase
        .from("programs")
        .insert({
          organization_id: organizationId,
          name: formData.name,
          description: formData.description,
          category: formData.category || null,
          visibility: formData.visibility,
          registration_window_days: parseInt(formData.registration_window_days),
          max_participants: formData.default_capacity
            ? parseInt(formData.default_capacity)
            : null,
          allow_drop_ins: formData.allow_drop_ins === "yes",
          age_restriction: formData.age_restriction === "yes",
          is_active: true,
          program_type: "class_type",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      onSuccess(classType);
      onClose();
    } catch (error: any) {
      console.error("Error creating class type:", error);
      alert(error.message || "Failed to create class type");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">New Class Type</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name*
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Morning HIIT"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <div className="bg-gray-700 border border-gray-600 rounded-lg">
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-transparent text-white focus:outline-none resize-none"
                rows={4}
                placeholder="Describe the Class Type. You can format the text in this box."
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Describe the Class Type. You can format the text in this box.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none [&>option]:bg-gray-700 [&>option]:text-white"
              style={{ color: "white" }}
            >
              <option value="" className="text-white bg-gray-700">
                -- None --
              </option>
              <option value="fitness" className="text-white bg-gray-700">
                Fitness
              </option>
              <option value="strength" className="text-white bg-gray-700">
                Strength Training
              </option>
              <option value="cardio" className="text-white bg-gray-700">
                Cardio
              </option>
              <option value="yoga" className="text-white bg-gray-700">
                Yoga
              </option>
              <option value="pilates" className="text-white bg-gray-700">
                Pilates
              </option>
              <option value="martial_arts" className="text-white bg-gray-700">
                Martial Arts
              </option>
              <option value="dance" className="text-white bg-gray-700">
                Dance
              </option>
              <option value="sports" className="text-white bg-gray-700">
                Sports
              </option>
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Visibility
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="visibility"
                  value="everyone"
                  checked={formData.visibility === "everyone"}
                  onChange={(e) =>
                    setFormData({ ...formData, visibility: e.target.value })
                  }
                  className="mr-2"
                />
                <span className="text-white">Everyone</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="visibility"
                  value="membership_holders"
                  checked={formData.visibility === "membership_holders"}
                  onChange={(e) =>
                    setFormData({ ...formData, visibility: e.target.value })
                  }
                  className="mr-2"
                />
                <span className="text-white">Membership Holders</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="visibility"
                  value="business_only"
                  checked={formData.visibility === "business_only"}
                  onChange={(e) =>
                    setFormData({ ...formData, visibility: e.target.value })
                  }
                  className="mr-2"
                />
                <span className="text-white">Business Only</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Which customers are able to view this class. "Membership holders"
              are customers who hold a membership valid for classes of this
              type. "Business Only" class types are only viewable by you and
              your staff.
            </p>
          </div>

          {/* Registration Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Registration settings
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="registration"
                  value="default"
                  defaultChecked
                  className="mr-2"
                />
                <span className="text-white">
                  Default Timeline - Calendar opens to{" "}
                  <strong>
                    everyone {formData.registration_window_days} days before
                    event
                  </strong>
                  . Registrations between{" "}
                  <strong>365 days before event starts</strong> and{" "}
                  <strong>when event starts</strong>. Cancels up to{" "}
                  <strong>1 minute before event starts</strong>.
                </span>
              </label>
            </div>
          </div>

          {/* Default Occupancy */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Default occupancy
            </label>
            <input
              type="number"
              min="1"
              value={formData.default_capacity}
              onChange={(e) =>
                setFormData({ ...formData, default_capacity: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="Leave empty if no default occupancy is needed"
            />
            <p className="text-xs text-gray-500 mt-1">
              The default size limit when creating new time slots or one-off
              events. Leave empty if no default occupancy is needed.
            </p>
          </div>

          {/* Allow Drop-ins */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Allow Drop-ins?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="drop_ins"
                  value="no"
                  checked={formData.allow_drop_ins === "no"}
                  onChange={(e) =>
                    setFormData({ ...formData, allow_drop_ins: e.target.value })
                  }
                  className="mr-2"
                />
                <span className="text-white">
                  No, registrations are only allowed when included in a
                  membership.
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="drop_ins"
                  value="yes"
                  checked={formData.allow_drop_ins === "yes"}
                  onChange={(e) =>
                    setFormData({ ...formData, allow_drop_ins: e.target.value })
                  }
                  className="mr-2"
                />
                <span className="text-white">Yes</span>
              </label>
            </div>
          </div>

          {/* Age Restriction */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Set Age Restriction?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="age_restriction"
                  value="no"
                  checked={formData.age_restriction === "no"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      age_restriction: e.target.value,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-white">
                  No, all ages are able to register
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="age_restriction"
                  value="yes"
                  checked={formData.age_restriction === "yes"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      age_restriction: e.target.value,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-white">Yes</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "Creating..." : "Create Class Type"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
