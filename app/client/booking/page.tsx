"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { Calendar, Clock, MapPin, Users, X } from "lucide-react";

interface ClassSession {
  id: string;
  class_type_id: string;
  date: string;
  start_time: string;
  end_time: string;
  instructor_id: string;
  max_capacity: number;
  current_bookings: number;
  location: string;
  class_types: {
    name: string;
    description: string;
    duration: number;
  };
  instructors: {
    name: string;
  };
}

export default function ClientBookingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAvailableClasses();
  }, []);

  const fetchAvailableClasses = async () => {
    try {
      // Get upcoming classes
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("class_sessions")
        .select(
          `
          *,
          class_types (name, description, duration),
          instructors (name)
        `,
        )
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (classId: string) => {
    setBookingLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login-otp");
        return;
      }

      // Create booking
      const { error } = await supabase.from("bookings").insert({
        class_session_id: classId,
        customer_id: user.id,
        status: "confirmed",
      });

      if (error) throw error;

      setMessage("Booking confirmed!");
      setSelectedClass(null);
      fetchAvailableClasses(); // Refresh to update counts
    } catch (error: any) {
      console.error("Booking error:", error);
      setMessage(error.message || "Failed to book class");
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Show HH:MM
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Book a Class</h1>
          <p className="mt-2 text-gray-600">
            Choose from our available classes
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.includes("confirmed")
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classSession) => {
            const spotsLeft =
              classSession.max_capacity - classSession.current_bookings;
            const isFull = spotsLeft <= 0;

            return (
              <div
                key={classSession.id}
                className={`bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-xl transition-shadow ${
                  isFull ? "opacity-75" : ""
                }`}
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white">
                    {classSession.class_types.name}
                  </h3>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(classSession.date)}
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {formatTime(classSession.start_time)} -{" "}
                      {formatTime(classSession.end_time)}
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {classSession.location || "Main Studio"}
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      Instructor: {classSession.instructors.name}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${
                          isFull ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {isFull ? "Class Full" : `${spotsLeft} spots left`}
                      </span>

                      <button
                        onClick={() => setSelectedClass(classSession)}
                        disabled={isFull}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${
                          isFull
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                        }`}
                      >
                        {isFull ? "Full" : "Book Now"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {classes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No classes available at this time</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-white">
                Confirm Booking
              </h2>
              <button
                onClick={() => setSelectedClass(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="font-medium">{selectedClass.class_types.name}</p>
              <p className="text-sm text-gray-600">
                {formatDate(selectedClass.date)} at{" "}
                {formatTime(selectedClass.start_time)}
              </p>
              <p className="text-sm text-gray-600">
                Instructor: {selectedClass.instructors.name}
              </p>
              <p className="text-sm text-gray-600">
                Location: {selectedClass.location || "Main Studio"}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleBooking(selectedClass.id)}
                disabled={bookingLoading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {bookingLoading ? "Booking..." : "Confirm Booking"}
              </button>
              <button
                onClick={() => setSelectedClass(null)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
