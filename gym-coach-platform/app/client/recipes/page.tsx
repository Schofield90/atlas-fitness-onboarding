"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, ChefHat, Flame, Search, Filter } from 'lucide-react';

interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  calories: number;
  prepTime: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: string[];
  instructions: string[];
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  tags: string[];
}

const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Protein-Packed Overnight Oats',
    description: 'High-protein breakfast that prepares itself while you sleep',
    image: '/api/placeholder/300/200',
    category: 'breakfast',
    calories: 420,
    prepTime: 5,
    difficulty: 'easy',
    ingredients: [
      '1/2 cup rolled oats',
      '1 scoop protein powder',
      '1 tbsp chia seeds',
      '1 cup almond milk',
      '1 tbsp almond butter',
      '1/2 banana, sliced'
    ],
    instructions: [
      'Mix oats, protein powder, and chia seeds in a jar',
      'Add almond milk and stir well',
      'Top with almond butter and banana',
      'Refrigerate overnight',
      'Enjoy cold in the morning'
    ],
    nutrition: { protein: 30, carbs: 45, fat: 12, fiber: 8 },
    tags: ['high-protein', 'make-ahead', 'vegetarian']
  },
  {
    id: '2',
    title: 'Mediterranean Quinoa Bowl',
    description: 'Fresh and healthy lunch packed with Mediterranean flavors',
    image: '/api/placeholder/300/200',
    category: 'lunch',
    calories: 380,
    prepTime: 15,
    difficulty: 'easy',
    ingredients: [
      '1 cup cooked quinoa',
      '1/2 cup cherry tomatoes',
      '1/4 cup cucumber, diced',
      '1/4 cup red onion',
      '2 tbsp feta cheese',
      '2 tbsp olive oil',
      '1 tbsp lemon juice'
    ],
    instructions: [
      'Cook quinoa according to package directions',
      'Dice tomatoes, cucumber, and onion',
      'Mix olive oil and lemon juice for dressing',
      'Combine all ingredients in a bowl',
      'Top with feta cheese and serve'
    ],
    nutrition: { protein: 14, carbs: 48, fat: 14, fiber: 6 },
    tags: ['mediterranean', 'vegetarian', 'gluten-free']
  },
  {
    id: '3',
    title: 'Grilled Salmon with Sweet Potato',
    description: 'Omega-3 rich dinner with complex carbohydrates',
    image: '/api/placeholder/300/200',
    category: 'dinner',
    calories: 520,
    prepTime: 25,
    difficulty: 'medium',
    ingredients: [
      '6 oz salmon fillet',
      '1 medium sweet potato',
      '2 cups broccoli',
      '1 tbsp olive oil',
      '1 lemon',
      'Salt and pepper to taste'
    ],
    instructions: [
      'Preheat oven to 400°F',
      'Cut sweet potato into cubes and roast for 20 minutes',
      'Season salmon with salt, pepper, and lemon',
      'Grill salmon for 4-5 minutes per side',
      'Steam broccoli until tender',
      'Serve together with lemon wedge'
    ],
    nutrition: { protein: 35, carbs: 32, fat: 18, fiber: 8 },
    tags: ['high-protein', 'omega-3', 'low-carb']
  },
  {
    id: '4',
    title: 'Greek Yogurt Berry Parfait',
    description: 'Light and refreshing snack with probiotics',
    image: '/api/placeholder/300/200',
    category: 'snacks',
    calories: 180,
    prepTime: 5,
    difficulty: 'easy',
    ingredients: [
      '1 cup Greek yogurt',
      '1/2 cup mixed berries',
      '1 tbsp honey',
      '2 tbsp granola',
      '1 tbsp almonds, chopped'
    ],
    instructions: [
      'Layer half the yogurt in a glass',
      'Add half the berries and honey',
      'Add remaining yogurt',
      'Top with remaining berries, granola, and almonds'
    ],
    nutrition: { protein: 20, carbs: 25, fat: 4, fiber: 4 },
    tags: ['high-protein', 'probiotic', 'antioxidants']
  },
  {
    id: '5',
    title: 'Avocado Toast with Eggs',
    description: 'Classic breakfast with healthy fats and protein',
    image: '/api/placeholder/300/200',
    category: 'breakfast',
    calories: 350,
    prepTime: 10,
    difficulty: 'easy',
    ingredients: [
      '2 slices whole grain bread',
      '1 ripe avocado',
      '2 eggs',
      '1 tomato, sliced',
      'Salt and pepper',
      'Red pepper flakes'
    ],
    instructions: [
      'Toast bread until golden',
      'Mash avocado with salt and pepper',
      'Fry or poach eggs to preference',
      'Spread avocado on toast',
      'Top with eggs and tomato slices',
      'Sprinkle with red pepper flakes'
    ],
    nutrition: { protein: 18, carbs: 28, fat: 20, fiber: 12 },
    tags: ['healthy-fats', 'high-fiber', 'vegetarian']
  },
  {
    id: '6',
    title: 'Asian Chicken Lettuce Wraps',
    description: 'Low-carb lunch with Asian-inspired flavors',
    image: '/api/placeholder/300/200',
    category: 'lunch',
    calories: 280,
    prepTime: 20,
    difficulty: 'medium',
    ingredients: [
      '1 lb ground chicken',
      '1 head butter lettuce',
      '2 tbsp soy sauce',
      '1 tbsp sesame oil',
      '1 tbsp ginger, minced',
      '2 green onions, chopped'
    ],
    instructions: [
      'Cook ground chicken in a pan',
      'Add soy sauce, sesame oil, and ginger',
      'Separate lettuce leaves carefully',
      'Fill lettuce cups with chicken mixture',
      'Garnish with green onions',
      'Serve immediately'
    ],
    nutrition: { protein: 25, carbs: 8, fat: 12, fiber: 3 },
    tags: ['low-carb', 'high-protein', 'asian-inspired']
  },
  {
    id: '7',
    title: 'Herb-Crusted Chicken Breast',
    description: 'Lean protein with aromatic herb seasoning',
    image: '/api/placeholder/300/200',
    category: 'dinner',
    calories: 480,
    prepTime: 30,
    difficulty: 'medium',
    ingredients: [
      '6 oz chicken breast',
      '1 cup brown rice',
      '2 cups green beans',
      '2 tbsp fresh herbs',
      '1 tbsp olive oil',
      'Garlic powder'
    ],
    instructions: [
      'Preheat oven to 375°F',
      'Season chicken with herbs and garlic powder',
      'Sear chicken in olive oil for 3 minutes',
      'Transfer to oven for 20 minutes',
      'Cook brown rice and steam green beans',
      'Serve together hot'
    ],
    nutrition: { protein: 38, carbs: 45, fat: 8, fiber: 6 },
    tags: ['high-protein', 'lean', 'herb-seasoned']
  },
  {
    id: '8',
    title: 'Energy Balls',
    description: 'No-bake protein-rich snack for on-the-go',
    image: '/api/placeholder/300/200',
    category: 'snacks',
    calories: 150,
    prepTime: 15,
    difficulty: 'easy',
    ingredients: [
      '1 cup dates, pitted',
      '1/2 cup almonds',
      '2 tbsp protein powder',
      '1 tbsp chia seeds',
      '1 tbsp coconut oil',
      '1 tsp vanilla extract'
    ],
    instructions: [
      'Process dates and almonds in food processor',
      'Add protein powder, chia seeds, and vanilla',
      'Add coconut oil gradually',
      'Roll mixture into balls',
      'Refrigerate for 30 minutes',
      'Store in refrigerator'
    ],
    nutrition: { protein: 8, carbs: 18, fat: 6, fiber: 4 },
    tags: ['no-bake', 'portable', 'natural-sweetener']
  },
  {
    id: '9',
    title: 'Smoothie Bowl',
    description: 'Thick smoothie topped with nutritious toppings',
    image: '/api/placeholder/300/200',
    category: 'breakfast',
    calories: 320,
    prepTime: 10,
    difficulty: 'easy',
    ingredients: [
      '1 frozen banana',
      '1/2 cup frozen berries',
      '1/2 cup Greek yogurt',
      '1 tbsp almond butter',
      '1 tbsp granola',
      '1 tbsp coconut flakes'
    ],
    instructions: [
      'Blend frozen fruits with yogurt until thick',
      'Pour into a bowl',
      'Top with almond butter drizzle',
      'Add granola and coconut flakes',
      'Serve immediately'
    ],
    nutrition: { protein: 16, carbs: 45, fat: 10, fiber: 8 },
    tags: ['antioxidants', 'probiotic', 'customizable']
  },
  {
    id: '10',
    title: 'Quinoa Stuffed Bell Peppers',
    description: 'Colorful dinner with complete protein from quinoa',
    image: '/api/placeholder/300/200',
    category: 'dinner',
    calories: 420,
    prepTime: 40,
    difficulty: 'medium',
    ingredients: [
      '4 bell peppers',
      '1 cup cooked quinoa',
      '1/2 cup black beans',
      '1/4 cup corn',
      '1/4 cup cheese',
      '1 tsp cumin'
    ],
    instructions: [
      'Preheat oven to 375°F',
      'Cut tops off peppers and remove seeds',
      'Mix quinoa, beans, corn, and cumin',
      'Stuff peppers with quinoa mixture',
      'Top with cheese',
      'Bake for 25-30 minutes'
    ],
    nutrition: { protein: 18, carbs: 52, fat: 8, fiber: 12 },
    tags: ['vegetarian', 'complete-protein', 'fiber-rich']
  },
  {
    id: '11',
    title: 'Hummus and Veggie Wrap',
    description: 'Fresh vegetable wrap with protein-rich hummus',
    image: '/api/placeholder/300/200',
    category: 'lunch',
    calories: 310,
    prepTime: 10,
    difficulty: 'easy',
    ingredients: [
      '1 large tortilla',
      '3 tbsp hummus',
      '1/2 cucumber, sliced',
      '1 carrot, julienned',
      '1/4 cup spinach',
      '1/4 cup sprouts'
    ],
    instructions: [
      'Spread hummus evenly on tortilla',
      'Layer vegetables on one side',
      'Roll tightly from vegetable side',
      'Cut in half diagonally',
      'Serve immediately or wrap for later'
    ],
    nutrition: { protein: 12, carbs: 42, fat: 8, fiber: 8 },
    tags: ['vegetarian', 'portable', 'fresh']
  },
  {
    id: '12',
    title: 'Trail Mix',
    description: 'Balanced mix of nuts, seeds, and dried fruit',
    image: '/api/placeholder/300/200',
    category: 'snacks',
    calories: 200,
    prepTime: 5,
    difficulty: 'easy',
    ingredients: [
      '1/4 cup almonds',
      '1/4 cup walnuts',
      '2 tbsp pumpkin seeds',
      '2 tbsp dried cranberries',
      '1 tbsp dark chocolate chips',
      'Pinch of sea salt'
    ],
    instructions: [
      'Combine all ingredients in a bowl',
      'Mix well',
      'Store in airtight container',
      'Portion into small bags for grab-and-go snacks'
    ],
    nutrition: { protein: 8, carbs: 16, fat: 14, fiber: 4 },
    tags: ['portable', 'energy-boost', 'healthy-fats']
  }
];

