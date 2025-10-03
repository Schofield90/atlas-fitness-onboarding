"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Calendar,
  FileText,
  Bell,
  Palette,
  Save,
  Eye,
  ArrowLeft,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  Users,
  MapPin,
  CreditCard,
  Zap,
  Shield,
  Target,
} from "lucide-react";
import Button from "@/app/components/ui/Button";
import { BookingLink } from "@/app/lib/services/booking-link";

interface BookingLinkEditorProps {
  bookingLinkId?: string;
  onSave?: (bookingLink: BookingLink) => void;
  onCancel?: () => void;
}

type TabType =
  | "details"
  | "availability"
  | "form"
  | "notifications"
  | "customization";

interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
  description?: string;
  session_type: string;
  max_capacity: number;
  fitness_level?: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  title?: string;
  specializations?: Array<{
    type: string;
    certification: string;
    active: boolean;
  }>;
}

export default function BookingLinkEditor({
  bookingLinkId,
  onSave,
  onCancel,
}: BookingLinkEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [loading, setLoading] = useState(!!bookingLinkId);
  const [saving, setSaving] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>(
    [],
  );
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [slugCheck, setSlugCheck] = useState<{
    available: boolean;
    checking: boolean;
    message: string;
  }>({ available: true, checking: false, message: "" });
  const [availabilityValidationErrors, setAvailabilityValidationErrors] =
    useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<BookingLink>>({
    name: "",
    slug: "",
    description: "",
    type: "individual",
    appointment_type_ids: [],
    is_active: true,
    is_public: true,
    requires_auth: false,
    max_days_in_advance: 30,
    timezone: "Europe/London",
    meeting_title_template: "{{contact.name}} - {{service}}",
    assigned_staff_ids: [],
    meeting_location: {
      type: "in_person",
      details: "",
    },
    availability_rules: {},
    form_configuration: {
      fields: [],
      consent_text: "I agree to receive communications about my booking.",
    },
    confirmation_settings: {
      auto_confirm: true,
      redirect_url: "",
      custom_message: "",
    },
    notification_settings: {
      email_enabled: true,
      sms_enabled: false,
      reminder_schedules: ["1 day", "1 hour"],
      cancellation_notifications: true,
    },
    style_settings: {
      primary_color: "#3b82f6",
      background_color: "#ffffff",
      text_color: "#1f2937",
    },
    payment_settings: {
      enabled: false,
      amount: 0,
      currency: "GBP",
      description: "",
    },
    cancellation_policy: {
      allowed: true,
      hours_before: 24,
      policy_text: "Cancellations allowed up to 24 hours before appointment.",
    },
    booking_limits: {},
    buffer_settings: {
      before_minutes: 0,
      after_minutes: 15,
    },
  });

  useEffect(() => {
    fetchAppointmentTypes();
    fetchStaffMembers();

    if (bookingLinkId) {
      fetchBookingLink();
    }
  }, [bookingLinkId]);

  // Debounced slug availability check
  useEffect(() => {
    if (!formData.slug || (formData.slug || "").trim().length === 0) {
      setSlugCheck({
        available: false,
        checking: false,
        message: "URL slug is required",
      });
      return;
    }

    const sanitized = (formData.slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (sanitized !== formData.slug) {
      setFormData({ ...formData, slug: sanitized });
      return;
    }

    setSlugCheck((prev) => ({ ...prev, checking: true }));
    const handle = setTimeout(async () => {
      try {
        const url = `/api/booking-links/check-slug?slug=${encodeURIComponent(formData.slug!)}${bookingLinkId ? `&exclude_id=${bookingLinkId}` : ""}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to check slug");
        const data = await response.json();
        setSlugCheck({
          available: !!data.available,
          checking: false,
          message: data.available ? "" : "This slug is already taken",
        });
      } catch (e) {
        setSlugCheck({
          available: false,
          checking: false,
          message: "Unable to validate slug",
        });
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [formData.slug, bookingLinkId]);

  const fetchBookingLink = async () => {
    try {
      const response = await fetch(`/api/booking-links/${bookingLinkId}`);
      if (!response.ok) throw new Error("Failed to fetch booking link");

      const { booking_link } = await response.json();
      setFormData(booking_link);
    } catch (error) {
      console.error("Error fetching booking link:", error);
      alert("Failed to load booking link");
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentTypes = async () => {
    try {
      const response = await fetch("/api/appointment-types");
      if (response.ok) {
        const { appointment_types } = await response.json();
        setAppointmentTypes(appointment_types || []);
      }
    } catch (error) {
      console.error("Error fetching appointment types:", error);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const response = await fetch("/api/staff");
      if (response.ok) {
        const { staff } = await response.json();
        const mapped: StaffMember[] = (staff || []).map((s: any) => ({
          id: s.user_id || s.id,
          full_name:
            s.full_name ||
            s.name ||
            s.user_details?.name ||
            s.email ||
            "Staff Member",
          avatar_url: s.avatar_url,
          title: s.role || s.title,
          specializations: s.specializations || [],
        }));
        // Deduplicate by id and filter falsy ids
        const uniqueById = new Map<string, StaffMember>();
        for (const m of mapped) {
          if (m.id) uniqueById.set(m.id, m);
        }
        setStaffMembers(Array.from(uniqueById.values()));
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const validateAvailability = (): string[] => {
    const errors: string[] = [];
    const rules: any = formData.availability_rules || {};
    const isValidTime = (t: string) => /^\d{2}:\d{2}$/.test(t);
    Object.keys(rules || {}).forEach((staffId) => {
      const cfg = rules[staffId] || {};
      const weekly = cfg.weekly || {};
      Object.keys(weekly).forEach((dayKey) => {
        const day = weekly[dayKey] || [];
        // validate format and ordering
        const intervals = day.map((i: any) => ({ start: i.start, end: i.end }));
        for (const i of intervals) {
          if (!isValidTime(i.start) || !isValidTime(i.end)) {
            errors.push(
              `Invalid time format for staff ${staffId} on day ${dayKey}`,
            );
          } else if (i.start >= i.end) {
            errors.push(
              `Start time must be before end time for staff ${staffId} on day ${dayKey}`,
            );
          }
        }
        // overlap check
        const sorted = intervals
          .slice()
          .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].start < sorted[i - 1].end) {
            errors.push(
              `Overlapping intervals for staff ${staffId} on day ${dayKey}`,
            );
            break;
          }
        }
      });
    });
    return errors;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Client-side validation for availability
      const availabilityErrors = validateAvailability();
      setAvailabilityValidationErrors(availabilityErrors);
      if (availabilityErrors.length > 0) {
        throw new Error(
          "Please fix availability configuration errors before saving.",
        );
      }

      const url = bookingLinkId
        ? `/api/booking-links/${bookingLinkId}`
        : "/api/booking-links";
      const method = bookingLinkId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save booking link");
      }

      const { booking_link } = await response.json();

      if (onSave) {
        onSave(booking_link);
      } else {
        router.push("/settings/booking");
      }
    } catch (error) {
      console.error("Error saving booking link:", error);
      alert(
        error instanceof Error ? error.message : "Failed to save booking link",
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await fetch(
        `/api/booking-links/${bookingLinkId}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (response.ok) {
        const { preview_url } = await response.json();
        setPreviewUrl(preview_url);
        setShowPreview(true);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading booking link editor...</div>
      </div>
    );
  }

  const tabs = [
    { id: "details", label: "Meeting Details", icon: Settings },
    { id: "availability", label: "Availability", icon: Calendar },
    { id: "form", label: "Form & Confirmation", icon: FileText },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "customization", label: "Customization", icon: Palette },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => (onCancel ? onCancel() : router.back())}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {bookingLinkId ? "Edit Booking Link" : "Create Booking Link"}
            </h1>
            <p className="text-gray-400">
              {formData.name || "Configure your booking link settings"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {bookingLinkId && (
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !formData.name ||
              !formData.slug ||
              slugCheck.checking ||
              !slugCheck.available
            }
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : bookingLinkId ? "Update" : "Create"}
          </Button>
        </div>
      </div>

      {/* URL Preview */}
      {formData.slug && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Booking URL:</span>
              <code className="text-orange-400 bg-gray-900 px-2 py-1 rounded">
                {typeof window !== "undefined"
                  ? window.location.origin
                  : "https://your-domain.com"}
                /book/{formData.slug}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/book/${formData.slug}`,
                  );
                }
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          {!slugCheck.available && !slugCheck.checking && (
            <div className="text-red-400 text-xs mt-2">
              {slugCheck.message || "This slug is unavailable"}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-orange-500 text-orange-500"
                    : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        {activeTab === "details" && (
          <DetailsTab
            formData={formData}
            setFormData={setFormData}
            appointmentTypes={appointmentTypes}
            staffMembers={staffMembers}
            generateSlug={generateSlug}
            slugCheck={slugCheck}
          />
        )}
        {activeTab === "availability" && (
          <AvailabilityTab
            formData={formData}
            setFormData={setFormData}
            staffMembers={staffMembers}
          />
        )}
        {activeTab === "form" && (
          <FormTab formData={formData} setFormData={setFormData} />
        )}
        {activeTab === "notifications" && (
          <NotificationsTab formData={formData} setFormData={setFormData} />
        )}
        {activeTab === "customization" && (
          <CustomizationTab formData={formData} setFormData={setFormData} />
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full h-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Booking Link Preview</h3>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
            <iframe
              src={previewUrl}
              className="w-full flex-1 h-full"
              title="Booking Link Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// TAB COMPONENTS
// =============================================

const DetailsTab = ({
  formData,
  setFormData,
  appointmentTypes,
  staffMembers,
  generateSlug,
  slugCheck,
}: {
  formData: Partial<BookingLink>;
  setFormData: (data: Partial<BookingLink>) => void;
  appointmentTypes: AppointmentType[];
  staffMembers: StaffMember[];
  generateSlug: (name: string) => string;
  slugCheck: { available: boolean; checking: boolean; message: string };
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Booking Link Name *
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData({
                  ...formData,
                  name: newName,
                  slug: formData.slug || generateSlug(newName),
                });
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              placeholder="e.g., 30 Minute Consultation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL Slug *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm mr-1">/book/</span>
              <input
                type="text"
                value={formData.slug || ""}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                placeholder="consultation"
              />
              <span
                className={`text-xs ${slugCheck.checking ? "text-gray-400" : slugCheck.available ? "text-green-400" : "text-red-400"}`}
              >
                {slugCheck.checking
                  ? "Checking…"
                  : slugCheck.available
                    ? "Available"
                    : slugCheck.message || "Unavailable"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              rows={3}
              placeholder="Brief description of this booking type"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meeting Title Template
            </label>
            <input
              type="text"
              value={formData.meeting_title_template || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  meeting_title_template: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              placeholder="{contact.name} - {service}"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use variables: {"{"}contact.name{"}"}, {"{"}service{"}"}, {"{"}
              date{"}"}, {"{"}time{"}"}
            </p>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Booking Settings
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Booking Type
            </label>
            <select
              value={formData.type || "individual"}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as any })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="individual">Individual (1-on-1)</option>
              <option value="team">Team (specific staff)</option>
              <option value="round_robin">
                Round Robin (distribute evenly)
              </option>
              <option value="collective">Collective (group session)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Available Appointment Types *
            </label>
            {appointmentTypes.length === 0 ? (
              <div className="text-sm text-gray-400 p-3 bg-gray-700 rounded">
                <p>No appointment types found.</p>
                <Link
                  href="/settings/booking"
                  className="text-orange-500 hover:text-orange-400 underline"
                >
                  Create appointment types first →
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-600 rounded p-3">
                {appointmentTypes.map((type) => (
                  <label key={type.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        formData.appointment_type_ids?.includes(type.id) ||
                        false
                      }
                      onChange={(e) => {
                        const currentIds = formData.appointment_type_ids || [];
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            appointment_type_ids: [...currentIds, type.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            appointment_type_ids: currentIds.filter(
                              (id) => id !== type.id,
                            ),
                          });
                        }
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-300">{type.name}</span>
                      <div className="text-xs text-gray-500">
                        {type.duration_minutes} min • {type.session_type}
                        {type.max_capacity > 1 &&
                          ` • Max ${type.max_capacity} people`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assigned Staff (optional)
            </label>
            {staffMembers.length === 0 ? (
              <p className="text-sm text-gray-400">No staff members found</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-600 rounded p-3">
                {staffMembers.map((staff) => (
                  <label key={staff.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        formData.assigned_staff_ids?.includes(staff.id) || false
                      }
                      onChange={(e) => {
                        const currentIds = formData.assigned_staff_ids || [];
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            assigned_staff_ids: [...currentIds, staff.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assigned_staff_ids: currentIds.filter(
                              (id) => id !== staff.id,
                            ),
                          });
                        }
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-300">
                        {staff.full_name}
                      </span>
                      {staff.title && (
                        <div className="text-xs text-gray-500">
                          {staff.title}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to allow all staff members to take bookings
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Days in Advance
              </label>
              <input
                type="number"
                value={formData.max_days_in_advance || 30}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_days_in_advance: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                min="1"
                max="365"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone || "Europe/London"}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="America/New_York">New York (EST/EDT)</option>
                <option value="America/Los_Angeles">
                  Los Angeles (PST/PDT)
                </option>
                <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Meeting Location
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location Type
            </label>
            <select
              value={formData.meeting_location?.type || "in_person"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  meeting_location: {
                    ...formData.meeting_location,
                    type: e.target.value as any,
                  },
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="in_person">In Person</option>
              <option value="video_call">Video Call</option>
              <option value="phone">Phone Call</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location Details
            </label>
            <input
              type="text"
              value={formData.meeting_location?.details || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  meeting_location: {
                    ...formData.meeting_location,
                    details: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              placeholder={
                formData.meeting_location?.type === "in_person"
                  ? "Gym address or room"
                  : formData.meeting_location?.type === "video_call"
                    ? "Zoom link or meeting room"
                    : formData.meeting_location?.type === "phone"
                      ? "Phone number"
                      : "Custom location details"
              }
            />
          </div>
        </div>
      </div>

      {/* Buffer Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Buffer Time
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Before (minutes)
            </label>
            <input
              type="number"
              value={formData.buffer_settings?.before_minutes || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  buffer_settings: {
                    ...formData.buffer_settings,
                    before_minutes: parseInt(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              min="0"
              max="120"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              After (minutes)
            </label>
            <input
              type="number"
              value={formData.buffer_settings?.after_minutes || 15}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  buffer_settings: {
                    ...formData.buffer_settings,
                    after_minutes: parseInt(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              min="0"
              max="120"
            />
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_public || false}
            onChange={(e) =>
              setFormData({ ...formData, is_public: e.target.checked })
            }
            className="mr-3"
          />
          <span className="text-sm text-gray-300">
            Make this link publicly accessible
          </span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.requires_auth || false}
            onChange={(e) =>
              setFormData({ ...formData, requires_auth: e.target.checked })
            }
            className="mr-3"
          />
          <span className="text-sm text-gray-300">
            Require authentication to book
          </span>
        </label>
      </div>
    </div>
  );
};

const AvailabilityTab = ({
  formData,
  setFormData,
  staffMembers,
}: {
  formData: Partial<BookingLink>;
  setFormData: (data: Partial<BookingLink>) => void;
  staffMembers: StaffMember[];
}) => {
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [localBuffer, setLocalBuffer] = useState<{
    before: number;
    after: number;
  }>(() => ({
    before: formData.buffer_settings?.before_minutes ?? 0,
    after: formData.buffer_settings?.after_minutes ?? 15,
  }));

  const days = [
    { key: 0, label: "Sun" },
    { key: 1, label: "Mon" },
    { key: 2, label: "Tue" },
    { key: 3, label: "Wed" },
    { key: 4, label: "Thu" },
    { key: 5, label: "Fri" },
    { key: 6, label: "Sat" },
  ];

  const getWeeklyForStaff = (staffId: string) => {
    const rules: any = formData.availability_rules || {};
    const cfg = rules[staffId] || {};
    return cfg.weekly || {};
  };

  const updateWeeklyForStaff = (
    staffId: string,
    updater: (prev: any) => any,
  ) => {
    const rules: any = formData.availability_rules || {};
    const prevCfg = rules[staffId] || {};
    const nextWeekly = updater(prevCfg.weekly || {});
    const nextRules = {
      ...rules,
      [staffId]: {
        ...prevCfg,
        weekly: nextWeekly,
      },
    };
    setFormData({ ...formData, availability_rules: nextRules });
  };

  const addInterval = (staffId: string, dayKey: number) => {
    updateWeeklyForStaff(staffId, (prev: any) => {
      const day = prev[dayKey] || [];
      return { ...prev, [dayKey]: [...day, { start: "09:00", end: "17:00" }] };
    });
  };

  const updateInterval = (
    staffId: string,
    dayKey: number,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    updateWeeklyForStaff(staffId, (prev: any) => {
      const day = prev[dayKey] || [];
      const next = day.slice();
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [dayKey]: next };
    });
  };

  const removeInterval = (staffId: string, dayKey: number, index: number) => {
    updateWeeklyForStaff(staffId, (prev: any) => {
      const day = prev[dayKey] || [];
      const next = day.filter((_: any, i: number) => i !== index);
      return { ...prev, [dayKey]: next };
    });
  };

  const applyBuffer = () => {
    setFormData({
      ...formData,
      buffer_settings: {
        before_minutes: localBuffer.before,
        after_minutes: localBuffer.after,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Availability Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Staff Availability
          </label>
          <p className="text-sm text-gray-400 mb-4">
            Select staff and configure weekly working hours with optional
            buffers.
          </p>
          {staffMembers.length === 0 ? (
            <p className="text-sm text-gray-400">No staff members found</p>
          ) : (
            <div className="space-y-2">
              {staffMembers.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        formData.assigned_staff_ids?.includes(staff.id) || false
                      }
                      onChange={(e) => {
                        const currentIds = formData.assigned_staff_ids || [];
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            assigned_staff_ids: [...currentIds, staff.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assigned_staff_ids: currentIds.filter(
                              (id) => id !== staff.id,
                            ),
                          });
                        }
                      }}
                      className="mr-3"
                    />
                    <div>
                      <span className="text-sm text-gray-300">
                        {staff.full_name}
                      </span>
                      {staff.title && (
                        <div className="text-xs text-gray-500">
                          {staff.title}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStaff(staff.id)}
                  >
                    Configure Schedule
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Global Buffers
          </label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Before</span>
              <input
                type="number"
                min={0}
                max={120}
                value={localBuffer.before}
                onChange={(e) =>
                  setLocalBuffer({
                    ...localBuffer,
                    before: Number(e.target.value),
                  })
                }
                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <span className="text-sm text-gray-400">min</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">After</span>
              <input
                type="number"
                min={0}
                max={120}
                value={localBuffer.after}
                onChange={(e) =>
                  setLocalBuffer({
                    ...localBuffer,
                    after: Number(e.target.value),
                  })
                }
                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <span className="text-sm text-gray-400">min</span>
            </div>
            <Button variant="outline" size="sm" onClick={applyBuffer}>
              Apply
            </Button>
          </div>
        </div>
      </div>

      {selectedStaff && (
        <div className="border border-gray-700 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-300">
              Configure weekly hours for{" "}
              {staffMembers.find((s) => s.id === selectedStaff)?.full_name ||
                "Staff"}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStaff("")}
            >
              Close
            </Button>
          </div>
          <div className="space-y-3">
            {days.map((d) => {
              const weekly = getWeeklyForStaff(selectedStaff);
              const intervals: Array<{ start: string; end: string }> =
                weekly[d.key] || [];
              return (
                <div key={d.key} className="bg-gray-700 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-200">{d.label}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addInterval(selectedStaff, d.key)}
                    >
                      Add interval
                    </Button>
                  </div>
                  {intervals.length === 0 ? (
                    <div className="text-xs text-gray-400">No intervals</div>
                  ) : (
                    <div className="space-y-2">
                      {intervals.map((intv, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={intv.start}
                            onChange={(e) =>
                              updateInterval(
                                selectedStaff,
                                d.key,
                                idx,
                                "start",
                                e.target.value,
                              )
                            }
                            className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                          />
                          <span className="text-gray-400 text-sm">to</span>
                          <input
                            type="time"
                            value={intv.end}
                            onChange={(e) =>
                              updateInterval(
                                selectedStaff,
                                d.key,
                                idx,
                                "end",
                                e.target.value,
                              )
                            }
                            className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              removeInterval(selectedStaff, d.key, idx)
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FormTab = ({
  formData,
  setFormData,
}: {
  formData: Partial<BookingLink>;
  setFormData: (data: Partial<BookingLink>) => void;
}) => {
  const [customFields, setCustomFields] = useState(
    formData.form_configuration?.fields || [],
  );

  const generateFieldId = (base: string) => {
    const sanitized = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    let candidate = sanitized || "custom_field";
    const existing = new Set((customFields || []).map((f: any) => f.id));
    let i = 1;
    while (existing.has(candidate)) {
      candidate = `${sanitized || "custom_field"}_${i++}`;
    }
    return candidate;
  };

  const addCustomField = () => {
    const label = "Custom Field";
    const id = generateFieldId(label);
    const newField = {
      id,
      name: id,
      label,
      type: "text" as const,
      required: false,
      display_order: customFields.length,
    };
    const updatedFields = [...customFields, newField];
    setCustomFields(updatedFields);
    setFormData({
      ...formData,
      form_configuration: {
        ...formData.form_configuration,
        fields: updatedFields,
      },
    });
  };

  const sanitizeLabel = (value: string) =>
    value.replace(/\s+/g, " ").trim().slice(0, 120);
  const ensureUniqueIds = (fields: any[]) => {
    const seen = new Set<string>();
    return fields.map((f) => {
      let id = (f.id || f.name || "custom_field").toString();
      id = id
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");
      let candidate = id || "custom_field";
      let i = 1;
      while (seen.has(candidate)) {
        candidate = `${id || "custom_field"}_${i++}`;
      }
      seen.add(candidate);
      return { ...f, id: candidate, name: candidate };
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Form Configuration
      </h3>

      {/* Default Fields */}
      <div>
        <h4 className="text-md font-semibold text-gray-300 mb-3">
          Default Fields
        </h4>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>Name (required)</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>Email (required)</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>Phone (optional)</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>Notes (optional)</span>
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-semibold text-gray-300">Custom Fields</h4>
          <Button variant="outline" size="sm" onClick={addCustomField}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>

        {customFields.length === 0 ? (
          <p className="text-sm text-gray-400">No custom fields added</p>
        ) : (
          <div className="space-y-3">
            {customFields.map((field, index) => (
              <div
                key={field.id}
                className="p-3 bg-gray-700 rounded flex items-center gap-4"
              >
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => {
                      const updatedFields = [...customFields];
                      const newLabel = sanitizeLabel(e.target.value);
                      // if name/id still defaulting to previous label, keep them in sync
                      const wasDefault =
                        !field.name ||
                        field.name === field.id ||
                        field.name.includes("custom_field");
                      const nextId = wasDefault
                        ? generateFieldId(newLabel)
                        : field.id;
                      updatedFields[index] = {
                        ...field,
                        label: newLabel,
                        id: nextId,
                        name: nextId,
                      };
                      const normalized = ensureUniqueIds(updatedFields);
                      setCustomFields(normalized);
                      setFormData({
                        ...formData,
                        form_configuration: {
                          ...formData.form_configuration,
                          fields: normalized,
                        },
                      });
                    }}
                    className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    placeholder="Field Label"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => {
                      const updatedFields = [...customFields];
                      updatedFields[index] = {
                        ...field,
                        type: e.target.value as any,
                      };
                      const normalized = ensureUniqueIds(updatedFields);
                      setCustomFields(normalized);
                      setFormData({
                        ...formData,
                        form_configuration: {
                          ...formData.form_configuration,
                          fields: normalized,
                        },
                      });
                    }}
                    className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="radio">Radio</option>
                    <option value="date">Date</option>
                    <option value="time">Time</option>
                  </select>
                  <label className="flex items-center text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        const updatedFields = [...customFields];
                        updatedFields[index] = {
                          ...field,
                          required: e.target.checked,
                        };
                        const normalized = ensureUniqueIds(updatedFields);
                        setCustomFields(normalized);
                        setFormData({
                          ...formData,
                          form_configuration: {
                            ...formData.form_configuration,
                            fields: normalized,
                          },
                        });
                      }}
                      className="mr-2"
                    />
                    Required
                  </label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const updatedFields = customFields.filter(
                      (_, i) => i !== index,
                    );
                    const normalized = ensureUniqueIds(updatedFields).map(
                      (f, i) => ({ ...f, display_order: i }),
                    );
                    setCustomFields(normalized);
                    setFormData({
                      ...formData,
                      form_configuration: {
                        ...formData.form_configuration,
                        fields: normalized,
                      },
                    });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-300">
          Confirmation Settings
        </h4>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.confirmation_settings?.auto_confirm || false}
            onChange={(e) =>
              setFormData({
                ...formData,
                confirmation_settings: {
                  ...formData.confirmation_settings,
                  auto_confirm: e.target.checked,
                },
              })
            }
            className="mr-3"
          />
          <span className="text-sm text-gray-300">
            Auto-confirm bookings (no manual approval required)
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Redirect URL (optional)
          </label>
          <input
            type="url"
            value={formData.confirmation_settings?.redirect_url || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                confirmation_settings: {
                  ...formData.confirmation_settings,
                  redirect_url: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            placeholder="https://your-website.com/thank-you"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Custom Confirmation Message
          </label>
          <textarea
            value={formData.confirmation_settings?.custom_message || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                confirmation_settings: {
                  ...formData.confirmation_settings,
                  custom_message: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            rows={3}
            placeholder="Thank you for booking! We'll see you soon."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Consent Text
          </label>
          <textarea
            value={formData.form_configuration?.consent_text || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                form_configuration: {
                  ...formData.form_configuration,
                  consent_text: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            rows={2}
            placeholder="I agree to receive communications about my booking."
          />
        </div>
      </div>
    </div>
  );
};

const NotificationsTab = ({
  formData,
  setFormData,
}: {
  formData: Partial<BookingLink>;
  setFormData: (data: Partial<BookingLink>) => void;
}) => {
  const reminderOptions = [
    { value: "1 week", label: "1 week before" },
    { value: "3 days", label: "3 days before" },
    { value: "1 day", label: "1 day before" },
    { value: "4 hours", label: "4 hours before" },
    { value: "1 hour", label: "1 hour before" },
    { value: "15 minutes", label: "15 minutes before" },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Bell className="w-5 h-5" />
        Notification Settings
      </h3>

      {/* Email Notifications */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-300">
          Email Notifications
        </h4>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.notification_settings?.email_enabled || false}
            onChange={(e) =>
              setFormData({
                ...formData,
                notification_settings: {
                  ...formData.notification_settings,
                  email_enabled: e.target.checked,
                },
              })
            }
            className="mr-3"
          />
          <span className="text-sm text-gray-300">
            Send email confirmations and reminders
          </span>
        </label>
      </div>

      {/* SMS Notifications */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-300">
          SMS Notifications
        </h4>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.notification_settings?.sms_enabled || false}
            onChange={(e) =>
              setFormData({
                ...formData,
                notification_settings: {
                  ...formData.notification_settings,
                  sms_enabled: e.target.checked,
                },
              })
            }
            className="mr-3"
          />
          <span className="text-sm text-gray-300">
            Send SMS confirmations and reminders
          </span>
        </label>
      </div>

      {/* Reminder Schedule */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-300">
          Reminder Schedule
        </h4>

        <div className="space-y-2">
          {reminderOptions.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="checkbox"
                checked={
                  formData.notification_settings?.reminder_schedules?.includes(
                    option.value,
                  ) || false
                }
                onChange={(e) => {
                  const currentSchedules =
                    formData.notification_settings?.reminder_schedules || [];
                  const newSchedules = e.target.checked
                    ? [...currentSchedules, option.value]
                    : currentSchedules.filter((s) => s !== option.value);

                  setFormData({
                    ...formData,
                    notification_settings: {
                      ...formData.notification_settings,
                      reminder_schedules: newSchedules,
                    },
                  });
                }}
                className="mr-3"
              />
              <span className="text-sm text-gray-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Cancellation Notifications */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-300">
          Cancellation Policy
        </h4>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.cancellation_policy?.allowed || false}
            onChange={(e) =>
              setFormData({
                ...formData,
                cancellation_policy: {
                  ...formData.cancellation_policy,
                  allowed: e.target.checked,
                },
              })
            }
            className="mr-3"
          />
          <span className="text-sm text-gray-300">
            Allow customers to cancel bookings
          </span>
        </label>

        {formData.cancellation_policy?.allowed && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimum hours before appointment
            </label>
            <input
              type="number"
              value={formData.cancellation_policy?.hours_before || 24}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cancellation_policy: {
                    ...formData.cancellation_policy,
                    hours_before: parseInt(e.target.value) || 24,
                  },
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              min="0"
              max="168"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cancellation Policy Text
          </label>
          <textarea
            value={formData.cancellation_policy?.policy_text || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                cancellation_policy: {
                  ...formData.cancellation_policy,
                  policy_text: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            rows={3}
            placeholder="Cancellations allowed up to 24 hours before appointment."
          />
        </div>
      </div>
    </div>
  );
};

const CustomizationTab = ({
  formData,
  setFormData,
}: {
  formData: Partial<BookingLink>;
  setFormData: (data: Partial<BookingLink>) => void;
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Palette className="w-5 h-5" />
        Style Customization
      </h3>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.style_settings?.primary_color || "#3b82f6"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  style_settings: {
                    ...formData.style_settings,
                    primary_color: e.target.value,
                  },
                })
              }
              className="w-12 h-8 rounded border border-gray-600"
            />
            <input
              type="text"
              value={formData.style_settings?.primary_color || "#3b82f6"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  style_settings: {
                    ...formData.style_settings,
                    primary_color: e.target.value,
                  },
                })
              }
              className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Background Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.style_settings?.background_color || "#ffffff"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  style_settings: {
                    ...formData.style_settings,
                    background_color: e.target.value,
                  },
                })
              }
              className="w-12 h-8 rounded border border-gray-600"
            />
            <input
              type="text"
              value={formData.style_settings?.background_color || "#ffffff"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  style_settings: {
                    ...formData.style_settings,
                    background_color: e.target.value,
                  },
                })
              }
              className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Text Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.style_settings?.text_color || "#1f2937"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  style_settings: {
                    ...formData.style_settings,
                    text_color: e.target.value,
                  },
                })
              }
              className="w-12 h-8 rounded border border-gray-600"
            />
            <input
              type="text"
              value={formData.style_settings?.text_color || "#1f2937"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  style_settings: {
                    ...formData.style_settings,
                    text_color: e.target.value,
                  },
                })
              }
              className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Logo URL (optional)
        </label>
        <input
          type="url"
          value={formData.style_settings?.logo_url || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              style_settings: {
                ...formData.style_settings,
                logo_url: e.target.value,
              },
            })
          }
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          placeholder="https://your-gym.com/logo.png"
        />
      </div>

      {/* Custom CSS */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Custom CSS (optional)
        </label>
        <textarea
          value={formData.style_settings?.custom_css || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              style_settings: {
                ...formData.style_settings,
                custom_css: e.target.value,
              },
            })
          }
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm"
          rows={8}
          placeholder={`.booking-widget {
  /* Custom styles here */
}

.booking-button {
  border-radius: 8px;
  font-weight: 600;
}`}
        />
      </div>

      {/* Payment Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-300 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Payment Settings
        </h4>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.payment_settings?.enabled || false}
            onChange={(e) =>
              setFormData({
                ...formData,
                payment_settings: {
                  ...formData.payment_settings,
                  enabled: e.target.checked,
                },
              })
            }
            className="mr-3"
          />
          <span className="text-sm text-gray-300">
            Require payment when booking
          </span>
        </label>

        {formData.payment_settings?.enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount
              </label>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">£</span>
                <input
                  type="number"
                  value={formData.payment_settings?.amount || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payment_settings: {
                        ...formData.payment_settings,
                        amount: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.payment_settings?.description || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_settings: {
                      ...formData.payment_settings,
                      description: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                placeholder="Consultation fee"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
