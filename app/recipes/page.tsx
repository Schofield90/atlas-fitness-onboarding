"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Search,
  Filter,
  Clock,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Star,
  ChefHat,
  Plus,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Recipe {
  id: string;
  name: string;
  description: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  cook_time: number;
  dietary_tags: string[];
  allergens: string[];
  rating: number;
  upvotes: number;
  downvotes: number;
  times_used: number;
  image_url: string;
  is_featured: boolean;
  created_at: string;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<string>("all");
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [maxCookTime, setMaxCookTime] = useState<number>(120);
  const [sortBy, setSortBy] = useState<string>("rating");
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());

  const supabase = createClient();
  const router = useRouter();

  const mealTypes = [
    { value: "all", label: "All Meals" },
    { value: "breakfast", label: "Breakfast" },
    { value: "morning_snack", label: "Morning Snack" },
    { value: "lunch", label: "Lunch" },
    { value: "afternoon_snack", label: "Afternoon Snack" },
    { value: "dinner", label: "Dinner" },
  ];

  const dietaryOptions = [
    "vegetarian",
    "vegan",
    "gluten-free",
    "dairy-free",
    "low-carb",
    "high-protein",
    "keto",
    "paleo",
  ];

  const allergenOptions = [
    "nuts",
    "dairy",
    "eggs",
    "gluten",
    "soy",
    "shellfish",
    "fish",
    "sesame",
  ];

  useEffect(() => {
    loadRecipes();
    loadUserPreferences();
  }, [
    searchTerm,
    selectedMealType,
    selectedDietaryTags,
    selectedAllergens,
    maxCookTime,
    sortBy,
  ]);

  const loadRecipes = async () => {
    try {
      console.log("Loading recipes with filters:", {
        selectedMealType,
        searchTerm,
        selectedDietaryTags,
        selectedAllergens,
        maxCookTime,
        sortBy,
      });

      // Use API endpoint with service role to bypass RLS
      const params = new URLSearchParams({
        search: searchTerm,
        mealType: selectedMealType,
        sortBy: sortBy,
      });

      const response = await fetch(`/api/recipes/all?${params}`);
      const result = await response.json();

      if (result.success) {
        console.log(`Loaded ${result.count} recipes from API`);

        // Apply client-side filters for dietary tags and allergens
        let filteredRecipes = result.recipes || [];

        if (selectedDietaryTags.length > 0) {
          filteredRecipes = filteredRecipes.filter((recipe: Recipe) =>
            selectedDietaryTags.every((tag) =>
              recipe.dietary_tags?.includes(tag),
            ),
          );
        }

        if (selectedAllergens.length > 0) {
          filteredRecipes = filteredRecipes.filter(
            (recipe: Recipe) =>
              !selectedAllergens.some((allergen) =>
                recipe.allergens?.includes(allergen),
              ),
          );
        }

        // Apply cook time filter
        if (maxCookTime < 120) {
          filteredRecipes = filteredRecipes.filter(
            (recipe: Recipe) =>
              recipe.prep_time + recipe.cook_time <= maxCookTime,
          );
        }

        setRecipes(filteredRecipes);

        if (filteredRecipes.length > 0) {
          console.log("First recipe structure:", filteredRecipes[0]);
        }
      } else {
        console.error("Error loading recipes from API:", result.error);
      }
    } catch (error) {
      console.error("Error loading recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Load user votes
        const { data: votes } = await supabase
          .from("recipe_votes")
          .select("recipe_id, vote_type")
          .eq("user_id", user.id);

        if (votes) {
          const votesMap: Record<string, string> = {};
          votes.forEach((vote) => {
            votesMap[vote.recipe_id] = vote.vote_type;
          });
          setUserVotes(votesMap);
        }

        // Load user favorites
        const { data: favorites } = await supabase
          .from("recipe_favorites")
          .select("recipe_id")
          .eq("user_id", user.id);

        if (favorites) {
          setUserFavorites(new Set(favorites.map((f) => f.recipe_id)));
        }
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
    }
  };

  const handleVote = async (
    recipeId: string,
    voteType: "upvote" | "downvote",
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const currentVote = userVotes[recipeId];

      if (currentVote === voteType) {
        // Remove vote
        await supabase
          .from("recipe_votes")
          .delete()
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id);

        const newVotes = { ...userVotes };
        delete newVotes[recipeId];
        setUserVotes(newVotes);
      } else {
        // Add or update vote
        await supabase.from("recipe_votes").upsert({
          recipe_id: recipeId,
          user_id: user.id,
          vote_type: voteType,
        });

        setUserVotes({ ...userVotes, [recipeId]: voteType });
      }

      // Reload recipes to get updated counts
      loadRecipes();
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handleFavorite = async (recipeId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      if (userFavorites.has(recipeId)) {
        // Remove favorite
        await supabase
          .from("recipe_favorites")
          .delete()
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id);

        const newFavorites = new Set(userFavorites);
        newFavorites.delete(recipeId);
        setUserFavorites(newFavorites);
      } else {
        // Add favorite
        await supabase.from("recipe_favorites").insert({
          recipe_id: recipeId,
          user_id: user.id,
        });

        setUserFavorites(new Set([...userFavorites, recipeId]));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const formatTime = (minutes: number) => {
    if (!minutes) return "Quick";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-orange-500" />
                Recipe Library
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Community-driven recipe collection
              </p>
            </div>
            <Link
              href="/recipes/submit"
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Submit Recipe
            </Link>
          </div>
        </div>
      </header>

      {/* Filters Section */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Meal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Meal Type
              </label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {mealTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Cook Time */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Max Cook Time: {formatTime(maxCookTime)}
              </label>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={maxCookTime}
                onChange={(e) => setMaxCookTime(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="rating">Highest Rated</option>
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
                <option value="quickest">Quickest</option>
                <option value="calories">Lowest Calories</option>
              </select>
            </div>

            {/* Dietary Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Dietary Preferences
              </label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.slice(0, 3).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedDietaryTags(
                        selectedDietaryTags.includes(tag)
                          ? selectedDietaryTags.filter((t) => t !== tag)
                          : [...selectedDietaryTags, tag],
                      );
                    }}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      selectedDietaryTags.includes(tag)
                        ? "bg-orange-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No recipes found
            </h3>
            <p className="text-gray-400">
              Try adjusting your filters or search term
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-orange-500 transition-colors"
              >
                {/* Recipe Image */}
                {recipe.image_url ? (
                  <img
                    src={recipe.image_url}
                    alt={recipe.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
                    <ChefHat className="h-16 w-16 text-gray-600" />
                  </div>
                )}

                {/* Recipe Content */}
                <div className="p-4">
                  {/* Title and Description */}
                  <Link href={`/recipes/${recipe.id}`}>
                    <h3 className="text-lg font-semibold text-white hover:text-orange-500 transition-colors">
                      {recipe.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {recipe.description}
                  </p>

                  {/* Meal Type Badge */}
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs bg-gray-700 text-orange-400 rounded">
                      {recipe.meal_type.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  {/* Nutrition Info */}
                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                    <div className="text-center">
                      <span className="text-gray-400 block">Cal</span>
                      <span className="text-white font-semibold">
                        {recipe.calories}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">Pro</span>
                      <span className="text-white font-semibold">
                        {recipe.protein}g
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">Carb</span>
                      <span className="text-white font-semibold">
                        {recipe.carbs}g
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block">Fat</span>
                      <span className="text-white font-semibold">
                        {recipe.fat}g
                      </span>
                    </div>
                  </div>

                  {/* Time and Rating */}
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(recipe.prep_time + recipe.cook_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(recipe.rating * 5)
                              ? "text-yellow-500 fill-current"
                              : "text-gray-600"
                          }`}
                        />
                      ))}
                      <span className="text-gray-400 text-xs ml-1">
                        ({recipe.times_used})
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(recipe.id, "upvote")}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          userVotes[recipe.id] === "upvote"
                            ? "bg-green-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span className="text-xs">{recipe.upvotes}</span>
                      </button>
                      <button
                        onClick={() => handleVote(recipe.id, "downvote")}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          userVotes[recipe.id] === "downvote"
                            ? "bg-red-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span className="text-xs">{recipe.downvotes}</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handleFavorite(recipe.id)}
                      className={`p-2 rounded transition-colors ${
                        userFavorites.has(recipe.id)
                          ? "text-red-500"
                          : "text-gray-400 hover:text-red-500"
                      }`}
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          userFavorites.has(recipe.id) ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
