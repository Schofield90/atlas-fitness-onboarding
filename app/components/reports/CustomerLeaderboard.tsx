"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Medal,
  Award,
  Calendar,
  Users,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LeaderboardCustomer {
  rank: number;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  attendance_count: number;
}

interface LeaderboardStats {
  total_attendances: number;
  unique_customers: number;
  avg_attendance_per_customer: number;
  timeframe: string;
  date_range: {
    start: string;
    end: string;
  };
}

interface CustomerLeaderboardProps {
  className?: string;
}

const TIMEFRAME_OPTIONS = [
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

export default function CustomerLeaderboard({
  className = "",
}: CustomerLeaderboardProps) {
  const [timeframe, setTimeframe] = useState("month");
  const [limit, setLimit] = useState(10);

  // Fetch leaderboard data
  const { data, error, isLoading } = useSWR(
    `/api/reports/attendances/leaderboard?timeframe=${timeframe}&limit=${limit}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    },
  );

  const leaderboard = data?.data?.leaderboard || [];
  const stats = data?.data?.stats;

  // Get medal icon based on rank
  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />;
      default:
        return (
          <span className="text-sm text-gray-500 font-medium w-5 text-center">
            #{rank}
          </span>
        );
    }
  };

  // Get rank color based on position
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/30";
      default:
        return "bg-gray-800/50 border-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div
        className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}
      >
        <p className="text-red-500">Failed to load leaderboard</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Customer Leaderboard
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Top performers by attendance
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="relative">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="appearance-none bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-white text-sm cursor-pointer hover:bg-gray-600 transition-colors"
            >
              {TIMEFRAME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-400">Active Members</p>
                  <p className="text-lg font-bold text-white">
                    {stats.unique_customers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-gray-400">Total Classes</p>
                  <p className="text-lg font-bold text-white">
                    {stats.total_attendances}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-400">Avg/Member</p>
                  <p className="text-lg font-bold text-white">
                    {stats.avg_attendance_per_customer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="p-6">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No attendance data for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((customer: LeaderboardCustomer) => (
              <div
                key={customer.customer_id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:scale-[1.02] ${getRankColor(
                  customer.rank,
                )}`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8">
                    {getMedalIcon(customer.rank)}
                  </div>

                  {/* Customer Info */}
                  <div>
                    <p className="font-medium text-white">
                      {customer.customer_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {customer.customer_email}
                    </p>
                  </div>
                </div>

                {/* Attendance Count */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    {customer.attendance_count}
                  </p>
                  <p className="text-xs text-gray-400">classes</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {leaderboard.length === limit && (
          <button
            onClick={() => setLimit(limit + 10)}
            className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Load More
          </button>
        )}
      </div>
    </div>
  );
}
