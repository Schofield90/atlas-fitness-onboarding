"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  X,
  Calendar,
  Clock,
  Repeat,
  User,
  Settings,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatBritishDate } from "@/app/lib/utils/british-format";

interface RecurringBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  organizationId: string;
  onRecurringBookingCreated?: () => void;
}

interface ClassType {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface Instructor {
  id: string;
  name: string;
  email?: string;
  specialties?: string[];
}

interface RecurringPattern {
  days: number[]; // 0=Sunday, 1=Monday, etc.
  time: string;
  duration: number;
  weeks?: number[]; // For biweekly/monthly patterns
  monthlyPattern?: "date" | "day"; // For monthly: same date vs same weekday
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const RECURRENCE_TYPES = [
  { value: "weekly", label: "Weekly", description: "Same days every week" },
  { value: "biweekly", label: "Bi-weekly", description: "Every 2 weeks" },
  { value: "monthly", label: "Monthly", description: "Same time each month" },
];

const formatPrice = (pennies: number) => {
  return `£${(pennies / 100).toFixed(2)}`;
};

export default function RecurringBookingModal({
  isOpen,
  onClose,
  customerId,
  organizationId,
  onRecurringBookingCreated,
}: RecurringBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"setup" | "payment" | "confirmation">(
    "setup",
  );
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [customer, setCustomer] = useState<any>(null);

  // Form data
  const [selectedClassType, setSelectedClassType] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<
    "weekly" | "biweekly" | "monthly"
  >("weekly");
  const [pattern, setPattern] = useState<RecurringPattern>({
    days: [],
    time: "09:00",
    duration: 60,
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxBookings, setMaxBookings] = useState<number | "">("");
  const [autoBook, setAutoBook] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<
    "per_class" | "monthly" | "package" | "membership" | "free"
  >("per_class");
  const [pricePerClass, setPricePerClass] = useState(2000); // £20.00 in pennies
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>(
    [],
  );
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("");

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchClassTypes();
      fetchInstructors();
      fetchCustomerDetails();
      fetchPaymentMethods();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSelectedClassType("");
    setSelectedInstructor("");
    setRecurrenceType("weekly");
    setPattern({ days: [], time: "09:00", duration: 60 });
    setStartDate("");
    setEndDate("");
    setMaxBookings("");
    setAutoBook(true);
    setPaymentMethod("per_class");
    setPricePerClass(2000);
  };

  const fetchClassTypes = async () => {
    try {
      // Try programs table first (what the class-calendar uses)
      const { data: programs, error: programsError } = await supabase
        .from("programs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");

      if (!programsError && programs) {
        // Transform programs to class types format
        const classTypesFromPrograms = programs.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
        }));
        setClassTypes(classTypesFromPrograms);
      } else {
        // Fallback to class_types if it exists
        const { data, error } = await supabase
          .from("class_types")
          .select("*")
          .order("name");

        if (error) {
          console.error("Error fetching class types:", error);
          setClassTypes([]);
        } else {
          setClassTypes(data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching class types:", error);
      setClassTypes([]);
    }
  };

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from("instructors")
        .select("*")
        .order("name");

      if (error) throw error;
      setInstructors(data || []);
    } catch (error) {
      console.error("Error fetching instructors:", error);
    }
  };

  const fetchCustomerDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", customerId)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error("Error fetching customer details:", error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const methods: any[] = [];

      // Check for active memberships
      const { data: memberships } = await supabase
        .from("customer_memberships")
        .select(`*`)
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .eq("organization_id", organizationId)
        .eq("status", "active");

      memberships?.forEach((membership) => {
        // Check if membership has class limits
        if (
          membership.classes_per_period &&
          membership.classes_per_period > 0
        ) {
          const remainingClasses =
            membership.classes_per_period -
            (membership.classes_used_this_period || 0);
          if (remainingClasses > 0) {
            methods.push({
              id: membership.id,
              type: "membership",
              name: membership.membership_name || "Membership",
              description: `${remainingClasses} classes remaining this period`,
              remaining: remainingClasses,
              isAvailable: true,
              unlimited: false,
            });
          }
        } else {
          // Unlimited classes
          methods.push({
            id: membership.id,
            type: "membership",
            name: membership.membership_name || "Membership",
            description: "Unlimited classes",
            isAvailable: true,
            unlimited: true,
          });
        }
      });

      // Check for active class packages
      const { data: packages } = await supabase
        .from("customer_class_packages")
        .select(
          `
          *,
          package:class_packages(*)
        `,
        )
        .eq("client_id", customerId)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .gt("classes_remaining", 0);

      packages?.forEach((pkg) => {
        methods.push({
          id: pkg.id,
          type: "package",
          name: pkg.package.name,
          description: `${pkg.classes_remaining} classes remaining`,
          remaining: pkg.classes_remaining,
          isAvailable: true,
        });
      });

