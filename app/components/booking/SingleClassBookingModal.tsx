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
  classSchedule?: {
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
  classSchedule = {
    id: "",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    max_capacity: 20,
    current_bookings: 0,
    price_pennies: 0,
    class_type: {
      id: "",
      name: "Test Class",
      description: "This is a test class booking",
    },
  },
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
    if (isOpen && customerId) {
      // Reset existing booking state when modal opens
      setExistingBooking(null);
      loadBookingData();
    }
  }, [isOpen, customerId, classSchedule.id]);

  const loadBookingData = async () => {
    try {
      // Load customer details first
      await fetchCustomerDetails();
    } catch (error) {
      console.error("Error loading booking data:", error);
    }
  };

  // Load payment methods and check bookings after customer is loaded
  useEffect(() => {
    if (customer && isOpen) {
      console.log(
        "Customer loaded, fetching payment methods and checking bookings",
        {
          customerId,
          customerType: customer.type,
          classScheduleId: classSchedule.id,
        },
      );
      fetchPaymentMethods();
      checkExistingBooking();
    }
  }, [customer, isOpen]);

  const fetchCustomerDetails = async () => {
    try {
      // First try to fetch from clients table
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", customerId)
        .maybeSingle();

      if (clientData) {
        setCustomer({ ...clientData, type: "client" });
        return;
      }

      // If not found in clients, try leads table
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", customerId)
        .maybeSingle();

      if (leadData) {
        setCustomer({ ...leadData, type: "lead" });
        return;
      }

      throw new Error("Customer not found in either clients or leads table");
    } catch (error) {
      console.error("Error fetching customer details:", error);
      alert("Failed to load customer details. Please try again.");
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

      // Check for active memberships from customer_memberships table
      // Use customer type to determine which field to query
      let membershipQuery = supabase
        .from("customer_memberships")
        .select(
          `
          *,
          membership_plans (*)
        `,
        )
        .eq("organization_id", organizationId)
        .eq("status", "active");

      // Use appropriate customer field based on customer type
      if (customer?.type === "lead") {
        membershipQuery = membershipQuery.eq("customer_id", customerId);
      } else {
        membershipQuery = membershipQuery.eq("client_id", customerId);
      }

      const { data: memberships } = await membershipQuery;

      memberships?.forEach((membership) => {
        const plan = membership.membership_plans;
        if (plan) {
          // Check if membership has class limits
          const hasClassLimit =
            plan.classes_per_period && plan.classes_per_period > 0;
          const classesUsed = membership.classes_used_this_period || 0;
          const classesRemaining = hasClassLimit
            ? plan.classes_per_period - classesUsed
            : null;

          methods.push({
            id: membership.id,
            type: "membership",
            name: plan.name,
            description: hasClassLimit
              ? `${classesRemaining} classes remaining this period`
              : "Unlimited classes included",
            remaining: classesRemaining,
            isAvailable: !hasClassLimit || classesRemaining > 0,
          });
        }
      });

      // Always add free booking option
      methods.push({
        id: "free",
        type: "card",
        name: "Free Booking",
        description: "Complimentary - no charge",
        isAvailable: true,
      });

      // Add card payment option if there's a price
      if (classSchedule.price_pennies > 0) {
        methods.push({
          id: "card",
          type: "card",
          name: "Pay Drop-in Rate",
          description: formatPrice(classSchedule.price_pennies),
          isAvailable: true,
        });
      }

      setPaymentMethods(methods);

      // Auto-select first available method (prefer membership/package over paid)
      const availableMethod =
        methods.find((m) => m.isAvailable && m.type === "membership") ||
        methods.find((m) => m.isAvailable && m.type === "package") ||
        methods.find((m) => m.isAvailable && m.id === "free") ||
        methods.find((m) => m.isAvailable);

      if (availableMethod) {
        setSelectedPaymentMethod(availableMethod.id);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const checkExistingBooking = async () => {
    try {
      // Check for existing booking using appropriate customer field
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("class_session_id", classSchedule.id)
        .eq("booking_status", "confirmed");

      // Use customer_id for leads, client_id for clients
      if (customer?.type === "lead") {
        query = query.eq("customer_id", customerId);
      } else {
        query = query.eq("client_id", customerId);
      }

      const { data, error } = await query.maybeSingle();

      console.log("Checking existing booking for:", {
        classSessionId: classSchedule.id,
        customerId,
        customerType: customer?.type,
        queryField: customer?.type === "lead" ? "customer_id" : "client_id",
        foundBooking: !!data,
        bookingData: data,
      });

      if (error && error.code !== "PGRST116") {
        console.error("Error checking existing booking:", error);
      }

      if (data) {
        setExistingBooking(data);
      } else {
        setExistingBooking(null);
      }
    } catch (error) {
      console.error("Error checking existing booking:", error);
      setExistingBooking(null);
    }
  };

  const canBookClass = () => {
    // Check if class is full
    if (classSchedule.current_bookings >= classSchedule.max_capacity) {
      return { canBook: false, reason: "Class is full" };
    }

    // Check if existing booking exists
    if (existingBooking) {
      console.log("Existing booking found, preventing new booking:", {
        existingBookingId: existingBooking.id,
        classSessionId: existingBooking.class_session_id,
        customerId: existingBooking.customer_id || existingBooking.client_id,
        status: existingBooking.booking_status,
      });
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

      if (!customer) throw new Error("Customer data not loaded");

      // Build booking data using appropriate customer field
      const bookingData: any = {
        class_session_id: classSchedule.id,
        organization_id: organizationId,
        booking_status: "confirmed",
        payment_status:
          selectedMethod.id === "card" && classSchedule.price_pennies > 0
            ? "pending"
            : selectedMethod.id === "free"
              ? "paid"
              : "paid",
        notes:
          selectedMethod.id === "free"
            ? "Complimentary booking"
            : selectedMethod.type === "membership"
              ? `Membership booking: ${selectedMethod.name}`
              : selectedMethod.type === "package"
                ? `Package booking: ${selectedMethod.name}`
                : specialRequirements || null,
      };

      // Set appropriate customer field based on customer type
      if (customer.type === "lead") {
        bookingData.customer_id = customerId;
      } else {
        bookingData.client_id = customerId;
      }

      const { error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingData);

      if (bookingError) {
        console.error("Booking error:", bookingError);
        throw bookingError;
      }

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

        if (packageError) {
          console.error("Package update error:", packageError);
          // Don't throw - booking was successful even if package update failed
        }
      }

      // If using a membership with class limits, update usage count
      if (
        selectedMethod.type === "membership" &&
        selectedMethod.remaining !== null
      ) {
        const newUsageCount = await supabase
          .from("customer_memberships")
          .select("classes_used_this_period")
          .eq("id", selectedMethod.id)
          .single();

        if (newUsageCount.data) {
          const { error: membershipError } = await supabase
            .from("customer_memberships")
            .update({
              classes_used_this_period:
                (newUsageCount.data.classes_used_this_period || 0) + 1,
            })
            .eq("id", selectedMethod.id);

          if (membershipError) {
            console.error("Membership update error:", membershipError);
            // Don't throw - booking was successful even if membership update failed
          }
        }
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
                            {method.type === "membership" && (
                              <Users className="h-4 w-4 text-green-400" />
                            )}
                            {method.type === "card" && method.id === "free" && (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            )}
                            {method.type === "card" && method.id !== "free" && (
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
