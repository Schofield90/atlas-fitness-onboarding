"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import {
  UserGroupIcon,
  MapPinIcon,
  HeartIcon,
  ChartBarIcon,
  XMarkIcon,
  PlusIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

interface Targeting {
  age_min: number;
  age_max: number;
  genders: number[];
  geo_locations: any;
  interests: any[];
  behaviors: any[];
  custom_audiences: string[];
  excluded_custom_audiences: string[];
}

interface AudienceBuilderProps {
  targeting: Targeting;
  onChange: (targeting: Targeting) => void;
}

interface Interest {
  id: string;
  name: string;
  audience_size?: number;
}

interface Behavior {
  id: string;
  name: string;
  type: string;
  audience_size?: number;
}

interface CustomAudience {
  id: string;
  name: string;
  audience_type: string;
  approximate_count: number;
}

interface Location {
  key: string;
  name: string;
  type: "country" | "region" | "city" | "zip";
  country_code?: string;
}

const FITNESS_INTERESTS = [
  { id: "6003107902433", name: "Fitness and wellness" },
  { id: "6003139266461", name: "Weight training" },
  { id: "6003397425735", name: "Yoga" },
  { id: "6003020834693", name: "Running" },
  { id: "6003147894007", name: "CrossFit" },
  { id: "6003223916124", name: "Personal trainer" },
  { id: "6003292297029", name: "Gym" },
  { id: "6003318989209", name: "Bodybuilding" },
  { id: "6003397433735", name: "Pilates" },
  { id: "6003532015895", name: "Martial arts" },
];

const FITNESS_BEHAVIORS = [
  { id: "6002714398172", name: "Frequent gym visitors", type: "fitness" },
  {
    id: "6004037016972",
    name: "Health and fitness app users",
    type: "digital",
  },
  { id: "6017253511583", name: "Premium gym members", type: "purchase" },
  { id: "6003808923172", name: "Marathon runners", type: "activity" },
  { id: "6015559470383", name: "Fitness equipment shoppers", type: "purchase" },
];

