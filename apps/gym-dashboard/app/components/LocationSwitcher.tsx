"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { MapPin, ChevronDown, Check } from "lucide-react";

interface Location {
  id: string;
  name: string;
  is_primary: boolean;
}

export default function LocationSwitcher() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadLocations();

    // Load saved location from localStorage
    const savedLocationId = localStorage.getItem("selectedLocationId");
    if (savedLocationId) {
      // Will be set when locations load
    }
  }, []);

  const loadLocations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!userData?.organization_id) return;

      // For now, give all users access to all locations
      const staffData = {
        organization_id: userData.organization_id,
        location_access: { all_locations: true },
      };

      if (!staffData) return;

      let accessibleLocations: Location[] = [];

      if (staffData.location_access?.all_locations) {
        // User has access to all locations
        const { data: allLocations } = await supabase
          .from("locations")
          .select("id, name, is_primary")
          .eq("organization_id", staffData.organization_id)
          .eq("is_active", true)
          .order("name");

        accessibleLocations = allLocations || [];
      } else if (staffData.location_access?.specific_locations?.length > 0) {
        // User has access to specific locations
        const { data: specificLocations } = await supabase
          .from("locations")
          .select("id, name, is_primary")
          .in("id", staffData.location_access.specific_locations)
          .eq("is_active", true)
          .order("name");

        accessibleLocations = specificLocations || [];
      }

      setLocations(accessibleLocations);

      // Set current location
      const savedLocationId = localStorage.getItem("selectedLocationId");
      if (
        savedLocationId &&
        accessibleLocations.find((l) => l.id === savedLocationId)
      ) {
        setCurrentLocation(
          accessibleLocations.find((l) => l.id === savedLocationId)!,
        );
      } else if (accessibleLocations.length > 0) {
        // Default to primary location or first available
        const primaryLocation =
          accessibleLocations.find((l) => l.is_primary) ||
          accessibleLocations[0];
        setCurrentLocation(primaryLocation);
        localStorage.setItem("selectedLocationId", primaryLocation.id);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (location: Location) => {
    setCurrentLocation(location);
    localStorage.setItem("selectedLocationId", location.id);
    setShowDropdown(false);

    // Emit event for other components to listen to
    window.dispatchEvent(
      new CustomEvent("locationChanged", { detail: location }),
    );

    // Reload the page to reflect the new location
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg animate-pulse">
        <MapPin className="h-4 w-4 text-gray-400" />
        <div className="h-4 w-24 bg-gray-600 rounded"></div>
      </div>
    );
  }

  if (locations.length === 0) {
    return null;
  }

  if (locations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg">
        <MapPin className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-white">{locations[0].name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
      >
        <MapPin className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-white">
          {currentLocation?.name || "Select Location"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
        />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full mt-2 right-0 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
            <div className="p-2">
              <p className="text-xs text-gray-400 px-3 py-1">Switch Location</p>
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationChange(location)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-white">{location.name}</span>
                    {location.is_primary && (
                      <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  {currentLocation?.id === location.id && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
