"use client";

import React, { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  Repeat,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recurrenceData: RecurrenceData) => void;
  classSession?: any;
}

interface TimeSlot {
  time: string;
  duration: number; // in minutes
}

interface RecurrenceData {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  endType: "never" | "date" | "count";
  endDate?: string;
  occurrences?: number;
  timeSlots: TimeSlot[];
  rrule: string;
}

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const DEFAULT_DURATIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

export default function RecurrenceModal({
  isOpen,
  onClose,
  onSave,
  classSession,
}: RecurrenceModalProps) {
  // Get initial time from classSession if available (use UTC to maintain consistency)
  const getInitialTime = () => {
    if (classSession?.start_time) {
      const date = new Date(classSession.start_time);
      // Get UTC time components to avoid timezone issues
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return "09:00";
  };

  const getInitialDuration = () => {
    if (classSession?.start_time && classSession?.end_time) {
      const start = new Date(classSession.start_time);
      const end = new Date(classSession.end_time);
      const durationMs = end.getTime() - start.getTime();
      return Math.round(durationMs / 60000); // Convert to minutes
    }
    return 60;
  };

  const [formData, setFormData] = useState<RecurrenceData>({
    frequency: "weekly",
    interval: 1,
    daysOfWeek: classSession
      ? [new Date(classSession.start_time).getUTCDay()]
      : [1],
    endType: "never",
    endDate: "",
    occurrences: 10,
    timeSlots: [{ time: getInitialTime(), duration: getInitialDuration() }],
    rrule: "",
  });

  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const generateRRule = (data: RecurrenceData): string => {
    let rrule = "RRULE:";

    // Frequency
    switch (data.frequency) {
      case "daily":
        rrule += "FREQ=DAILY";
        break;
      case "weekly":
        rrule += "FREQ=WEEKLY";
        break;
      case "monthly":
        rrule += "FREQ=MONTHLY";
        break;
    }

    // Interval
    if (data.interval > 1) {
      rrule += `;INTERVAL=${data.interval}`;
    }

    // Days of week (for weekly recurrence)
    if (
      data.frequency === "weekly" &&
      data.daysOfWeek &&
      data.daysOfWeek.length > 0
    ) {
      const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      const byDay = data.daysOfWeek.map((day) => dayNames[day]).join(",");
      rrule += `;BYDAY=${byDay}`;
    }

    // End condition
    if (data.endType === "date" && data.endDate) {
      const endDate = new Date(data.endDate);
      const until =
        endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      rrule += `;UNTIL=${until}`;
    } else if (data.endType === "count" && data.occurrences) {
      rrule += `;COUNT=${data.occurrences}`;
    }

    return rrule;
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (formData.interval < 1) {
      newErrors.push("Interval must be at least 1");
    }

    if (
      formData.frequency === "weekly" &&
      (!formData.daysOfWeek || formData.daysOfWeek.length === 0)
    ) {
      newErrors.push("Please select at least one day of the week");
    }

    if (formData.endType === "date" && !formData.endDate) {
      newErrors.push("Please select an end date");
    }

    if (formData.endType === "date" && formData.endDate) {
      const endDate = new Date(formData.endDate);
      const startDate = classSession
        ? new Date(classSession.start_time)
        : new Date();
      if (endDate <= startDate) {
        newErrors.push("End date must be after the class start date");
      }
    }

    if (
      formData.endType === "count" &&
      (!formData.occurrences || formData.occurrences < 1)
    ) {
      newErrors.push("Number of occurrences must be at least 1");
    }

    if (formData.timeSlots.length === 0) {
      newErrors.push("Please add at least one time slot");
    }

    // Check for empty time slots
    formData.timeSlots.forEach((slot, index) => {
      if (!slot.time) {
        newErrors.push(`Time slot ${index + 1} is missing a time`);
      }
      if (!slot.duration || slot.duration < 1) {
        newErrors.push(`Time slot ${index + 1} is missing a duration`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const rrule = generateRRule(formData);
    const recurrenceData = {
      ...formData,
      rrule,
    };

    onSave(recurrenceData);
  };

  const handleDayToggle = (day: number) => {
    const currentDays = formData.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();

    setFormData({ ...formData, daysOfWeek: newDays });
  };

  const addTimeSlot = () => {
    const newTimeSlots = [
      ...formData.timeSlots,
      { time: "09:00", duration: 60 },
    ];
    setFormData({ ...formData, timeSlots: newTimeSlots });
  };

  const removeTimeSlot = (index: number) => {
    const newTimeSlots = formData.timeSlots.filter((_, i) => i !== index);
    setFormData({ ...formData, timeSlots: newTimeSlots });
  };

  const updateTimeSlot = (
    index: number,
    field: "time" | "duration",
    value: string | number,
  ) => {
    const newTimeSlots = [...formData.timeSlots];
    if (field === "time") {
      newTimeSlots[index].time = value as string;
    } else {
      newTimeSlots[index].duration = value as number;
    }
    setFormData({ ...formData, timeSlots: newTimeSlots });
  };

  const formatTimeForDisplay = (time: string): string => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getRecurrencePreview = (): string => {
    const {
      frequency,
      interval,
      daysOfWeek,
      endType,
      endDate,
      occurrences,
      timeSlots,
    } = formData;

    let preview = "";

    if (frequency === "daily") {
      preview = interval === 1 ? "Daily" : `Every ${interval} days`;
    } else if (frequency === "weekly") {
      const dayLabels =
        daysOfWeek
          ?.map((day) => WEEKDAYS.find((w) => w.value === day)?.label)
          .join(", ") || "";
      preview =
        interval === 1
          ? `Weekly on ${dayLabels}`
          : `Every ${interval} weeks on ${dayLabels}`;
    } else if (frequency === "monthly") {
      preview = interval === 1 ? "Monthly" : `Every ${interval} months`;
    }

    // Add time slots
    if (timeSlots.length > 0) {
      const timesList = timeSlots
        .map(
          (slot) => `${formatTimeForDisplay(slot.time)} (${slot.duration} min)`,
        )
        .join(", ");
      preview += ` at ${timesList}`;
    }

    if (endType === "date" && endDate) {
      preview += ` until ${new Date(endDate).toLocaleDateString("en-GB")}`;
    } else if (endType === "count" && occurrences) {
      preview += ` for ${occurrences} occurrences`;
    }

    return preview;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Repeat className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-white">
              Set Up Recurring Classes
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">
                  Please fix the following errors:
                </span>
              </div>
              <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Repeat Frequency
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "daily", label: "Daily", icon: Calendar },
                { value: "weekly", label: "Weekly", icon: Calendar },
                { value: "monthly", label: "Monthly", icon: Calendar },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() =>
                    setFormData({ ...formData, frequency: value as any })
                  }
                  className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-2 ${
                    formData.frequency === value
                      ? "border-orange-500 bg-orange-500/10 text-orange-400"
                      : "border-gray-600 hover:border-gray-500 text-gray-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Repeat Every
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="99"
                value={formData.interval}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    interval: parseInt(e.target.value) || 1,
                  })
                }
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-300">
                {formData.frequency === "daily" &&
                  (formData.interval === 1 ? "day" : "days")}
                {formData.frequency === "weekly" &&
                  (formData.interval === 1 ? "week" : "weeks")}
                {formData.frequency === "monthly" &&
                  (formData.interval === 1 ? "month" : "months")}
              </span>
            </div>
          </div>

          {/* Days of Week (for weekly) */}
          {formData.frequency === "weekly" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Days of the Week
              </label>
              <div className="flex gap-2">
                {WEEKDAYS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleDayToggle(value)}
                    className={`w-12 h-12 rounded-lg border transition-colors ${
                      formData.daysOfWeek?.includes(value)
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-gray-600 hover:border-gray-500 text-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time Slots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-400">
                Class Times
              </label>
              <button
                onClick={addTimeSlot}
                className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Time Slot
              </button>
            </div>
            <div className="space-y-3">
              {formData.timeSlots.map((slot, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) =>
                        updateTimeSlot(index, "time", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={slot.duration}
                      onChange={(e) =>
                        updateTimeSlot(
                          index,
                          "duration",
                          parseInt(e.target.value),
                        )
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {DEFAULT_DURATIONS.map(({ value, label }) => (
                        <option
                          key={value}
                          value={value}
                          className="text-white bg-gray-700"
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.timeSlots.length > 1 && (
                    <button
                      onClick={() => removeTimeSlot(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="Remove time slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              You can add multiple time slots to create classes at different
              times on the selected days. Times are stored in UTC to ensure
              consistency across timezones.
            </p>
          </div>

          {/* End Options */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              End Recurrence
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={formData.endType === "never"}
                  onChange={(e) =>
                    setFormData({ ...formData, endType: e.target.value as any })
                  }
                  className="mr-3 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-gray-300">Never</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="date"
                  checked={formData.endType === "date"}
                  onChange={(e) =>
                    setFormData({ ...formData, endType: e.target.value as any })
                  }
                  className="mr-3 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-gray-300 mr-3">On date:</span>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      endDate: e.target.value,
                      endType: "date",
                    })
                  }
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min={new Date().toISOString().split("T")[0]}
                />
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="endType"
                  value="count"
                  checked={formData.endType === "count"}
                  onChange={(e) =>
                    setFormData({ ...formData, endType: e.target.value as any })
                  }
                  className="mr-3 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-gray-300 mr-3">After:</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={formData.occurrences}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      occurrences: parseInt(e.target.value) || 1,
                      endType: "count",
                    })
                  }
                  className="w-20 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-gray-300 ml-2">occurrences</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">
                Preview
              </span>
            </div>
            <p className="text-gray-300 text-sm">{getRecurrencePreview()}</p>
            {formData.timeSlots.length > 1 && (
              <p className="text-xs text-gray-500 mt-2">
                {formData.timeSlots.length} time slots ×{" "}
                {formData.frequency === "weekly" && formData.daysOfWeek
                  ? formData.daysOfWeek.length
                  : 1}{" "}
                days ={" "}
                {formData.timeSlots.length *
                  (formData.frequency === "weekly" && formData.daysOfWeek
                    ? formData.daysOfWeek.length
                    : 1)}{" "}
                classes per{" "}
                {formData.frequency === "daily"
                  ? "day"
                  : formData.frequency === "weekly"
                    ? "week"
                    : "month"}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Create Recurring Classes
          </button>
        </div>
      </div>
    </div>
  );
}
