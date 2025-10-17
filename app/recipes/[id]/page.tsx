"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Heart,
  ChefHat,
  ArrowLeft,
  Users,
  Calendar,
  Download,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface Recipe {
  id: string;
  name: string;
  description: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty?: string;
  cuisine?: string;
  ingredients: any[];
  instructions: string[];
  equipment?: string[];
  dietary_tags: string[];
  allergens: string[];
  rating: number;
  upvotes: number;
  downvotes: number;
  times_used: number;
  image_url?: string;
  created_at: string;
  created_by?: string;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToMealPlan, setAddingToMealPlan] = useState(false);

  const supabase = createClient();
  const recipeId = params.id as string;

  useEffect(() => {
    loadRecipe();
    loadUserPreferences();
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", recipeId)
        .single();

      if (error) {
        console.error("Error loading recipe:", error);
        router.push("/recipes");
      } else {
        setRecipe(data);
      }
    } catch (error) {
      console.error("Error loading recipe:", error);
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
        // Load user vote
        const { data: vote } = await supabase
          .from("recipe_votes")
          .select("vote_type")
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id)
          .single();

        if (vote) {
          setUserVote(vote.vote_type);
        }

        // Load favorite status
        const { data: favorite } = await supabase
          .from("recipe_favorites")
          .select("id")
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id)
          .single();

        setIsFavorite(!!favorite);
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
    }
  };

  const handleVote = async (voteType: "upvote" | "downvote") => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      if (userVote === voteType) {
        // Remove vote
        await supabase
          .from("recipe_votes")
          .delete()
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id);

        setUserVote(null);
      } else {
        // Add or update vote
        await supabase.from("recipe_votes").upsert({
          recipe_id: recipeId,
          user_id: user.id,
          vote_type: voteType,
        });

        setUserVote(voteType);
      }

      // Reload recipe to get updated counts
      loadRecipe();
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handleFavorite = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      if (isFavorite) {
        // Remove favorite
        await supabase
          .from("recipe_favorites")
          .delete()
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id);

        setIsFavorite(false);
      } else {
        // Add favorite
        await supabase.from("recipe_favorites").insert({
          recipe_id: recipeId,
          user_id: user.id,
        });

        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const addToTodaysMealPlan = async () => {
    setAddingToMealPlan(true);
    try {
      // This would integrate with the meal plan system
      // For now, just show a success message
      alert("Recipe added to today's meal plan!");
    } catch (error) {
      console.error("Error adding to meal plan:", error);
    } finally {
      setAddingToMealPlan(false);
    }
  };

  const downloadRecipe = () => {
    if (!recipe) return;

    const recipeText = `
${recipe.name}
${recipe.description}

NUTRITIONAL INFORMATION
Calories: ${recipe.calories}
Protein: ${recipe.protein}g
Carbs: ${recipe.carbs}g
Fat: ${recipe.fat}g

INGREDIENTS
${recipe.ingredients.map((ing) => `- ${ing.amount} ${ing.unit} ${ing.item}`).join("\n")}

INSTRUCTIONS
${recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join("\n")}

Prep Time: ${recipe.prep_time} minutes
Cook Time: ${recipe.cook_time} minutes
Servings: ${recipe.servings}
    `.trim();

    const blob = new Blob([recipeText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipe.name.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Recipe not found
          </h2>
          <Link
            href="/recipes"
            className="text-orange-500 hover:text-orange-400 transition-colors"
          >
            Back to recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              href="/recipes"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to recipes
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadRecipe}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Download recipe"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Recipe Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          {/* Recipe Image */}
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="w-full h-64 md:h-96 object-cover"
            />
          ) : (
            <div className="w-full h-64 md:h-96 bg-gray-700 flex items-center justify-center">
              <ChefHat className="h-24 w-24 text-gray-600" />
            </div>
          )}

          <div className="p-6">
            {/* Title and Description */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-white">{recipe.name}</h1>
                <span className="inline-block px-3 py-1 text-sm bg-gray-700 text-orange-400 rounded">
                  {recipe.meal_type.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400">{recipe.description}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-3 text-center">
                <Clock className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Prep Time</div>
                <div className="text-white font-semibold">
                  {recipe.prep_time} min
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 text-center">
                <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Cook Time</div>
                <div className="text-white font-semibold">
                  {recipe.cook_time} min
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 text-center">
                <Users className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Servings</div>
                <div className="text-white font-semibold">
                  {recipe.servings}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 text-center">
                <Calendar className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Used</div>
                <div className="text-white font-semibold">
                  {recipe.times_used} times
                </div>
              </div>
            </div>

            {/* Nutrition Info */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Nutritional Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Calories</span>
                  <p className="text-white text-xl font-bold">
                    {recipe.calories}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Protein</span>
                  <p className="text-white text-xl font-bold">
                    {recipe.protein}g
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Carbs</span>
                  <p className="text-white text-xl font-bold">
                    {recipe.carbs}g
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Fat</span>
                  <p className="text-white text-xl font-bold">{recipe.fat}g</p>
                </div>
              </div>
            </div>

            {/* Dietary Tags */}
            {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Dietary Information
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.dietary_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-green-900/30 text-green-400 rounded-lg text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergens */}
            {recipe.allergens && recipe.allergens.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Allergen Warning
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.allergens.map((allergen) => (
                    <span
                      key={allergen}
                      className="px-3 py-1 bg-red-900/30 text-red-400 rounded-lg text-sm"
                    >
                      Contains {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Ingredients
              </h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-gray-300"
                  >
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span>
                      {ingredient.amount} {ingredient.unit} {ingredient.item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Instructions
              </h3>
              <ol className="space-y-3">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-300 pt-1">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-700">
              <button
                onClick={addToTodaysMealPlan}
                disabled={addingToMealPlan}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
                Add to Today's Meal Plan
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleVote("upvote")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                    userVote === "upvote"
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  <ThumbsUp className="h-5 w-5" />
                  <span>{recipe.upvotes}</span>
                </button>

                <button
                  onClick={() => handleVote("downvote")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                    userVote === "downvote"
                      ? "bg-red-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  <ThumbsDown className="h-5 w-5" />
                  <span>{recipe.downvotes}</span>
                </button>

                <button
                  onClick={handleFavorite}
                  className={`p-3 rounded-lg transition-colors ${
                    isFavorite
                      ? "bg-red-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
