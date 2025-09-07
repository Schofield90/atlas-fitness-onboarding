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
  CheckCircle2,
  Plus,
  Minus,
  Package,
  Search,
  CheckCircle,
} from "lucide-react";
import {
  formatBritishDateTime,
  formatBritishDate,
} from "@/app/lib/utils/british-format";

interface MultiClassBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  organizationId: string;
  onBookingsCreated?: () => void;
}

interface ClassSchedule {
  id: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings: number;
  price_pennies: number;
  room_location?: string;
  instructor_name?: string;
  class_type: {
    id: string;
    name: string;
    description?: string;
    color?: string;
  };
}

interface SelectedClass {
  schedule: ClassSchedule;
  paymentMethod?: string;
}

interface PaymentSummary {
  totalClasses: number;
  totalPrice: number;
  packageCredits: number;
  cardPayments: number;
}

const formatPrice = (pennies: number) => {
  return `£${(pennies / 100).toFixed(2)}`;
};

export default function MultiClassBookingModal({
  isOpen,
  onClose,
  customerId,
  organizationId,
  onBookingsCreated,
}: MultiClassBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"selection" | "payment" | "confirmation">(
    "selection",
  );
  const [availableClasses, setAvailableClasses] = useState<ClassSchedule[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassSchedule[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableClasses();
      fetchCustomerDetails();
    }
  }, [isOpen]);

  // Fetch payment methods after customer details are loaded
  useEffect(() => {
    if (customer && isOpen) {
      fetchPaymentMethods();
    }
  }, [customer, isOpen]);

  useEffect(() => {
    filterClasses();
  }, [availableClasses, searchQuery, filterDate]);

  const fetchAvailableClasses = async () => {
    try {
      // Use class_sessions table - same as the class-calendar page
      const { data, error } = await supabase
        .from("class_sessions")
        .select(
          `
          *,
          program:programs(
            id,
            name,
            description,
            price_pennies
          )
        `,
        )
        .eq("organization_id", organizationId)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Transform the data to match the expected format
      const transformedClasses = (data || []).map((session) => ({
        ...session,
        class_type: session.program
          ? {
              id: session.program.id,
              name: session.program.name,
              description: session.program.description,
            }
          : {
              id: "",
              name: session.title || "Untitled Class",
              description: session.description,
            },
        max_capacity: session.capacity || 20,
        current_bookings: 0, // This would need to be calculated from bookings
        room_location: session.room || session.location,
        instructor_name: session.instructor,
        price_pennies: session.price || session.program?.price_pennies || 0,
      }));

      setAvailableClasses(transformedClasses);
    } catch (error) {
      console.error("Error fetching available classes:", error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      console.log("Fetching payment methods for customer:", {
        customerId,
        customerType: customer?.type,
        organizationId,
      });

      const methods: any[] = [];

      // Check for active class packages
      const { data: packages, error: packagesError } = await supabase
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

      if (packagesError) {
        console.warn(
          "Error fetching packages (this is okay if packages aren't set up):",
          packagesError,
        );
      }

      packages?.forEach((pkg) => {
        if (pkg.package) {
          methods.push({
            id: pkg.id,
            type: "package",
            name: pkg.package.name,
            description: `${pkg.classes_remaining} classes remaining`,
            remaining: pkg.classes_remaining,
            isAvailable: true,
          });
        }
      });

      // Check for active memberships from customer_memberships table
      let membershipQuery = supabase
        .from("customer_memberships")
        .select(
          `
          *,
          membership_plan:membership_plans(*)
        `,
        )
        .eq("organization_id", organizationId)
        .eq("status", "active");

      // Use appropriate customer field based on customer type
      if (customer?.type === "lead") {
        membershipQuery = membershipQuery.eq("customer_id", customerId);
      } else {
        membershipQuery = membershipQuery.or(
          `customer_id.eq.${customerId},client_id.eq.${customerId}`,
        );
      }

      const { data: memberships, error: membershipsError } =
        await membershipQuery;

      if (membershipsError) {
        console.warn(
          "Error fetching memberships (this is okay if memberships aren't set up):",
          membershipsError,
        );
      }

      memberships?.forEach((membership) => {
        const plan = membership.membership_plan;
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

      // Add card payment option
      methods.push({
        id: "card",
        type: "card",
        name: "Credit/Debit Card",
        description: "Pay per class",
        isAvailable: true,
      });

      setPaymentMethods(methods);
      console.log("Payment methods loaded successfully:", methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      // Set default payment methods on error
      const defaultMethods = [
        {
          id: "card",
          type: "card",
          name: "Credit/Debit Card",
          description: "Pay per class",
          isAvailable: true,
        },
      ];
      setPaymentMethods(defaultMethods);
      console.log("Using default payment methods due to error");
    }
  };

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

  const filterClasses = () => {
    let filtered = availableClasses;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cls) =>
          cls.class_type.name.toLowerCase().includes(query) ||
          cls.instructor_name?.toLowerCase().includes(query) ||
          cls.room_location?.toLowerCase().includes(query),
      );
    }

    if (filterDate) {
      const targetDate = new Date(filterDate).toDateString();
      filtered = filtered.filter(
        (cls) => new Date(cls.start_time).toDateString() === targetDate,
      );
    }

    setFilteredClasses(filtered);
  };

  const isClassSelected = (classId: string) => {
    return selectedClasses.some((sc) => sc.schedule.id === classId);
  };

  const toggleClassSelection = (schedule: ClassSchedule) => {
    if (isClassSelected(schedule.id)) {
      setSelectedClasses((prev) =>
        prev.filter((sc) => sc.schedule.id !== schedule.id),
      );
    } else {
      setSelectedClasses((prev) => [...prev, { schedule }]);
    }
  };

  const updateClassPaymentMethod = (
    scheduleId: string,
    paymentMethodId: string,
  ) => {
    setSelectedClasses((prev) =>
      prev.map((sc) =>
        sc.schedule.id === scheduleId
          ? { ...sc, paymentMethod: paymentMethodId }
          : sc,
      ),
    );
  };

  const calculatePaymentSummary = (): PaymentSummary => {
    let totalClasses = selectedClasses.length;
    let totalPrice = 0;
    let packageCredits = 0;
    let cardPayments = 0;

    selectedClasses.forEach((sc) => {
      const method = paymentMethods.find((pm) => pm.id === sc.paymentMethod);
      if (!method) return;

      if (method.type === "package") {
        packageCredits += 1;
      } else if (method.type === "card") {
        totalPrice += sc.schedule.price_pennies;
        cardPayments += 1;
      }
    });

    return { totalClasses, totalPrice, packageCredits, cardPayments };
  };

  const canProceedToPayment = () => {
    if (selectedClasses.length === 0) return false;

    // Check if all selected classes have payment methods assigned
    return selectedClasses.every((sc) => sc.paymentMethod);
  };

  const handleCreateBookings = async () => {
    try {
      setLoading(true);

      const bookingPromises = selectedClasses.map(async (sc) => {
        const method = paymentMethods.find((pm) => pm.id === sc.paymentMethod);
        if (!method) throw new Error("Invalid payment method");

        let paymentMethod = "card";
        let paymentStatus = "pending";
        let paymentAmount = sc.schedule.price_pennies;

        if (method.type === "membership") {
          paymentMethod = "membership";
          paymentStatus = "succeeded";
          paymentAmount = 0;
        } else if (method.type === "package") {
          paymentMethod = "package";
          paymentStatus = "succeeded";
          paymentAmount = 0;
        } else if (method.id === "free") {
          paymentMethod = "free";
          paymentStatus = "succeeded";
          paymentAmount = 0;
        }

        if (!customer) throw new Error("Customer data not loaded");

        // Build booking data using appropriate customer field
        const bookingData: any = {
          class_session_id: sc.schedule.id,
          organization_id: organizationId,
          booking_status: "confirmed",
          payment_status: paymentStatus,
          notes:
            method.type === "package"
              ? `Package booking: ${method.name}`
              : method.type === "membership"
                ? `Membership booking: ${method.name}`
                : method.id === "free"
                  ? "Complimentary booking"
                  : null,
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

        if (bookingError) throw bookingError;

        // Update package usage if needed
        if (method.type === "package" && !method.unlimited) {
          const { error: packageError } = await supabase
            .from("customer_class_packages")
            .update({
              classes_remaining: method.remaining - 1,
              classes_used: supabase.rpc("increment_classes_used", {
                pkg_id: method.id,
              }),
            })
            .eq("id", method.id);

          if (packageError) throw packageError;
        }

        // Update membership usage if needed
        if (method.type === "membership" && method.remaining !== null) {
          // First get current usage count to ensure accuracy
          const { data: currentMembership, error: fetchError } = await supabase
            .from("customer_memberships")
            .select("classes_used_this_period")
            .eq("id", method.id)
            .single();

          if (fetchError) {
            console.warn(
              "Could not fetch current membership usage:",
              fetchError,
            );
            // Continue without updating usage rather than failing the booking
          } else {
            const currentUsage =
              currentMembership?.classes_used_this_period || 0;
            const { error: membershipError } = await supabase
              .from("customer_memberships")
              .update({
                classes_used_this_period: currentUsage + 1,
              })
              .eq("id", method.id);

            if (membershipError) throw membershipError;
          }
        }
      });

      await Promise.all(bookingPromises);

      setStep("confirmation");
      onBookingsCreated?.();

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setStep("selection");
        setSelectedClasses([]);
      }, 3000);
    } catch (error) {
      console.error("Error creating bookings:", error);
      alert("Failed to create bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep("selection");
    setSelectedClasses([]);
    setSearchQuery("");
    setFilterDate("");
  };

  const summary = calculatePaymentSummary();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {step === "selection" && "Book Multiple Classes"}
            {step === "payment" && "Payment Assignment"}
            {step === "confirmation" && "Bookings Confirmed"}
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
          {step === "selection" && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search classes, instructors, or locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Selected Classes Summary with Action Button */}
              {selectedClasses.length > 0 && (
                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-blue-100 font-medium">
                      Selected Classes ({selectedClasses.length})
                    </h4>
                    <button
                      onClick={() => {
                        if (selectedClasses.length === 0) {
                          alert("Please select at least one class");
                          return;
                        }
                        console.log(
                          "Transitioning to payment step with classes:",
                          selectedClasses,
                        );
                        setStep("payment");
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      Continue to Payment
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedClasses.map((sc) => (
                      <div
                        key={sc.schedule.id}
                        className="flex items-center justify-between text-sm text-blue-200"
                      >
                        <span>
                          {sc.schedule.class_type.name} -{" "}
                          {formatBritishDate(sc.schedule.start_time)}
                        </span>
                        <button
                          onClick={() => toggleClassSelection(sc.schedule)}
                          className="text-red-300 hover:text-red-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Classes */}
              <div>
                <h4 className="text-lg font-medium text-white mb-4">
                  Available Classes ({filteredClasses.length})
                </h4>

                {filteredClasses.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No classes found matching your criteria
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClasses.map((schedule) => {
                      const selected = isClassSelected(schedule.id);

                      return (
                        <div
                          key={schedule.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selected
                              ? "border-blue-500 bg-blue-900/20"
                              : "border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600"
                          }`}
                          onClick={() => toggleClassSelection(schedule)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h5 className="font-medium text-white">
                              {schedule.class_type.name}
                            </h5>
                            <div
                              className={`rounded-full p-1 ${
                                selected ? "bg-blue-500" : "bg-gray-600"
                              }`}
                            >
                              {selected ? (
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              ) : (
                                <Plus className="h-4 w-4 text-gray-300" />
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatBritishDate(schedule.start_time)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {
                                formatBritishDateTime(
                                  schedule.start_time,
                                ).split(" ")[1]
                              }{" "}
                              -{" "}
                              {
                                formatBritishDateTime(schedule.end_time).split(
                                  " ",
                                )[1]
                              }
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {schedule.current_bookings}/
                              {schedule.max_capacity}
                            </div>
                            {schedule.room_location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {schedule.room_location}
                              </div>
                            )}
                            {schedule.price_pennies > 0 && (
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                {formatPrice(schedule.price_pennies)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-6">
              {/* Action buttons at top */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">
                  Assign Payment Methods
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("selection")}
                    className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Back to Selection
                  </button>
                  <button
                    onClick={handleCreateBookings}
                    disabled={!canProceedToPayment() || loading}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Booking...
                      </>
                    ) : (
                      `Confirm Bookings (${selectedClasses.length})`
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {selectedClasses.map((sc) => (
                  <div
                    key={sc.schedule.id}
                    className="bg-gray-800 rounded-lg p-4"
                  >
                    <h4 className="text-white font-medium mb-2">
                      {sc.schedule.class_type.name}
                    </h4>
                    <p className="text-gray-400 text-sm mb-3">
                      {formatBritishDateTime(sc.schedule.start_time)} -{" "}
                      {sc.schedule.room_location}
                    </p>

                    <div className="space-y-2">
                      {paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            sc.paymentMethod === method.id
                              ? "border-blue-500 bg-blue-900/20"
                              : "border-gray-700 hover:border-gray-600"
                          }`}
                          onClick={() =>
                            updateClassPaymentMethod(sc.schedule.id, method.id)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                sc.paymentMethod === method.id
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-400"
                              }`}
                            >
                              {sc.paymentMethod === method.id && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {method.type === "package" && (
                                <Package className="h-4 w-4 text-orange-400" />
                              )}
                              {method.type === "membership" && (
                                <Users className="h-4 w-4 text-purple-400" />
                              )}
                              {method.id === "free" && (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              )}
                              {method.type === "card" &&
                                method.id !== "free" && (
                                  <CreditCard className="h-4 w-4 text-blue-400" />
                                )}
                              <span className="text-white text-sm">
                                {method.name}
                              </span>
                              <span className="text-gray-400 text-sm">
                                - {method.description}
                              </span>
                              {method.type === "card" &&
                                method.id !== "free" &&
                                sc.schedule.price_pennies > 0 && (
                                  <span className="text-gray-300 text-sm">
                                    ({formatPrice(sc.schedule.price_pennies)})
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              {(() => {
                const summary = calculatePaymentSummary();
                return (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">
                      Payment Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Total Classes:</span>
                        <span>{summary.totalClasses}</span>
                      </div>
                      {summary.packageCredits > 0 && (
                        <div className="flex justify-between text-gray-300">
                          <span>Package Credits:</span>
                          <span>{summary.packageCredits}</span>
                        </div>
                      )}
                      {summary.cardPayments > 0 && (
                        <div className="flex justify-between text-gray-300">
                          <span>Card Payments:</span>
                          <span>
                            {summary.cardPayments} (
                            {formatPrice(summary.totalPrice)})
                          </span>
                        </div>
                      )}
                      {summary.totalPrice > 0 && (
                        <div className="flex justify-between text-white font-medium text-base border-t border-gray-700 pt-2 mt-2">
                          <span>Total to Pay:</span>
                          <span>{formatPrice(summary.totalPrice)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {step === "confirmation" && (
            <div className="text-center space-y-6">
              <div className="bg-green-900 border border-green-700 rounded-lg p-6">
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Bookings Confirmed!
                </h3>
                <p className="text-green-300">
                  Successfully booked {selectedClasses.length} classes
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Confirmation emails have been sent to your email address.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 text-left">
                <h4 className="text-white font-medium mb-3">
                  Booking Summary:
                </h4>
                <div className="space-y-2">
                  {selectedClasses.map((sc) => (
                    <div
                      key={sc.schedule.id}
                      className="flex justify-between text-sm text-gray-300"
                    >
                      <span>{sc.schedule.class_type.name}</span>
                      <span>{formatBritishDate(sc.schedule.start_time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Simplified with just status info */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="text-sm text-gray-400">
            {step === "selection" && selectedClasses.length > 0 && (
              <p>
                {selectedClasses.length} class
                {selectedClasses.length === 1 ? "" : "es"} selected
              </p>
            )}
            {step === "payment" && (
              <p className="text-yellow-400">
                {calculatePaymentSummary().cardPayments > 0 &&
                  `Total: £${(calculatePaymentSummary().totalPrice / 100).toFixed(2)}`}
              </p>
            )}
            {step === "confirmation" && (
              <p className="text-green-400">Bookings confirmed successfully!</p>
            )}
          </div>

          {step === "confirmation" ? (
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