export default function RecipeLibraryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredRecipes = useMemo(() => {
    return MOCK_RECIPES.filter((recipe) => {
      const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || recipe.difficulty === selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchTerm, selectedCategory, selectedDifficulty]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'breakfast': return 'bg-orange-100 text-orange-800';
      case 'lunch': return 'bg-blue-100 text-blue-800';
      case 'dinner': return 'bg-purple-100 text-purple-800';
      case 'snacks': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Recipe Library</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover healthy and delicious recipes tailored to support your fitness goals.
          Filter by meal type, difficulty, or search for specific ingredients.
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes, ingredients, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="min-w-[160px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snacks">Snacks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Filter */}
            <div className="min-w-[160px]">
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <ChefHat className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredRecipes.length} of {MOCK_RECIPES.length} recipes
        </p>
        <Button variant="outline" size="sm" onClick={() => {
          setSearchTerm('');
          setSelectedCategory('all');
          setSelectedDifficulty('all');
        }}>
          Clear Filters
        </Button>
      </div>

      {/* Recipe Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Recipe Image Placeholder */}
            <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <ChefHat className="w-12 h-12 text-gray-400" />
            </div>

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg leading-tight">{recipe.title}</CardTitle>
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {recipe.difficulty}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {recipe.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Recipe Stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>{recipe.calories} cal</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>{recipe.prepTime} min</span>
                </div>
                <Badge className={getCategoryColor(recipe.category)}>
                  {recipe.category}
                </Badge>
              </div>

              {/* Nutrition Quick Stats */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-green-600">{recipe.nutrition.protein}g</div>
                  <div className="text-muted-foreground">Protein</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{recipe.nutrition.carbs}g</div>
                  <div className="text-muted-foreground">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">{recipe.nutrition.fat}g</div>
                  <div className="text-muted-foreground">Fat</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">{recipe.nutrition.fiber}g</div>
                  <div className="text-muted-foreground">Fiber</div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {recipe.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {recipe.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{recipe.tags.length - 3}
                  </Badge>
                )}
              </div>

              <Button className="w-full" variant="outline">
                View Recipe
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredRecipes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters to find more recipes.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedDifficulty('all');
              }}
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}