      setAvailablePaymentMethods(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const toggleDay = (dayValue: number) => {
    setPattern((prev) => ({
      ...prev,
      days: prev.days.includes(dayValue)
        ? prev.days.filter((d) => d !== dayValue)
        : [...prev.days, dayValue].sort((a, b) => a - b),
    }));
  };

  const generatePreview = () => {
    if (!startDate || pattern.days.length === 0) return [];

    const preview = [];
    const start = new Date(startDate);
    const end = endDate
      ? new Date(endDate)
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    let current = new Date(start);
    let count = 0;
    const maxPreview = Math.min(
      typeof maxBookings === "number" ? maxBookings : 12,
      12,
    );

    while (current <= end && count < maxPreview) {
      const dayOfWeek = current.getDay();

      if (pattern.days.includes(dayOfWeek)) {
        preview.push(new Date(current));
        count++;
      }

      // Move to next day based on recurrence type
      if (recurrenceType === "weekly") {
        current.setDate(current.getDate() + 1);
      } else if (recurrenceType === "biweekly") {
        current.setDate(current.getDate() + 1);
        // Skip every other week (simplified logic)
      } else if (recurrenceType === "monthly") {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return preview;
  };

  const validateForm = () => {
    if (!selectedClassType && !selectedInstructor) {
      return {
        isValid: false,
        error: "Please select either a class type or instructor",
      };
    }
    if (pattern.days.length === 0) {
      return {
        isValid: false,
        error: "Please select at least one day of the week",
      };
    }
    if (!startDate) {
      return { isValid: false, error: "Please select a start date" };
    }
    if (!pattern.time) {
      return { isValid: false, error: "Please select a time" };
    }
    return { isValid: true, error: null };
  };

  const handleCreateRecurringBooking = async () => {
    try {
      setLoading(true);

      const validation = validateForm();
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      const recurringBookingData = {
        organization_id: organizationId,
        client_id: customerId,
        class_type_id: selectedClassType || null,
        instructor_id: selectedInstructor || null,
        recurrence_type: recurrenceType,
        recurrence_pattern: pattern,
        start_date: startDate,
        end_date: endDate || null,
        max_bookings: typeof maxBookings === "number" ? maxBookings : null,
        auto_book: autoBook,
        payment_method: paymentMethod,
        price_per_class_pennies: pricePerClass,
        status: "active",
      };

      const { error } = await supabase
        .from("recurring_bookings")
        .insert(recurringBookingData);

      if (error) throw error;

      setStep("confirmation");
      onRecurringBookingCreated?.();

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setStep("setup");
        resetForm();
      }, 3000);
    } catch (error) {
      console.error("Error creating recurring booking:", error);
      alert("Failed to create recurring booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep("setup");
    resetForm();
  };

  const preview = generatePreview();
  const validation = validateForm();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {step === "setup" && "Set Up Recurring Booking"}
            {step === "payment" && "Payment Settings"}
            {step === "confirmation" && "Recurring Booking Created"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "setup" && (
            <div className="space-y-6">
              {/* Customer Info */}
              {customer && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-md font-medium text-white mb-2">
                    Setting up recurring booking for:
                  </h4>
                  <p className="text-gray-300">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-gray-400 text-sm">{customer.email}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Class Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">
                    Class Preferences
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Class Type (Optional)
                    </label>
                    <select
                      value={selectedClassType}
                      onChange={(e) => setSelectedClassType(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Any class type</option>
                      {classTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-gray-400 text-xs mt-1">
                      Leave blank to book any available class at the specified
                      times
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Preferred Instructor (Optional)
                    </label>
                    <select
                      value={selectedInstructor}
                      onChange={(e) => setSelectedInstructor(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Any instructor</option>
                      {instructors.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Schedule Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Schedule</h3>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Recurrence Pattern
                    </label>
                    <div className="space-y-2">
                      {RECURRENCE_TYPES.map((type) => (
                        <div
                          key={type.value}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            recurrenceType === type.value
                              ? "border-blue-500 bg-blue-900/20"
                              : "border-gray-700 bg-gray-800 hover:bg-gray-750"
                          }`}
                          onClick={() => setRecurrenceType(type.value as any)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                recurrenceType === type.value
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-400"
                              }`}
                            >
                              {recurrenceType === type.value && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-white font-medium">
                                {type.label}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Preferred Time
                      </label>
                      <input
                        type="time"
                        value={pattern.time}
                        onChange={(e) =>
                          setPattern((prev) => ({
                            ...prev,
                            time: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={pattern.duration}
                        onChange={(e) =>
                          setPattern((prev) => ({
                            ...prev,
                            duration: parseInt(e.target.value) || 60,
                          }))
                        }
                        min="30"
                        max="180"
                        step="15"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Days of the Week <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pattern.days.includes(day.value)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Max Bookings (Optional)
                  </label>
                  <input
                    type="number"
                    value={maxBookings}
                    onChange={(e) =>
                      setMaxBookings(
                        e.target.value ? parseInt(e.target.value) : "",
                      )
                    }
                    min="1"
                    placeholder="Unlimited"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Auto-booking Setting */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto-book"
                  checked={autoBook}
                  onChange={(e) => setAutoBook(e.target.checked)}
                  className="w-4 h-4 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-blue-600"
                />
                <label htmlFor="auto-book" className="text-white">
                  Automatically book when matching classes become available
                </label>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Preview (Next {preview.length} bookings)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-300">
                    {preview.map((date, index) => (
                      <div
                        key={index}
                        className="bg-gray-700 rounded px-2 py-1"
                      >
                        {formatBritishDate(date.toISOString())}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {!validation.isValid && (
                <div className="bg-red-900 border border-red-700 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-300 font-medium">
                      Form Incomplete
                    </h4>
                    <p className="text-red-400 text-sm">{validation.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">
                Payment Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Payment Method
                  </label>
                  <div className="space-y-2">
                    {/* Show available memberships */}
                    {availablePaymentMethods
                      .filter((m) => m.type === "membership")
                      .map((method) => (
                        <div
                          key={method.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedPaymentMethodId === method.id
                              ? "border-blue-500 bg-blue-900/20"
                              : "border-gray-700 bg-gray-800 hover:bg-gray-750"
                          }`}
                          onClick={() => {
                            setPaymentMethod("membership");
                            setSelectedPaymentMethodId(method.id);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                selectedPaymentMethodId === method.id
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-400"
                              }`}
                            >
                              {selectedPaymentMethodId === method.id && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-white font-medium">
                                {method.name} (Membership)
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {method.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Show available packages */}
                    {availablePaymentMethods
                      .filter((m) => m.type === "package")
                      .map((method) => (
                        <div
                          key={method.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedPaymentMethodId === method.id
                              ? "border-blue-500 bg-blue-900/20"
                              : "border-gray-700 bg-gray-800 hover:bg-gray-750"
                          }`}
                          onClick={() => {
                            setPaymentMethod("package");
                            setSelectedPaymentMethodId(method.id);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                selectedPaymentMethodId === method.id
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-400"
                              }`}
                            >
                              {selectedPaymentMethodId === method.id && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-white font-medium">
                                {method.name} (Package)
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {method.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Free booking option */}
                    <div
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        paymentMethod === "free"
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-gray-700 bg-gray-800 hover:bg-gray-750"
                      }`}
                      onClick={() => {
                        setPaymentMethod("free");
                        setSelectedPaymentMethodId("");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            paymentMethod === "free"
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-400"
                          }`}
                        >
                          {paymentMethod === "free" && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">
                            Free Booking
                          </h4>
                          <p className="text-gray-400 text-sm">
                            Complimentary - no charge
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pay per class option */}
                    <div
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        paymentMethod === "per_class"
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-gray-700 bg-gray-800 hover:bg-gray-750"
                      }`}
                      onClick={() => {
                        setPaymentMethod("per_class");
                        setSelectedPaymentMethodId("");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            paymentMethod === "per_class"
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-400"
                          }`}
                        >
                          {paymentMethod === "per_class" && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">
                            Pay per class
                          </h4>
                          <p className="text-gray-400 text-sm">
                            Charge for each individual booking
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {paymentMethod === "per_class" && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Price per Class
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">£</span>
                      <input
                        type="number"
                        value={(pricePerClass / 100).toFixed(2)}
                        onChange={(e) =>
                          setPricePerClass(
                            Math.round(parseFloat(e.target.value || "0") * 100),
                          )
                        }
                        step="0.01"
                        min="0"
                        className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "confirmation" && (
            <div className="text-center space-y-6">
              <div className="bg-green-900 border border-green-700 rounded-lg p-6">
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Recurring Booking Created!
                </h3>
                <p className="text-green-300">
                  Your recurring booking pattern has been set up successfully.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {autoBook
                    ? "Classes will be automatically booked when they become available."
                    : "You will receive notifications when matching classes are available."}
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 text-left">
                <h4 className="text-white font-medium mb-3">
                  Recurring Booking Summary:
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div>
                    <strong>Pattern:</strong> {recurrenceType} on{" "}
                    {pattern.days
                      .map(
                        (d) =>
                          DAYS_OF_WEEK.find((day) => day.value === d)?.short,
                      )
                      .join(", ")}
                  </div>
                  <div>
                    <strong>Time:</strong> {pattern.time}
                  </div>
                  <div>
                    <strong>Duration:</strong> {pattern.duration} minutes
                  </div>
                  <div>
                    <strong>Start Date:</strong> {formatBritishDate(startDate)}
                  </div>
                  {endDate && (
                    <div>
                      <strong>End Date:</strong> {formatBritishDate(endDate)}
                    </div>
                  )}
                  {maxBookings && (
                    <div>
                      <strong>Max Bookings:</strong> {maxBookings}
                    </div>
                  )}
                  <div>
                    <strong>Payment:</strong> {formatPrice(pricePerClass)} per
                    class
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div></div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {step === "setup" && (
              <button
                onClick={() => setStep("payment")}
                disabled={!validation.isValid}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                Continue
              </button>
            )}

            {step === "payment" && (
              <>
                <button
                  onClick={() => setStep("setup")}
                  className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateRecurringBooking}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Recurring Booking"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
