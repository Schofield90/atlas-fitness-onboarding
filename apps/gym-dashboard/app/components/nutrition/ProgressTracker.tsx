"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Moon,
  Smile,
  Target,
  Award,
  Calendar,
  ChevronRight,
  Info,
  Plus,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { format, subDays, startOfWeek, parseISO } from "date-fns";

interface DailyCheckIn {
  id: string;
  date: Date;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  energy: number; // 1-10
  mood: number; // 1-10
  hunger: number; // 1-10
  sleep: number; // hours
  sleepQuality: number; // 1-10
  stress: number; // 1-10
  hydration: number; // liters
  steps?: number;
  workoutIntensity?: number; // 1-10
  adherence: number; // percentage
  notes?: string;
  achievements?: string[];
}

interface WeeklyMetrics {
  weekStart: Date;
  avgWeight: number;
  avgEnergy: number;
  avgMood: number;
  avgSleep: number;
  avgAdherence: number;
  workoutsCompleted: number;
  perfectDays: number;
}

interface Goal {
  id: string;
  type: "weight" | "performance" | "habit" | "measurement";
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  progress: number;
}

export default function ProgressTracker({
  clientId,
  onInsightGenerated,
}: {
  clientId: string;
  onInsightGenerated?: (insights: any) => void;
}) {
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "trends" | "checkin" | "goals"
  >("overview");
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<Partial<DailyCheckIn>>({
    date: new Date(),
    energy: 5,
    mood: 5,
    hunger: 5,
    sleep: 7,
    sleepQuality: 5,
    stress: 5,
    hydration: 2,
    adherence: 80,
  });
  const [insights, setInsights] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    loadProgressData();
    generateInsights();
  }, []);

  const loadProgressData = async () => {
    // Load from database - mock data for now
    const mockCheckIns: DailyCheckIn[] = [];
    for (let i = 0; i < 30; i++) {
      mockCheckIns.push({
        id: i.toString(),
        date: subDays(new Date(), i),
        weight: 75 - i * 0.05 + Math.random() * 0.5,
        energy: Math.floor(5 + Math.random() * 5),
        mood: Math.floor(5 + Math.random() * 5),
        hunger: Math.floor(3 + Math.random() * 5),
        sleep: 6 + Math.random() * 3,
        sleepQuality: Math.floor(5 + Math.random() * 5),
        stress: Math.floor(3 + Math.random() * 5),
        hydration: 1.5 + Math.random() * 2,
        steps: Math.floor(5000 + Math.random() * 10000),
        workoutIntensity:
          i % 3 === 0 ? Math.floor(6 + Math.random() * 4) : undefined,
        adherence: Math.floor(70 + Math.random() * 30),
      });
    }
    setCheckIns(mockCheckIns.reverse());

    // Calculate weekly metrics
    calculateWeeklyMetrics(mockCheckIns);

    // Mock goals
    setGoals([
      {
        id: "1",
        type: "weight",
        target: 70,
        current: 75,
        unit: "kg",
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        progress: 40,
      },
      {
        id: "2",
        type: "performance",
        target: 100,
        current: 80,
        unit: "kg squat",
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        progress: 80,
      },
      {
        id: "3",
        type: "habit",
        target: 30,
        current: 12,
        unit: "days streak",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        progress: 40,
      },
    ]);
  };

  const calculateWeeklyMetrics = (data: DailyCheckIn[]) => {
    const weeks: WeeklyMetrics[] = [];
    const groupedByWeek = data.reduce(
      (acc, checkIn) => {
        const weekStart = startOfWeek(checkIn.date, { weekStartsOn: 1 });
        const weekKey = weekStart.toISOString();
        if (!acc[weekKey]) {
          acc[weekKey] = [];
        }
        acc[weekKey].push(checkIn);
        return acc;
      },
      {} as Record<string, DailyCheckIn[]>,
    );

    Object.entries(groupedByWeek).forEach(([weekKey, weekData]) => {
      weeks.push({
        weekStart: new Date(weekKey),
        avgWeight:
          weekData.reduce((sum, d) => sum + (d.weight || 0), 0) /
          weekData.filter((d) => d.weight).length,
        avgEnergy:
          weekData.reduce((sum, d) => sum + d.energy, 0) / weekData.length,
        avgMood: weekData.reduce((sum, d) => sum + d.mood, 0) / weekData.length,
        avgSleep:
          weekData.reduce((sum, d) => sum + d.sleep, 0) / weekData.length,
        avgAdherence:
          weekData.reduce((sum, d) => sum + d.adherence, 0) / weekData.length,
        workoutsCompleted: weekData.filter((d) => d.workoutIntensity).length,
        perfectDays: weekData.filter((d) => d.adherence >= 90).length,
      });
    });

    setWeeklyMetrics(weeks);
  };

  const generateInsights = () => {
    const newInsights: string[] = [];
    const newRecommendations: string[] = [];

    // Analyze recent trends
    if (checkIns.length > 7) {
      const lastWeek = checkIns.slice(-7);
      const avgEnergy =
        lastWeek.reduce((sum, d) => sum + d.energy, 0) / lastWeek.length;
      const avgSleep =
        lastWeek.reduce((sum, d) => sum + d.sleep, 0) / lastWeek.length;

      if (avgEnergy < 5) {
        newInsights.push(
          "Your energy levels have been below average this week",
        );
        newRecommendations.push(
          "Consider adjusting meal timing or increasing complex carb intake",
        );
      }

      if (avgSleep < 7) {
        newInsights.push("Sleep duration is impacting your recovery");
        newRecommendations.push(
          "Try a consistent sleep schedule and limit caffeine after 2 PM",
        );
      }

      // Weight trend
      const weightTrend = checkIns
        .filter((d) => d.weight)
        .slice(-14)
        .map((d) => d.weight);
      if (weightTrend.length > 1) {
        const trend = weightTrend[weightTrend.length - 1]! - weightTrend[0]!;
        if (Math.abs(trend) > 0.5) {
          newInsights.push(
            `Weight ${trend < 0 ? "decreasing" : "increasing"} by ${Math.abs(
              trend,
            ).toFixed(1)}kg over 2 weeks`,
          );
        }
      }

      // Correlation analysis
      const highEnergyDays = lastWeek.filter((d) => d.energy >= 7);
      if (highEnergyDays.length > 0) {
        const avgSleepHighEnergy =
          highEnergyDays.reduce((sum, d) => sum + d.sleep, 0) /
          highEnergyDays.length;
        if (avgSleepHighEnergy > 7.5) {
          newInsights.push("Better sleep correlates with higher energy days");
        }
      }
    }

    setInsights(newInsights);
    setRecommendations(newRecommendations);

    if (onInsightGenerated) {
      onInsightGenerated({
        insights: newInsights,
        recommendations: newRecommendations,
      });
    }
  };

  const saveCheckIn = async () => {
    const newCheckIn: DailyCheckIn = {
      id: Date.now().toString(),
      date: new Date(),
      ...todayCheckIn,
    } as DailyCheckIn;

    setCheckIns([...checkIns, newCheckIn]);
    setShowCheckInModal(false);

    // Recalculate metrics and insights
    calculateWeeklyMetrics([...checkIns, newCheckIn]);
    generateInsights();
  };

  const getMetricColor = (value: number, max: number = 10): string => {
    const percentage = (value / max) * 100;
    if (percentage >= 70) return "text-green-500";
    if (percentage >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getMetricTrend = (
    metric: keyof DailyCheckIn,
    days: number = 7,
  ): "up" | "down" | "stable" => {
    if (checkIns.length < days + 1) return "stable";

    const recent = checkIns.slice(-days);
    const previous = checkIns.slice(-(days * 2), -days);

    const recentAvg =
      recent.reduce((sum, d) => sum + (Number(d[metric]) || 0), 0) /
      recent.length;
    const previousAvg =
      previous.reduce((sum, d) => sum + (Number(d[metric]) || 0), 0) /
      previous.length;

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (Math.abs(change) < 5) return "stable";
    return change > 0 ? "up" : "down";
  };

  const radarData = [
    {
      metric: "Energy",
      value: checkIns[checkIns.length - 1]?.energy || 0,
      fullMark: 10,
    },
    {
      metric: "Mood",
      value: checkIns[checkIns.length - 1]?.mood || 0,
      fullMark: 10,
    },
    {
      metric: "Sleep",
      value: checkIns[checkIns.length - 1]?.sleepQuality || 0,
      fullMark: 10,
    },
    {
      metric: "Stress",
      value: 10 - (checkIns[checkIns.length - 1]?.stress || 5),
      fullMark: 10,
    },
    {
      metric: "Adherence",
      value: (checkIns[checkIns.length - 1]?.adherence || 0) / 10,
      fullMark: 10,
    },
    {
      metric: "Hydration",
      value: (checkIns[checkIns.length - 1]?.hydration || 0) * 2.5,
      fullMark: 10,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "trends", label: "Trends", icon: TrendingUp },
          { id: "checkin", label: "Check-in", icon: Calendar },
          { id: "goals", label: "Goals", icon: Target },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? "bg-orange-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Current Weight",
                value:
                  checkIns[checkIns.length - 1]?.weight?.toFixed(1) || "--",
                unit: "kg",
                trend: getMetricTrend("weight"),
                icon: Activity,
              },
              {
                label: "Avg Energy",
                value: (
                  checkIns.slice(-7).reduce((sum, d) => sum + d.energy, 0) / 7
                ).toFixed(1),
                unit: "/10",
                trend: getMetricTrend("energy"),
                icon: Zap,
              },
              {
                label: "Avg Sleep",
                value: (
                  checkIns.slice(-7).reduce((sum, d) => sum + d.sleep, 0) / 7
                ).toFixed(1),
                unit: "hrs",
                trend: getMetricTrend("sleep"),
                icon: Moon,
              },
              {
                label: "Adherence",
                value: (
                  checkIns.slice(-7).reduce((sum, d) => sum + d.adherence, 0) /
                  7
                ).toFixed(0),
                unit: "%",
                trend: getMetricTrend("adherence"),
                icon: Award,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="h-5 w-5 text-gray-400" />
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : stat.trend === "down" ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </div>
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                  <span className="text-sm text-gray-400 ml-1">
                    {stat.unit}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Wellness Radar */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Today's Wellness Score
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#9CA3AF" }} />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tick={{ fill: "#9CA3AF" }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#F97316"
                  fill="#F97316"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-6 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">
                  AI-Powered Insights
                </h3>
              </div>
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{insight}</span>
                  </div>
                ))}
              </div>
              {recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-green-400 mb-2">
                    Recommendations
                  </h4>
                  {recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 mt-2">
                      <span className="text-green-400">→</span>
                      <span className="text-sm text-gray-400">{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          {/* Weight Trend */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Weight Progress
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={checkIns.filter((d) => d.weight).slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "MMM d")}
                  tick={{ fill: "#9CA3AF" }}
                />
                <YAxis tick={{ fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#F97316"
                  strokeWidth={2}
                  dot={{ fill: "#F97316" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Energy & Mood Trends */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Energy & Mood Patterns
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={checkIns.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "EEE")}
                  tick={{ fill: "#9CA3AF" }}
                />
                <YAxis domain={[0, 10]} tick={{ fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="energy"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="mood"
                  stackId="2"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Performance */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Weekly Performance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="weekStart"
                  tickFormatter={(date) => format(new Date(date), "MMM d")}
                  tick={{ fill: "#9CA3AF" }}
                />
                <YAxis tick={{ fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                  }}
                />
                <Legend />
                <Bar dataKey="avgAdherence" fill="#F97316" />
                <Bar dataKey="workoutsCompleted" fill="#10B981" />
                <Bar dataKey="perfectDays" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Check-in Tab */}
      {activeTab === "checkin" && (
        <div className="space-y-6">
          <button
            onClick={() => setShowCheckInModal(true)}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Complete Today's Check-in
          </button>

          {/* Recent Check-ins */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Recent Check-ins
            </h3>
            <div className="space-y-3">
              {checkIns
                .slice(-7)
                .reverse()
                .map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <div className="text-white font-medium">
                        {format(checkIn.date, "EEEE, MMM d")}
                      </div>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-gray-400">
                          Energy: {checkIn.energy}/10
                        </span>
                        <span className="text-xs text-gray-400">
                          Mood: {checkIn.mood}/10
                        </span>
                        <span className="text-xs text-gray-400">
                          Sleep: {checkIn.sleep}h
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-sm font-medium ${getMetricColor(
                          checkIn.adherence,
                          100,
                        )}`}
                      >
                        {checkIn.adherence}%
                      </div>
                      <button className="p-1 hover:bg-gray-600 rounded">
                        <Edit2 className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Goal
          </button>

          {/* Active Goals */}
          <div className="space-y-4">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">
                      {goal.type === "weight" && "Weight Goal"}
                      {goal.type === "performance" && "Performance Goal"}
                      {goal.type === "habit" && "Habit Goal"}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Target: {goal.target} {goal.unit} by{" "}
                      {format(goal.deadline, "MMM d, yyyy")}
                    </p>
                  </div>
                  <Award
                    className={`h-6 w-6 ${
                      goal.progress >= 100
                        ? "text-green-500"
                        : goal.progress >= 50
                          ? "text-yellow-500"
                          : "text-gray-500"
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Current</span>
                    <span className="text-white font-medium">
                      {goal.current} {goal.unit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    {goal.progress}% complete
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setShowCheckInModal(false)}
            />
            <div className="relative bg-gray-800 rounded-lg max-w-2xl w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Daily Check-in
                </h3>
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Body Metrics */}
                <div>
                  <h4 className="text-lg font-medium text-white mb-4">
                    Body Metrics (Optional)
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={todayCheckIn.weight || ""}
                        onChange={(e) =>
                          setTodayCheckIn({
                            ...todayCheckIn,
                            weight: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        placeholder="75.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Body Fat (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={todayCheckIn.bodyFat || ""}
                        onChange={(e) =>
                          setTodayCheckIn({
                            ...todayCheckIn,
                            bodyFat: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        placeholder="20.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Muscle Mass (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={todayCheckIn.muscleMass || ""}
                        onChange={(e) =>
                          setTodayCheckIn({
                            ...todayCheckIn,
                            muscleMass: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        placeholder="30.0"
                      />
                    </div>
                  </div>
                </div>

                {/* Wellness Metrics */}
                <div>
                  <h4 className="text-lg font-medium text-white mb-4">
                    How are you feeling today?
                  </h4>
                  <div className="space-y-4">
                    {[
                      { key: "energy", label: "Energy Level", icon: Zap },
                      { key: "mood", label: "Mood", icon: Smile },
                      { key: "hunger", label: "Hunger Levels", icon: Activity },
                      { key: "stress", label: "Stress Level", icon: Activity },
                    ].map((metric) => (
                      <div key={metric.key}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 text-sm text-gray-400">
                            <metric.icon className="h-4 w-4" />
                            {metric.label}
                          </label>
                          <span className="text-white font-medium">
                            {todayCheckIn[metric.key as keyof DailyCheckIn]}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={
                            todayCheckIn[metric.key as keyof DailyCheckIn] || 5
                          }
                          onChange={(e) =>
                            setTodayCheckIn({
                              ...todayCheckIn,
                              [metric.key]: parseInt(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sleep & Recovery */}
                <div>
                  <h4 className="text-lg font-medium text-white mb-4">
                    Sleep & Recovery
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Hours of Sleep
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={todayCheckIn.sleep}
                        onChange={(e) =>
                          setTodayCheckIn({
                            ...todayCheckIn,
                            sleep: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Sleep Quality (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={todayCheckIn.sleepQuality}
                        onChange={(e) =>
                          setTodayCheckIn({
                            ...todayCheckIn,
                            sleepQuality: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Nutrition Adherence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-400">
                      Nutrition Plan Adherence
                    </label>
                    <span className="text-white font-medium">
                      {todayCheckIn.adherence}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={todayCheckIn.adherence}
                    onChange={(e) =>
                      setTodayCheckIn({
                        ...todayCheckIn,
                        adherence: parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={todayCheckIn.notes || ""}
                    onChange={(e) =>
                      setTodayCheckIn({
                        ...todayCheckIn,
                        notes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    rows={3}
                    placeholder="Any additional notes about today..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCheckIn}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700"
                  >
                    Save Check-in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