export function AudienceBuilder({ targeting, onChange }: AudienceBuilderProps) {
  const [availableInterests, setAvailableInterests] =
    useState<Interest[]>(FITNESS_INTERESTS);
  const [availableBehaviors, setAvailableBehaviors] =
    useState<Behavior[]>(FITNESS_BEHAVIORS);
  const [customAudiences, setCustomAudiences] = useState<CustomAudience[]>([]);
  const [searchingInterests, setSearchingInterests] = useState("");
  const [searchingBehaviors, setSearchingBehaviors] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<Location[]>([]);
  const [estimatedReach, setEstimatedReach] = useState<{
    min: number;
    max: number;
  } | null>(null);

  useEffect(() => {
    fetchCustomAudiences();
  }, []);

  useEffect(() => {
    // Debounce audience reach estimation
    const timer = setTimeout(() => {
      estimateAudienceReach();
    }, 1000);

    return () => clearTimeout(timer);
  }, [targeting]);

  const fetchCustomAudiences = async () => {
    try {
      const response = await fetch("/api/ads/audiences");
      if (response.ok) {
        const data = await response.json();
        setCustomAudiences(data.audiences || []);
      }
    } catch (error) {
      console.error("Failed to fetch custom audiences:", error);
    }
  };

  const estimateAudienceReach = async () => {
    try {
      const response = await fetch("/api/ads/estimate-reach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targeting }),
      });

      if (response.ok) {
        const data = await response.json();
        setEstimatedReach(data.reach);
      }
    } catch (error) {
      console.error("Failed to estimate reach:", error);
    }
  };

  const searchInterests = async (query: string) => {
    if (!query.trim()) {
      setAvailableInterests(FITNESS_INTERESTS);
      return;
    }

    try {
      const response = await fetch(
        `/api/ads/search-interests?q=${encodeURIComponent(query)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableInterests(data.interests || []);
      }
    } catch (error) {
      console.error("Failed to search interests:", error);
    }
  };

  const searchBehaviors = async (query: string) => {
    if (!query.trim()) {
      setAvailableBehaviors(FITNESS_BEHAVIORS);
      return;
    }

    try {
      const response = await fetch(
        `/api/ads/search-behaviors?q=${encodeURIComponent(query)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableBehaviors(data.behaviors || []);
      }
    } catch (error) {
      console.error("Failed to search behaviors:", error);
    }
  };

  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setLocationResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/ads/search-locations?q=${encodeURIComponent(query)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setLocationResults(data.locations || []);
      }
    } catch (error) {
      console.error("Failed to search locations:", error);
    }
  };

  const addInterest = (interest: Interest) => {
    if (!targeting.interests.find((i) => i.id === interest.id)) {
      onChange({
        ...targeting,
        interests: [...targeting.interests, interest],
      });
    }
  };

  const removeInterest = (interestId: string) => {
    onChange({
      ...targeting,
      interests: targeting.interests.filter((i) => i.id !== interestId),
    });
  };

  const addBehavior = (behavior: Behavior) => {
    if (!targeting.behaviors.find((b) => b.id === behavior.id)) {
      onChange({
        ...targeting,
        behaviors: [...targeting.behaviors, behavior],
      });
    }
  };

  const removeBehavior = (behaviorId: string) => {
    onChange({
      ...targeting,
      behaviors: targeting.behaviors.filter((b) => b.id !== behaviorId),
    });
  };

  const addLocation = (location: Location) => {
    const geoLocations = targeting.geo_locations || {};
    const locations = geoLocations.locations || [];

    if (!locations.find((l: any) => l.key === location.key)) {
      onChange({
        ...targeting,
        geo_locations: {
          ...geoLocations,
          locations: [...locations, location],
        },
      });
    }

    setLocationSearch("");
    setLocationResults([]);
  };

  const removeLocation = (locationKey: string) => {
    const geoLocations = targeting.geo_locations || {};
    const locations = geoLocations.locations || [];

    onChange({
      ...targeting,
      geo_locations: {
        ...geoLocations,
        locations: locations.filter((l: any) => l.key !== locationKey),
      },
    });
  };

  const toggleCustomAudience = (audienceId: string) => {
    const isIncluded = targeting.custom_audiences.includes(audienceId);

    if (isIncluded) {
      onChange({
        ...targeting,
        custom_audiences: targeting.custom_audiences.filter(
          (id) => id !== audienceId,
        ),
      });
    } else {
      onChange({
        ...targeting,
        custom_audiences: [...targeting.custom_audiences, audienceId],
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-8">
      {/* Audience Reach Estimate */}
      {estimatedReach && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <UserGroupIcon className="h-5 w-5 text-blue-400" />
            <span className="font-medium text-white">
              Estimated Daily Reach
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {formatNumber(estimatedReach.min)} -{" "}
            {formatNumber(estimatedReach.max)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            People your ads may reach each day
          </div>
        </div>
      )}

      {/* Demographics */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center">
          <UserGroupIcon className="h-5 w-5 mr-2" />
          Demographics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Age Range</label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="13"
                max="65"
                value={targeting.age_min}
                onChange={(e) =>
                  onChange({
                    ...targeting,
                    age_min: parseInt(e.target.value),
                  })
                }
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="number"
                min="13"
                max="65"
                value={targeting.age_max}
                onChange={(e) =>
                  onChange({
                    ...targeting,
                    age_max: parseInt(e.target.value),
                  })
                }
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={targeting.genders.includes(1)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange({
                        ...targeting,
                        genders: [
                          ...targeting.genders.filter((g) => g !== 1),
                          1,
                        ],
                      });
                    } else {
                      onChange({
                        ...targeting,
                        genders: targeting.genders.filter((g) => g !== 1),
                      });
                    }
                  }}
                  className="mr-2"
                />
                <span>Male</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={targeting.genders.includes(2)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange({
                        ...targeting,
                        genders: [
                          ...targeting.genders.filter((g) => g !== 2),
                          2,
                        ],
                      });
                    } else {
                      onChange({
                        ...targeting,
                        genders: targeting.genders.filter((g) => g !== 2),
                      });
                    }
                  }}
                  className="mr-2"
                />
                <span>Female</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center">
          <MapPinIcon className="h-5 w-5 mr-2" />
          Locations
        </h3>

        <div>
          <div className="relative">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => {
                setLocationSearch(e.target.value);
                searchLocations(e.target.value);
              }}
              placeholder="Search for cities, regions, or countries..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {locationResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                {locationResults.map((location) => (
                  <button
                    key={location.key}
                    onClick={() => addLocation(location)}
                    className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-700 focus:outline-none focus:bg-gray-700"
                  >
                    <div className="flex items-center space-x-2">
                      <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{location.name}</span>
                      <Badge className="bg-gray-600 text-xs">
                        {location.type}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {targeting.geo_locations?.locations?.map((location: any) => (
              <Badge
                key={location.key}
                className="bg-blue-600 flex items-center space-x-2"
              >
                <span>{location.name}</span>
                <button
                  onClick={() => removeLocation(location.key)}
                  className="text-blue-200 hover:text-white"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center">
          <HeartIcon className="h-5 w-5 mr-2" />
          Interests
        </h3>

        <div>
          <input
            type="text"
            value={searchingInterests}
            onChange={(e) => {
              setSearchingInterests(e.target.value);
              searchInterests(e.target.value);
            }}
            placeholder="Search for interests..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
            {availableInterests.map((interest) => (
              <button
                key={interest.id}
                onClick={() => addInterest(interest)}
                disabled={
                  targeting.interests.find((i) => i.id === interest.id) !==
                  undefined
                }
                className="p-3 text-left bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="text-sm text-white">{interest.name}</div>
                {interest.audience_size && (
                  <div className="text-xs text-gray-400">
                    {formatNumber(interest.audience_size)} people
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {targeting.interests.map((interest) => (
              <Badge
                key={interest.id}
                className="bg-green-600 flex items-center space-x-2"
              >
                <span>{interest.name}</span>
                <button
                  onClick={() => removeInterest(interest.id)}
                  className="text-green-200 hover:text-white"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Behaviors */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          Behaviors
        </h3>

        <div>
          <input
            type="text"
            value={searchingBehaviors}
            onChange={(e) => {
              setSearchingBehaviors(e.target.value);
              searchBehaviors(e.target.value);
            }}
            placeholder="Search for behaviors..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {availableBehaviors.map((behavior) => (
              <button
                key={behavior.id}
                onClick={() => addBehavior(behavior)}
                disabled={
                  targeting.behaviors.find((b) => b.id === behavior.id) !==
                  undefined
                }
                className="p-3 text-left bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">{behavior.name}</div>
                    <Badge className="bg-gray-600 text-xs mt-1">
                      {behavior.type}
                    </Badge>
                  </div>
                  {behavior.audience_size && (
                    <div className="text-xs text-gray-400">
                      {formatNumber(behavior.audience_size)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {targeting.behaviors.map((behavior) => (
              <Badge
                key={behavior.id}
                className="bg-purple-600 flex items-center space-x-2"
              >
                <span>{behavior.name}</span>
                <button
                  onClick={() => removeBehavior(behavior.id)}
                  className="text-purple-200 hover:text-white"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Audiences */}
      {customAudiences.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2" />
            Custom Audiences
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customAudiences.map((audience) => (
              <div
                key={audience.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  targeting.custom_audiences.includes(audience.id)
                    ? "border-blue-500 bg-blue-600/10"
                    : "border-gray-600 bg-gray-700 hover:border-gray-500"
                }`}
                onClick={() => toggleCustomAudience(audience.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {audience.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {audience.audience_type}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatNumber(audience.approximate_count)} people
                    </div>
                  </div>
                  {targeting.custom_audiences.includes(audience.id) && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audience Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3">Audience Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Demographics</div>
            <div className="text-white">
              Age {targeting.age_min}-{targeting.age_max},{" "}
              {targeting.genders.length === 2
                ? "All genders"
                : targeting.genders.includes(1)
                  ? "Male"
                  : targeting.genders.includes(2)
                    ? "Female"
                    : "All genders"}
            </div>
          </div>

          <div>
            <div className="text-gray-400">Targeting</div>
            <div className="text-white">
              {targeting.interests.length} interests,{" "}
              {targeting.behaviors.length} behaviors
            </div>
          </div>

          <div>
            <div className="text-gray-400">Audiences</div>
            <div className="text-white">
              {targeting.custom_audiences.length} custom audiences
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
