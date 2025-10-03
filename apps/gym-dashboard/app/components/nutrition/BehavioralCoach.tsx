"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  CheckCircle,
  Circle,
  Trophy,
  Flame,
  Calendar,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
  Zap,
  Heart,
  Brain,
  Coffee,
  Utensils,
  Dumbbell,
  Moon,
  Sun,
  Droplets,
  ChevronRight,
  Plus,
  X,
  Edit2,
  Save,
  Repeat,
} from "lucide-react";
import { format, addDays, subDays, differenceInDays } from "date-fns";

interface Habit {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  frequency: "daily" | "weekly" | "custom";
  targetCount: number;
  currentStreak: number;
  bestStreak: number;
  completedDates: Date[];
  category: "nutrition" | "hydration" | "exercise" | "sleep" | "mindfulness";
  timeOfDay?: "morning" | "afternoon" | "evening" | "anytime";
  reminder?: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
}

interface MicroGoal {
  id: string;
  habitId: string;
  description: string;
  completed: boolean;
  dueDate: Date;
  difficulty: "easy" | "medium" | "hard";
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  unlockedDate?: Date;
  requirement: string;
  progress: number;
  maxProgress: number;
  points: number;
}

interface CoachingTip {
  id: string;
  category: string;
  title: string;
  content: string;
  actionable: string;
  difficulty: "easy" | "medium" | "hard";
}

const PRESET_HABITS: Partial<Habit>[] = [
  {
    name: "Drink Water Upon Waking",
    description: "Start your day with 500ml of water",
    icon: Droplets,
    category: "hydration",
    timeOfDay: "morning",
    difficulty: "easy",
    points: 10,
  },
  {
    name: "Meal Prep Sunday",
    description: "Prepare meals for the upcoming week",
    icon: Utensils,
    category: "nutrition",
    frequency: "weekly",
    difficulty: "medium",
    points: 30,
  },
  {
    name: "Track All Meals",
    description: "Log everything you eat in your food diary",
    icon: Edit2,
    category: "nutrition",
    difficulty: "medium",
    points: 20,
  },
  {
    name: "10-Minute Morning Movement",
    description: "Quick stretching or light exercise routine",
    icon: Dumbbell,
    category: "exercise",
    timeOfDay: "morning",
    difficulty: "easy",
    points: 15,
  },
  {
    name: "Mindful Eating",
    description: "Eat one meal per day without distractions",
    icon: Brain,
    category: "mindfulness",
    difficulty: "hard",
    points: 25,
  },
  {
    name: "Evening Wind-Down",
    description: "No screens 30 minutes before bed",
    icon: Moon,
    category: "sleep",
    timeOfDay: "evening",
    difficulty: "medium",
    points: 20,
  },
];

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "1",
    title: "First Step",
    description: "Complete your first habit",
    icon: Trophy,
    requirement: "Complete 1 habit",
    progress: 0,
    maxProgress: 1,
    points: 50,
  },
  {
    id: "2",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: Flame,
    requirement: "7-day streak on any habit",
    progress: 0,
    maxProgress: 7,
    points: 100,
  },
  {
    id: "3",
    title: "Habit Master",
    description: "Complete 100 total habits",
    icon: Award,
    requirement: "Complete 100 habits",
    progress: 0,
    maxProgress: 100,
    points: 500,
  },
  {
    id: "4",
    title: "Consistency King",
    description: "30-day streak on any habit",
    icon: Trophy,
    requirement: "30-day streak",
    progress: 0,
    maxProgress: 30,
    points: 300,
  },
];

const COACHING_TIPS: CoachingTip[] = [
  {
    id: "1",
    category: "habit_formation",
    title: "Stack Your Habits",
    content:
      "Attach new habits to existing ones. After [current habit], I will [new habit].",
    actionable: "Link drinking water to your morning coffee routine",
    difficulty: "easy",
  },
  {
    id: "2",
    category: "meal_prep",
    title: "Batch Cooking Strategy",
    content:
      "Cook proteins, grains, and vegetables in bulk. Mix and match throughout the week.",
    actionable: "Dedicate 2 hours on Sunday to prep 15 meals",
    difficulty: "medium",
  },
  {
    id: "3",
    category: "mindful_eating",
    title: "The 20-Minute Rule",
    content:
      "It takes 20 minutes for your brain to register fullness. Slow down and savor.",
    actionable: "Set a timer for 20 minutes during meals",
    difficulty: "easy",
  },
  {
    id: "4",
    category: "accountability",
    title: "Public Commitment",
    content:
      "Share your goals with someone who will check in on your progress.",
    actionable: "Text a friend your daily habit completions",
    difficulty: "easy",
  },
];

