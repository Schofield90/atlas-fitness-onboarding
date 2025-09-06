"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  User,
  Package,
} from "lucide-react";
import {
  formatBritishDateTime,
  formatBritishDate,
} from "@/app/lib/utils/british-format";

interface SingleClassBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  classSchedule: {
    id: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings: number;
    price_pennies: number;
    room_location?: string;
    instructor_name?: string;
    booking_cutoff_hours?: number;
    cancellation_cutoff_hours?: number;
    class_type: {
      id: string;
      name: string;
      description?: string;
      color?: string;
    };
  };
  customerId: string;
  organizationId: string;
  onBookingCreated?: () => void;
}

interface PaymentMethod {
  id: string;
  type: "package" | "membership" | "card";
  name: string;
  description: string;
  remaining?: number;
  isAvailable: boolean;
}

const formatPrice = (pennies: number) => {
  return `£${(pennies / 100).toFixed(2)}`;
};

export default function SingleClassBookingModal({
  isOpen,
  onClose,
  classSchedule,
  customerId,
  organizationId,
  onBookingCreated,
}: SingleClassBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"details" | "payment" | "confirmation">(
    "details",
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [existingBooking, setExistingBooking] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchCustomerDetails();
      fetchPaymentMethods();
      checkExistingBooking();
    }
  }, [isOpen, customerId, classSchedule.id]);

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
      const methods: PaymentMethod[] = [];

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

      // Check for active memberships (if they include classes)
      const { data: memberships } = await supabase
        .from("memberships")
        .select(
          `
          *,
          plan:membership_plans(*)
        `,
        )
        .eq("client_id", customerId)
        .eq("organization_id", organizationId)
        .eq("status", "active");

      memberships?.forEach((membership) => {
        if (membership.plan?.includes_classes) {
          methods.push({
            id: membership.id,
            type: "membership",
            name: membership.plan.name,
            description: "Included in membership",
            isAvailable: true,
          });
        }
      });

      // Add card payment option if there's a price
      if (classSchedule.price_pennies > 0) {
        methods.push({
          id: "card",
          type: "card",
          name: "Credit/Debit Card",
          description: formatPrice(classSchedule.price_pennies),
          isAvailable: true,
        });
      }

      // Add free option if price is 0
      if (classSchedule.price_pennies === 0) {
        methods.push({
          id: "free",
          type: "card",
          name: "Free Class",
          description: "No payment required",
          isAvailable: true,
        });
      }

      setPaymentMethods(methods);

      // Auto-select first available method
      const availableMethod = methods.find((m) => m.isAvailable);
      if (availableMethod) {
        setSelectedPaymentMethod(availableMethod.id);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const checkExistingBooking = async () => {
    try {
      const { data, error } = await supabase
        .from("class_bookings")
        .select("*")
        .eq("client_id", customerId)
        .eq("schedule_id", classSchedule.id)
        .eq("status", "confirmed")
        .single();

      if (data) setExistingBooking(data);
    } catch (error) {
      // No existing booking found - this is expected
    }
  };

  const canBookClass = () => {
    // Check if class is full
    if (classSchedule.current_bookings >= classSchedule.max_capacity) {
      return { canBook: false, reason: "Class is full" };
    }

    // Check if existing booking exists
    if (existingBooking) {
      return {
        canBook: false,
        reason: "You are already booked for this class",
      };
    }

    // Check booking cutoff time
    const classStartTime = new Date(classSchedule.start_time);
    const now = new Date();
    const hoursUntilClass =
      (classStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const cutoffHours = classSchedule.booking_cutoff_hours || 2;

    if (hoursUntilClass < cutoffHours) {
      return {
        canBook: false,
        reason: `Booking closes ${cutoffHours} hours before class`,
      };
    }

    return { canBook: true, reason: null };
  };

  const handleBookClass = async () => {
    try {
      setLoading(true);

      const selectedMethod = paymentMethods.find(
        (m) => m.id === selectedPaymentMethod,
      );
      if (!selectedMethod) throw new Error("No payment method selected");

      const bookingData = {
        organization_id: organizationId,
        schedule_id: classSchedule.id,
        client_id: customerId,
        booking_type: selectedMethod.type === "package" ? "package" : "single",
        status: "confirmed",
        payment_status:
          selectedMethod.type === "card" && classSchedule.price_pennies > 0
            ? "pending"
            : "succeeded",
        payment_amount_pennies:
          selectedMethod.type === "card" ? classSchedule.price_pennies : 0,
        special_requirements: specialRequirements || null,
        metadata:
          selectedMethod.type === "package"
            ? { package_id: selectedMethod.id }
            : {},
      };

      const { error: bookingError } = await supabase
        .from("class_bookings")
        .insert(bookingData);

      if (bookingError) throw bookingError;

      // If using a package, update the package usage
      if (selectedMethod.type === "package") {
        const { error: packageError } = await supabase
          .from("customer_class_packages")
          .update({
            classes_remaining: (selectedMethod.remaining || 1) - 1,
            classes_used: supabase.rpc("increment_classes_used", {
              pkg_id: selectedMethod.id,
            }),
          })
          .eq("id", selectedMethod.id);

        if (packageError) throw packageError;
      }

      setStep("confirmation");
      onBookingCreated?.();

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setStep("details");
      }, 3000);
    } catch (error) {
      console.error("Error booking class:", error);
      alert("Failed to book class. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep("details");
    setSpecialRequirements("");
    setSelectedPaymentMethod("");
  };

  const { canBook, reason } = canBookClass();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {step === "details" && "Book Class"}
            {step === "payment" && "Choose Payment Method"}
            {step === "confirmation" && "Booking Confirmed"}
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
          {step === "details" && (
            <div className="space-y-6">
              {/* Class Details */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-4">
                  {classSchedule.class_type.name}
                </h3>
                {classSchedule.class_type.description && (
                  <p className="text-gray-300 mb-4">
                    {classSchedule.class_type.description}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="h-4 w-4" />
                    {formatBritishDate(classSchedule.start_time)}
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="h-4 w-4" />
                    {
                      formatBritishDateTime(classSchedule.start_time).split(
                        " ",
                      )[1]
                    }{" "}
                    -{" "}
                    {
                      formatBritishDateTime(classSchedule.end_time).split(
                        " ",
                      )[1]
                    }
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users className="h-4 w-4" />
                    {classSchedule.current_bookings}/
                    {classSchedule.max_capacity} booked
                  </div>
                  {classSchedule.room_location && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="h-4 w-4" />
                      {classSchedule.room_location}
                    </div>
                  )}
                  {classSchedule.instructor_name && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <User className="h-4 w-4" />
                      {classSchedule.instructor_name}
                    </div>
                  )}
                  {classSchedule.price_pennies > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <CreditCard className="h-4 w-4" />
                      {formatPrice(classSchedule.price_pennies)}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              {customer && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-md font-medium text-white mb-2">
                    Booking for:
                  </h4>
                  <p className="text-gray-300">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-gray-400 text-sm">{customer.email}</p>
                </div>
              )}

              {/* Special Requirements */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Special Requirements (Optional)
                </label>
                <textarea
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder="Any special requirements or notes..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Warnings */}
              {!canBook && (
                <div className="bg-red-900 border border-red-700 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-300 font-medium">
                      Cannot Book Class
                    </h4>
                    <p className="text-red-400 text-sm">{reason}</p>
                  </div>
                </div>
              )}

              {/* Cancellation Policy */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">
                  Cancellation Policy
                </h4>
                <p className="text-gray-400 text-sm">
                  Bookings can be cancelled up to{" "}
                  {classSchedule.cancellation_cutoff_hours || 24} hours before
                  the class starts. Late cancellations may incur fees.
                </p>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">
                Select Payment Method
              </h3>

              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No payment methods available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPaymentMethod === method.id
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-gray-700 bg-gray-800 hover:bg-gray-750"
                      } ${!method.isAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() =>
                        method.isAvailable &&
                        setSelectedPaymentMethod(method.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            selectedPaymentMethod === method.id
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-400"
                          }`}
                        >
                          {selectedPaymentMethod === method.id && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {method.type === "package" && (
                              <Package className="h-4 w-4 text-orange-400" />
                            )}
                            {method.type === "card" && (
                              <CreditCard className="h-4 w-4 text-blue-400" />
                            )}
                            <h4 className="text-white font-medium">
                              {method.name}
                            </h4>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {method.description}
                          </p>
                          {method.remaining !== undefined &&
                            method.remaining <= 3 && (
                              <p className="text-yellow-400 text-xs mt-1">
                                Warning: Only {method.remaining} classes
                                remaining
                              </p>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "confirmation" && (
            <div className="text-center space-y-6">
              <div className="bg-green-900 border border-green-700 rounded-lg p-6">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Booking Confirmed!
                </h3>
                <p className="text-green-300">
                  You've successfully booked {classSchedule.class_type.name}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  A confirmation email has been sent to your email address.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 text-left">
                <h4 className="text-white font-medium mb-2">
                  Booking Details:
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div>Class: {classSchedule.class_type.name}</div>
                  <div>Date: {formatBritishDate(classSchedule.start_time)}</div>
                  <div>
                    Time:{" "}
                    {
                      formatBritishDateTime(classSchedule.start_time).split(
                        " ",
                      )[1]
                    }{" "}
                    -{" "}
                    {
                      formatBritishDateTime(classSchedule.end_time).split(
                        " ",
                      )[1]
                    }
                  </div>
                  {classSchedule.room_location && (
                    <div>Location: {classSchedule.room_location}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="flex gap-3">
            {step === "payment" && (
              <button
                onClick={() => setStep("details")}
                className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {step === "details" && canBook && (
              <button
                onClick={() => setStep("payment")}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Continue
              </button>
            )}

            {step === "payment" && (
              <button
                onClick={handleBookClass}
                disabled={!selectedPaymentMethod || loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
