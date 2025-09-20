"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, User, Users } from "lucide-react";
import toast from "react-hot-toast";

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onUpdate?: () => void;
}

export default function EditSessionModal({
  isOpen,
  onClose,
  session,
  onUpdate,
}: EditSessionModalProps) {
  const [formData, setFormData] = useState({
    instructor: "",
    startTime: "",
    endTime: "",
    capacity: 20,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && isOpen) {
      // Parse the datetime values for the input fields
      const startDate = new Date(session.startTime || session.start_time);
      const endDate = new Date(session.endTime || session.end_time);

      // Format datetime for datetime-local input
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        instructor: session.instructor || "",
        startTime: formatDateTime(startDate),
        endTime: formatDateTime(endDate),
        capacity: session.capacity || session.max_capacity || 20,
      });
    }
  }, [session, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate times
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endTime);

      if (endDate <= startDate) {
        throw new Error("End time must be after start time");
      }

      // Update session via API
      const response = await fetch(`/api/class-sessions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: session.id,
          instructor: formData.instructor,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          max_capacity: formData.capacity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update session");
      }

      toast.success("Session updated successfully!");

      // Refresh the data
      if (onUpdate) {
        await onUpdate();
      }

      onClose();
    } catch (error: any) {
      console.error("Error updating session:", error);
      toast.error(error.message || "Failed to update session");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Edit Session</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Session Title (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Session
            </label>
            <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
              {session?.title || session?.name || "Class Session"}
            </div>
          </div>

          {/* Instructor */}
          <div>
            <label
              htmlFor="instructor"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              <User className="inline w-4 h-4 mr-1" />
              Instructor
            </label>
            <input
              id="instructor"
              type="text"
              value={formData.instructor}
              onChange={(e) =>
                setFormData({ ...formData, instructor: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter instructor name"
              required
            />
          </div>

          {/* Start Time */}
          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              <Clock className="inline w-4 h-4 mr-1" />
              Start Time
            </label>
            <input
              id="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label
              htmlFor="endTime"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              <Clock className="inline w-4 h-4 mr-1" />
              End Time
            </label>
            <input
              id="endTime"
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Capacity */}
          <div>
            <label
              htmlFor="capacity"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              <Users className="inline w-4 h-4 mr-1" />
              Capacity
            </label>
            <input
              id="capacity"
              type="number"
              min="1"
              max="100"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  capacity: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
