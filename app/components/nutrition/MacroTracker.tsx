"use client";

import { useState } from "react";
import { PieChart, TrendingUp, Target } from "lucide-react";

interface MacroTrackerProps {
  client: any;
  nutritionProfile: any;
}

export default function MacroTracker({
  client,
  nutritionProfile,
}: MacroTrackerProps) {
  const [todayIntake, setTodayIntake] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Macro Tracking</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Progress */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Today's Progress
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Calories</span>
                <span className="text-white">
                  {todayIntake.calories} / {nutritionProfile.target_calories}
                </span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{
                    width: `${(todayIntake.calories / nutritionProfile.target_calories) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Protein</span>
                <span className="text-white">
                  {todayIntake.protein}g / {nutritionProfile.protein_grams}g
                </span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${(todayIntake.protein / nutritionProfile.protein_grams) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Carbs</span>
                <span className="text-white">
                  {todayIntake.carbs}g / {nutritionProfile.carbs_grams}g
                </span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${(todayIntake.carbs / nutritionProfile.carbs_grams) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Fat</span>
                <span className="text-white">
                  {todayIntake.fat}g / {nutritionProfile.fat_grams}g
                </span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${(todayIntake.fat / nutritionProfile.fat_grams) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Quick Add Food
          </h3>
          <p className="text-sm text-gray-500">
            Food logging functionality coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
