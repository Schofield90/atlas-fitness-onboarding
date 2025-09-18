"use client";

import React from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import CustomerLeaderboard from "@/app/components/reports/CustomerLeaderboard";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CustomerLeaderboardPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/reports/attendances"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Attendance Reports
            </Link>

            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Customer Leaderboard
                </h1>
                <p className="text-gray-400 mt-1">
                  Track your top performing members by attendance
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard Component */}
          <CustomerLeaderboard />
        </div>
      </div>
    </DashboardLayout>
  );
}