// Add Crown icon definition since it's used in ACHIEVEMENTS
const Crown = Trophy; // Using Trophy as fallback for Crown

export default function BehavioralCoach({
  clientId,
  onHabitComplete,
}: {
  clientId: string;
  onHabitComplete?: (habit: Habit) => void;
}) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [microGoals, setMicroGoals] = useState<MicroGoal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [totalPoints, setTotalPoints] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [activeTab, setActiveTab] = useState<
    "habits" | "goals" | "achievements" | "tips"
  >("habits");
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Partial<Habit> | null>(
    null,
  );
  const [todayTip, setTodayTip] = useState<CoachingTip>(COACHING_TIPS[0]);

  useEffect(() => {
    loadHabits();
    selectDailyTip();
  }, []);

  const loadHabits = async () => {
    // Load from database - mock data for now
    const mockHabits: Habit[] = [
      {
        id: "1",
        name: "Drink 2L Water Daily",
        description: "Stay hydrated throughout the day",
        icon: Droplets,
        frequency: "daily",
        targetCount: 1,
        currentStreak: 5,
        bestStreak: 12,
        completedDates: [
          subDays(new Date(), 4),
          subDays(new Date(), 3),
          subDays(new Date(), 2),
          subDays(new Date(), 1),
          new Date(),
        ],
        category: "hydration",
        timeOfDay: "anytime",
        difficulty: "easy",
        points: 10,
      },
      {
        id: "2",
        name: "Meal Prep",
        description: "Prepare healthy meals in advance",
        icon: Utensils,
        frequency: "weekly",
        targetCount: 1,
        currentStreak: 2,
        bestStreak: 4,
        completedDates: [subDays(new Date(), 7), new Date()],
        category: "nutrition",
        difficulty: "medium",
        points: 30,
      },
      {
        id: "3",
        name: "Morning Protein",
        description: "30g protein within 30 minutes of waking",
        icon: Coffee,
        frequency: "daily",
        targetCount: 1,
        currentStreak: 3,
        bestStreak: 21,
        completedDates: [
          subDays(new Date(), 2),
          subDays(new Date(), 1),
          new Date(),
        ],
        category: "nutrition",
        timeOfDay: "morning",
        difficulty: "medium",
        points: 20,
      },
    ];

    setHabits(mockHabits);
    calculateTotalPoints(mockHabits);
  };

  const selectDailyTip = () => {
    const tipIndex = new Date().getDate() % COACHING_TIPS.length;
    setTodayTip(COACHING_TIPS[tipIndex]);
  };

  const calculateTotalPoints = (habitList: Habit[]) => {
    const points = habitList.reduce(
      (total, habit) => total + habit.completedDates.length * habit.points,
      0,
    );
    setTotalPoints(points);
    setCurrentLevel(Math.floor(points / 500) + 1);
  };

  const toggleHabitCompletion = (habitId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id === habitId) {
          const isCompletedToday = habit.completedDates.some(
            (date) => new Date(date).toDateString() === today.toDateString(),
          );

          let updatedHabit: Habit;

          if (isCompletedToday) {
            // Remove today's completion
            updatedHabit = {
              ...habit,
              completedDates: habit.completedDates.filter(
                (date) =>
                  new Date(date).toDateString() !== today.toDateString(),
              ),
              currentStreak: Math.max(0, habit.currentStreak - 1),
            };
          } else {
            // Add today's completion
            const newCompletedDates = [...habit.completedDates, today];
            const wasCompletedYesterday = habit.completedDates.some(
              (date) =>
                new Date(date).toDateString() ===
                subDays(today, 1).toDateString(),
            );

            const newStreak = wasCompletedYesterday
              ? habit.currentStreak + 1
              : 1;

            updatedHabit = {
              ...habit,
              completedDates: newCompletedDates,
              currentStreak: newStreak,
              bestStreak: Math.max(habit.bestStreak, newStreak),
            };

            // Trigger callback
            if (onHabitComplete) {
              onHabitComplete(updatedHabit);
            }

            // Update achievements
            updateAchievements(updatedHabit);
          }

          return updatedHabit;
        }
        return habit;
      }),
    );

    // Recalculate points
    calculateTotalPoints(habits);
  };

  const updateAchievements = (habit: Habit) => {
    setAchievements((prevAchievements) =>
      prevAchievements.map((achievement) => {
        if (achievement.id === "2" && habit.currentStreak >= 7) {
          return {
            ...achievement,
            progress: 7,
            unlockedDate: achievement.unlockedDate || new Date(),
          };
        }
        if (achievement.id === "4" && habit.currentStreak >= 30) {
          return {
            ...achievement,
            progress: 30,
            unlockedDate: achievement.unlockedDate || new Date(),
          };
        }
        return achievement;
      }),
    );
  };

  const addNewHabit = () => {
    if (!selectedHabit || !selectedHabit.name) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: selectedHabit.name,
      description: selectedHabit.description || "",
      icon: selectedHabit.icon || Target,
      frequency: selectedHabit.frequency || "daily",
      targetCount: 1,
      currentStreak: 0,
      bestStreak: 0,
      completedDates: [],
      category: selectedHabit.category || "nutrition",
      timeOfDay: selectedHabit.timeOfDay,
      difficulty: selectedHabit.difficulty || "medium",
      points: selectedHabit.points || 10,
    };

    setHabits([...habits, newHabit]);
    setShowAddHabitModal(false);
    setSelectedHabit(null);
  };

  const getStreakStatus = (habit: Habit): "active" | "broken" | "new" => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = subDays(today, 1);

    const completedToday = habit.completedDates.some(
      (date) => new Date(date).toDateString() === today.toDateString(),
    );
    const completedYesterday = habit.completedDates.some(
      (date) => new Date(date).toDateString() === yesterday.toDateString(),
    );

    if (completedToday || completedYesterday) return "active";
    if (habit.currentStreak > 0) return "broken";
    return "new";
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case "easy":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "hard":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getLevelProgress = (): number => {
    const pointsInCurrentLevel = totalPoints % 500;
    return (pointsInCurrentLevel / 500) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-6 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Behavioral Coaching Hub
            </h2>
            <p className="text-gray-400">
              Build lasting habits, one day at a time
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-orange-500">
              Level {currentLevel}
            </div>
            <div className="text-sm text-gray-400">
              {totalPoints} total points
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Level {currentLevel}</span>
            <span>{Math.floor(getLevelProgress())}% to next level</span>
            <span>Level {currentLevel + 1}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${getLevelProgress()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
        {[
          { id: "habits", label: "Daily Habits", icon: Repeat },
          { id: "goals", label: "Micro Goals", icon: Target },
          { id: "achievements", label: "Achievements", icon: Trophy },
          { id: "tips", label: "Coaching Tips", icon: Brain },
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
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Habits Tab */}
      {activeTab === "habits" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowAddHabitModal(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add New Habit
          </button>

          {/* Today's Focus */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Sun className="h-5 w-5 text-yellow-500" />
              Today's Focus
            </h3>
            <div className="space-y-3">
              {habits
                .filter(
                  (habit) =>
                    !habit.completedDates.some(
                      (date) =>
                        new Date(date).toDateString() ===
                        new Date().toDateString(),
                    ),
                )
                .map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => toggleHabitCompletion(habit.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Circle className="h-5 w-5 text-gray-400" />
                      <habit.icon className="h-5 w-5 text-orange-500" />
                      <div>
                        <div className="text-white font-medium">
                          {habit.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {habit.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${getDifficultyColor(
                          habit.difficulty,
                        )}`}
                      >
                        +{habit.points} pts
                      </div>
                      {habit.currentStreak > 0 && (
                        <div className="text-xs text-gray-400">
                          {habit.currentStreak} day streak
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* All Habits */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">
              All Habits
            </h3>
            <div className="space-y-3">
              {habits.map((habit) => {
                const isCompletedToday = habit.completedDates.some(
                  (date) =>
                    new Date(date).toDateString() === new Date().toDateString(),
                );
                const streakStatus = getStreakStatus(habit);

                return (
                  <div
                    key={habit.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      isCompletedToday
                        ? "bg-green-900/30 border border-green-500/30"
                        : "bg-gray-700/50 hover:bg-gray-700"
                    }`}
                    onClick={() => toggleHabitCompletion(habit.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isCompletedToday ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <habit.icon
                        className={`h-5 w-5 ${
                          isCompletedToday
                            ? "text-green-400"
                            : "text-orange-500"
                        }`}
                      />
                      <div>
                        <div className="text-white font-medium">
                          {habit.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {habit.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Streak Display */}
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Flame
                            className={`h-4 w-4 ${
                              streakStatus === "active"
                                ? "text-orange-500"
                                : "text-gray-500"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              streakStatus === "active"
                                ? "text-orange-500"
                                : "text-gray-500"
                            }`}
                          >
                            {habit.currentStreak}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">streak</div>
                      </div>

                      {/* Best Streak */}
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium text-yellow-500">
                            {habit.bestStreak}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">best</div>
                      </div>

                      {/* Points */}
                      <div className="text-center">
                        <div
                          className={`text-sm font-medium ${getDifficultyColor(
                            habit.difficulty,
                          )}`}
                        >
                          +{habit.points}
                        </div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Micro Goals Tab */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              This Week's Micro Goals
            </h3>
            <div className="space-y-3">
              {[
                {
                  description: "Prep vegetables for 3 days",
                  difficulty: "easy",
                  completed: true,
                },
                {
                  description: "Try 2 new healthy recipes",
                  difficulty: "medium",
                  completed: false,
                },
                {
                  description: "Hit protein target 5/7 days",
                  difficulty: "medium",
                  completed: false,
                },
                {
                  description: "No processed snacks for 3 days",
                  difficulty: "hard",
                  completed: false,
                },
              ].map((goal, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    goal.completed
                      ? "bg-green-900/30 border border-green-500/30"
                      : "bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {goal.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                    <span
                      className={`${
                        goal.completed
                          ? "text-gray-400 line-through"
                          : "text-white"
                      }`}
                    >
                      {goal.description}
                    </span>
                  </div>
                  <span
                    className={`text-sm ${getDifficultyColor(goal.difficulty)}`}
                  >
                    {goal.difficulty}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-400">Pro Tip</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                Start with easy goals to build momentum, then gradually increase
                difficulty as habits become automatic.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === "achievements" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => {
            const isUnlocked = achievement.unlockedDate !== undefined;
            const progressPercentage =
              (achievement.progress / achievement.maxProgress) * 100;

            return (
              <div
                key={achievement.id}
                className={`bg-gray-800 rounded-lg p-4 border ${
                  isUnlocked
                    ? "border-yellow-500/50 bg-yellow-900/10"
                    : "border-gray-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-3 rounded-lg ${
                      isUnlocked ? "bg-yellow-500/20" : "bg-gray-700"
                    }`}
                  >
                    <achievement.icon
                      className={`h-6 w-6 ${
                        isUnlocked ? "text-yellow-500" : "text-gray-500"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`font-semibold ${
                        isUnlocked ? "text-yellow-500" : "text-white"
                      }`}
                    >
                      {achievement.title}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {achievement.description}
                    </p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{achievement.requirement}</span>
                        <span>
                          {achievement.progress}/{achievement.maxProgress}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isUnlocked ? "bg-yellow-500" : "bg-orange-600"
                          }`}
                          style={{
                            width: `${Math.min(progressPercentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    {isUnlocked && (
                      <div className="mt-2 text-xs text-yellow-500">
                        Unlocked{" "}
                        {format(achievement.unlockedDate, "MMM d, yyyy")}
                      </div>
                    )}
                    <div className="mt-2 text-sm text-gray-400">
                      +{achievement.points} points
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Coaching Tips Tab */}
      {activeTab === "tips" && (
        <div className="space-y-4">
          {/* Today's Tip */}
          <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg p-6 border border-green-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">
                Today's Coaching Tip
              </h3>
            </div>
            <h4 className="text-xl font-bold text-green-400 mb-2">
              {todayTip.title}
            </h4>
            <p className="text-gray-300 mb-4">{todayTip.content}</p>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ChevronRight className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">
                  Take Action
                </span>
              </div>
              <p className="text-sm text-gray-300">{todayTip.actionable}</p>
            </div>
          </div>

          {/* All Tips */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">
              Coaching Library
            </h3>
            <div className="space-y-3">
              {COACHING_TIPS.map((tip) => (
                <div
                  key={tip.id}
                  className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-white font-medium">{tip.title}</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        {tip.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            tip.difficulty === "easy"
                              ? "bg-green-500/20 text-green-400"
                              : tip.difficulty === "medium"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {tip.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">
                          {tip.category.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Habit Modal */}
      {showAddHabitModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setShowAddHabitModal(false)}
            />
            <div className="relative bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Add New Habit
                </h3>
                <button
                  onClick={() => setShowAddHabitModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Preset Habits */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Choose a preset or create custom
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {PRESET_HABITS.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedHabit(preset)}
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          selectedHabit?.name === preset.name
                            ? "bg-orange-600/20 border border-orange-500"
                            : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {preset.icon && (
                            <preset.icon className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="text-sm text-white">
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Habit Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Or enter custom habit
                  </label>
                  <input
                    type="text"
                    value={selectedHabit?.name || ""}
                    onChange={(e) =>
                      setSelectedHabit({
                        ...selectedHabit,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    placeholder="e.g., Walk 10,000 steps"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={selectedHabit?.description || ""}
                    onChange={(e) =>
                      setSelectedHabit({
                        ...selectedHabit,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    placeholder="Brief description"
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Frequency
                  </label>
                  <select
                    value={selectedHabit?.frequency || "daily"}
                    onChange={(e) =>
                      setSelectedHabit({
                        ...selectedHabit,
                        frequency: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddHabitModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addNewHabit}
                    disabled={!selectedHabit?.name}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Habit
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
