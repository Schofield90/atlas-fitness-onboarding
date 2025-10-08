"use client";

import React, { useState, useEffect } from "react";
import parseExpression from "cron-parser";

interface CronBuilderProps {
  value: string;
  timezone: string;
  onChange: (cron: string) => void;
  onTimezoneChange: (timezone: string) => void;
}

const CRON_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every day at 9:00 AM", value: "0 9 * * *" },
  { label: "Every day at 5:00 PM", value: "0 17 * * *" },
  { label: "Every Monday at 9:00 AM", value: "0 9 * * 1" },
  { label: "Every weekday at 9:00 AM", value: "0 9 * * 1-5" },
  { label: "First day of month at 9:00 AM", value: "0 9 1 * *" },
  { label: "Custom", value: "" },
];

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export const CronBuilder: React.FC<CronBuilderProps> = ({
  value,
  timezone,
  onChange,
  onTimezoneChange,
}) => {
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customCron, setCustomCron] = useState(value);
  const [description, setDescription] = useState("");
  const [nextRuns, setNextRuns] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const preset = CRON_PRESETS.find((p) => p.value === value);
    if (preset && preset.value !== "") {
      setSelectedPreset(preset.value);
      setCustomCron("");
    } else {
      setSelectedPreset("");
      setCustomCron(value);
    }
    updateDescription(value);
  }, [value]);

  const updateDescription = (cron: string) => {
    if (!cron) {
      setDescription("");
      setNextRuns([]);
      setError("");
      return;
    }

    try {
      const interval = parseExpression(cron, { tz: timezone });

      // Generate human-readable description
      const parts = cron.split(" ");
      if (parts.length !== 5) {
        throw new Error("Invalid cron format");
      }

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      let desc = "Runs ";

      // Day of week
      if (dayOfWeek !== "*") {
        const days = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        if (dayOfWeek.includes("-")) {
          desc += "every weekday ";
        } else if (dayOfWeek.includes(",")) {
          desc += "on selected days ";
        } else {
          desc += `every ${days[parseInt(dayOfWeek)]} `;
        }
      } else if (dayOfMonth === "1") {
        desc += "on the 1st day of each month ";
      } else if (dayOfMonth !== "*") {
        desc += `on day ${dayOfMonth} of each month `;
      } else {
        desc += "every day ";
      }

      // Time
      if (hour !== "*" && minute !== "*") {
        const h = parseInt(hour);
        const m = parseInt(minute);
        desc += `at ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${timezone}`;
      } else if (hour !== "*") {
        desc += `at hour ${hour}`;
      } else if (minute.startsWith("*/")) {
        desc += `every ${minute.substring(2)} minutes`;
      } else if (minute !== "*") {
        desc += `at minute ${minute}`;
      }

      setDescription(desc);

      // Calculate next 5 runs
      const runs = [];
      for (let i = 0; i < 5; i++) {
        runs.push(interval.next().toISOString());
      }
      setNextRuns(runs);
      setError("");
    } catch (err) {
      setDescription("");
      setNextRuns([]);
      setError(err instanceof Error ? err.message : "Invalid cron expression");
    }
  };

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    if (presetValue !== "") {
      onChange(presetValue);
      setCustomCron("");
    }
  };

  const handleCustomChange = (custom: string) => {
    setCustomCron(custom);
    onChange(custom);
    updateDescription(custom);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Schedule Preset
        </label>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
        >
          {CRON_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {selectedPreset === "" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Custom Cron Expression
          </label>
          <input
            type="text"
            value={customCron}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="0 9 * * *"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-orange-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Format: minute hour day month weekday (e.g., "0 9 * * *" = 9:00 AM
            daily)
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {description && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
          <p className="text-sm text-blue-200 font-medium mb-2">
            {description}
          </p>
          {nextRuns.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Next 5 runs:</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {nextRuns.map((run, i) => (
                  <li key={i}>
                    {new Date(run).toLocaleString("en-US", {
                      timeZone: timezone,
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CronBuilder;
