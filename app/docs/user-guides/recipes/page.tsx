import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Recipes & Meal Planning Guide | Wellness Projection Lab',
  description: 'Browse recipes and plan meals for your health journey.',
}

export default function RecipesPage() {
  return (
    <GuideTemplate
      appRoute="/recipes"
      title="Recipes & Meal Planning"
      description="Browse recipes and plan meals for your health journey"
    >
      <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-green-900 mb-2">🍳 Healthy Eating Made Easy</p>
        <p className="text-green-800 m-0">
          Discover recipes tailored to your dietary needs and health goals. Save favorites, generate shopping lists, and meal plan with confidence.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        WPL's recipe library helps you discover healthy meals that align with your health goals. Search by dietary restrictions, generate AI suggestions based on your pantry, and build shopping lists directly from recipes.
      </p>

      <h2 id="browsing">Browsing the Recipe Library</h2>

      <h3>Accessing Recipes</h3>
      <ol>
        <li>Click <strong>Recipes</strong> from the main navigation</li>
        <li>Browse featured recipes or use search</li>
        <li>Apply filters for dietary needs</li>
        <li>Click any recipe to view full details</li>
      </ol>

      <h3>Recipe Categories</h3>
      <ul>
        <li><strong>Breakfast:</strong> Morning meals, smoothies, oatmeal bowls</li>
        <li><strong>Lunch:</strong> Salads, sandwiches, soups</li>
        <li><strong>Dinner:</strong> Main courses, family meals</li>
        <li><strong>Snacks:</strong> Healthy snacks and appetizers</li>
        <li><strong>Desserts:</strong> Guilt-free sweet treats</li>
        <li><strong>Meal Prep:</strong> Batch cooking recipes</li>
        <li><strong>Quick & Easy:</strong> 30 minutes or less</li>
      </ul>

      <h2 id="search-filter">Searching & Filtering Recipes</h2>

      <h3>Search Options</h3>
      <ul>
        <li><strong>By Name:</strong> Search for specific recipes</li>
        <li><strong>By Ingredient:</strong> Find recipes using what you have</li>
        <li><strong>By Cuisine:</strong> Italian, Mexican, Asian, Mediterranean, etc.</li>
        <li><strong>By Cook Time:</strong> Filter by preparation time</li>
      </ul>

      <h3>Dietary Filters</h3>
      <p>Filter recipes based on your dietary needs:</p>
      <ul>
        <li><strong>Vegetarian:</strong> No meat, but may include eggs/dairy</li>
        <li><strong>Vegan:</strong> Plant-based only</li>
        <li><strong>Gluten-Free:</strong> No wheat, barley, rye</li>
        <li><strong>Dairy-Free:</strong> No milk products</li>
        <li><strong>Keto:</strong> Low-carb, high-fat</li>
        <li><strong>Paleo:</strong> Whole foods, no processed ingredients</li>
        <li><strong>Low-Sodium:</strong> For heart health</li>
        <li><strong>Diabetic-Friendly:</strong> Low glycemic index</li>
      </ul>

      <h3>Goal-Aligned Recipes</h3>
      <p>Recipes automatically filtered based on your active health goals:</p>
      <ul>
        <li><strong>Weight Loss:</strong> Low-calorie, high-volume meals</li>
        <li><strong>Muscle Gain:</strong> High-protein recipes</li>
        <li><strong>Heart Health:</strong> Low-saturated-fat options</li>
        <li><strong>Diabetes Management:</strong> Blood sugar-friendly meals</li>
      </ul>

      <h2 id="recipe-details">Recipe Details Page</h2>
      <p>Each recipe includes comprehensive information:</p>

      <h3>Overview Section</h3>
      <ul>
        <li><strong>Photo:</strong> High-quality image of finished dish</li>
        <li><strong>Description:</strong> What makes this recipe special</li>
        <li><strong>Prep Time:</strong> How long to prepare ingredients</li>
        <li><strong>Cook Time:</strong> Active cooking time</li>
        <li><strong>Total Time:</strong> Start to finish</li>
        <li><strong>Servings:</strong> Number of portions (adjustable)</li>
        <li><strong>Difficulty:</strong> Easy, Medium, Advanced</li>
      </ul>

      <h3>Nutrition Information</h3>
      <p>Per-serving nutritional breakdown:</p>
      <ul>
        <li>Calories</li>
        <li>Protein, Carbs, Fat (macros)</li>
        <li>Fiber</li>
        <li>Sugar</li>
        <li>Sodium</li>
        <li>Vitamins and minerals (key nutrients)</li>
        <li>Health score rating</li>
      </ul>

      <h3>Ingredients List</h3>
      <ul>
        <li>Quantities for all ingredients</li>
        <li>Adjustable serving size (scales quantities automatically)</li>
        <li>Substitution suggestions</li>
        <li><strong>Add to Shopping List</strong> button</li>
      </ul>

      <h3>Instructions</h3>
      <ul>
        <li>Step-by-step directions</li>
        <li>Photos or videos for key steps (where available)</li>
        <li>Cooking tips and techniques</li>
        <li>Chef's notes</li>
      </ul>

      <h2 id="serving-size">Adjusting Serving Sizes</h2>
      <ol>
        <li>View recipe details</li>
        <li>Find "Servings" field (usually shows default like "4 servings")</li>
        <li>Click to adjust (e.g., change to 2 or 6 servings)</li>
        <li>All ingredient quantities update automatically</li>
        <li>Nutrition facts recalculate per serving</li>
      </ol>

      <h2 id="favorites">Saving Favorite Recipes</h2>

      <h3>Marking Favorites</h3>
      <ol>
        <li>Open any recipe</li>
        <li>Click the heart icon (top-right corner)</li>
        <li>Recipe saved to your favorites list</li>
        <li>Access anytime from <strong>Recipes → My Favorites</strong></li>
      </ol>

      <h3>Organizing Favorites</h3>
      <ul>
        <li><strong>Collections:</strong> Create custom collections (e.g., "Quick Dinners", "Meal Prep Sundays")</li>
        <li><strong>Tags:</strong> Add tags for easy filtering</li>
        <li><strong>Notes:</strong> Add personal notes or modifications</li>
        <li><strong>Rating:</strong> Rate recipes you've tried (1-5 stars)</li>
      </ul>

      <h2 id="shopping-lists">Adding to Shopping Lists</h2>

      <h3>Single Recipe</h3>
      <ol>
        <li>Open recipe details</li>
        <li>Click <strong>"Add to Shopping List"</strong></li>
        <li>Choose existing list or create new</li>
        <li>All ingredients added with correct quantities</li>
        <li>Check off items you already have</li>
      </ol>

      <h3>Multiple Recipes</h3>
      <ol>
        <li>Browse recipes and select checkbox on multiple recipes</li>
        <li>Click <strong>"Add Selected to Shopping List"</strong></li>
        <li>Duplicate ingredients automatically consolidated</li>
        <li>Quantities combined (e.g., 2 cups + 1 cup = 3 cups)</li>
      </ol>

      <p className="text-sm text-gray-600">
        More details: <Link href="/docs/user-guides/shopping" className="text-blue-600 underline">Shopping Lists Guide</Link>
      </p>

      <h2 id="meal-planning">Meal Planning</h2>

      <h3>Weekly Meal Planner</h3>
      <ol>
        <li>Navigate to <strong>Recipes → Meal Planner</strong></li>
        <li>View calendar for the week</li>
        <li>Drag recipes onto days/meals</li>
        <li>Or click day and select recipe from library</li>
        <li>See nutrition totals for each day</li>
      </ol>

      <h3>Meal Plan Features</h3>
      <ul>
        <li><strong>Drag and Drop:</strong> Easy rearranging of meals</li>
        <li><strong>Daily Nutrition Summary:</strong> Track calories and macros</li>
        <li><strong>Generate Shopping List:</strong> One click to create list for entire week</li>
        <li><strong>Repeat Meals:</strong> Copy meals across multiple days</li>
        <li><strong>Meal Prep Indicator:</strong> Identify which meals can batch cook</li>
      </ul>

      <h3>Meal Plan Templates</h3>
      <p>Pre-built meal plans for common goals:</p>
      <ul>
        <li><strong>Weight Loss 1500 Cal:</strong> Calorie-controlled plan</li>
        <li><strong>High Protein Athlete:</strong> For muscle building</li>
        <li><strong>Mediterranean Diet:</strong> Heart-healthy eating</li>
        <li><strong>Keto Week:</strong> Low-carb ketogenic meals</li>
        <li><strong>Family-Friendly:</strong> Kid-approved healthy meals</li>
        <li><strong>Meal Prep Sunday:</strong> Batch cooking for busy weeks</li>
      </ul>

      <h2 id="ai-suggestions">AI Recipe Suggestions</h2>

      <h3>Personalized Recommendations</h3>
      <p>AI suggests recipes based on:</p>
      <ul>
        <li>Your health goals and dietary restrictions</li>
        <li>Ingredients you have in pantry</li>
        <li>Recipes you've liked in the past</li>
        <li>Seasonal produce availability</li>
        <li>Time of day and upcoming meals</li>
        <li>Weather (comfort food on rainy days!)</li>
      </ul>

      <h3>"Use What You Have" Feature</h3>
      <ol>
        <li>Click <strong>"Find Recipes with My Ingredients"</strong></li>
        <li>List ingredients you have available</li>
        <li>AI suggests recipes using those ingredients</li>
        <li>Sorted by fewest additional ingredients needed</li>
        <li>Reduces food waste and saves money</li>
      </ol>

      <h3>Smart Substitutions</h3>
      <p>AI suggests ingredient swaps:</p>
      <ul>
        <li>Healthier alternatives (Greek yogurt for sour cream)</li>
        <li>Allergy-friendly swaps (coconut milk for dairy)</li>
        <li>Budget-friendly options</li>
        <li>What you already have at home</li>
      </ul>

      <h2 id="custom-recipes">Adding Custom Recipes</h2>

      <h3>Manual Entry</h3>
      <ol>
        <li>Go to <strong>Recipes → My Recipes</strong></li>
        <li>Click <strong>"Add Custom Recipe"</strong></li>
        <li>Enter recipe name and description</li>
        <li>Add ingredients with quantities</li>
        <li>Write step-by-step instructions</li>
        <li>Upload photo (optional)</li>
        <li>Enter nutrition info (or let AI estimate)</li>
        <li>Save recipe</li>
      </ol>

      <h3>Import from URL</h3>
      <ol>
        <li>Find recipe on any cooking website</li>
        <li>Copy the URL</li>
        <li>In WPL, click <strong>"Import Recipe from URL"</strong></li>
        <li>Paste URL</li>
        <li>AI extracts ingredients and instructions</li>
        <li>Review and edit if needed</li>
        <li>Save to your recipes</li>
      </ol>

      <h3>From Meal Photo</h3>
      <ol>
        <li>Have a meal photo in your meal log</li>
        <li>Click <strong>"Save as Recipe"</strong> on the meal</li>
        <li>AI reverse-engineers the recipe from photo and analysis</li>
        <li>Edit ingredients and instructions</li>
        <li>Save for future use</li>
      </ol>

      <h2 id="nutrition-analysis">Nutrition Analysis</h2>

      <h3>Recipe Scoring</h3>
      <p>Each recipe receives health scores:</p>
      <ul>
        <li><strong>Overall Health Score:</strong> 1-100 based on nutritional value</li>
        <li><strong>Nutrient Density:</strong> Vitamins/minerals per calorie</li>
        <li><strong>Macro Balance:</strong> Protein/carb/fat ratio</li>
        <li><strong>Processing Level:</strong> NOVA group classification</li>
      </ul>

      <h3>Goal Compatibility</h3>
      <p>See how recipes align with your goals:</p>
      <ul>
        <li>✓ <span className="text-green-600">Excellent fit</span> - Perfect for your goal</li>
        <li>~ <span className="text-yellow-600">Okay fit</span> - Could work with modifications</li>
        <li>✗ <span className="text-red-600">Poor fit</span> - Doesn't align with goals</li>
      </ul>

      <h2 id="sharing">Sharing Recipes</h2>

      <h3>With Family Members</h3>
      <ol>
        <li>Open recipe</li>
        <li>Click <strong>Share</strong> icon</li>
        <li>Select family members</li>
        <li>Add optional message</li>
        <li>Send - recipe appears in their library</li>
      </ol>

      <h3>With Friends</h3>
      <ul>
        <li>Generate shareable link</li>
        <li>Share via text, email, or social media</li>
        <li>Non-WPL users can view recipe (read-only)</li>
        <li>They can sign up to save it</li>
      </ul>

      <h3>Print & Export</h3>
      <ul>
        <li><strong>Print:</strong> Printer-friendly recipe card format</li>
        <li><strong>PDF Export:</strong> Save as PDF to device</li>
        <li><strong>Copy to Clipboard:</strong> Paste into other apps</li>
      </ul>

      <h2 id="cooking-mode">Cooking Mode</h2>
      <p>Hands-free recipe following:</p>

      <h3>Activating Cooking Mode</h3>
      <ol>
        <li>Open recipe</li>
        <li>Click <strong>"Start Cooking"</strong></li>
        <li>Screen switches to cooking mode</li>
        <li>Large text, easy to read from distance</li>
        <li>Step-by-step progression</li>
      </ol>

      <h3>Cooking Mode Features</h3>
      <ul>
        <li><strong>Voice Control:</strong> "Next step" or "Previous step" (if enabled)</li>
        <li><strong>Timers:</strong> Tap to start timer for cooking steps</li>
        <li><strong>Stay Awake:</strong> Screen doesn't dim during cooking</li>
        <li><strong>Large Buttons:</strong> Easy to tap with messy hands</li>
        <li><strong>Ingredient List Always Visible:</strong> Quick reference sidebar</li>
      </ul>

      <h2 id="tips">Recipe & Meal Planning Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Plan on Sunday, Prep on Sunday</p>
            <p className="text-sm text-gray-600 m-0">
              Dedicate time weekly to meal planning and prep. Cook in batches for the week ahead. Reduces stress and improves eating habits.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">♻️</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Ingredient Overlap</p>
            <p className="text-sm text-gray-600 m-0">
              Choose recipes with overlapping ingredients. Buy one bag of spinach, use it in 3 meals. Reduces waste and grocery costs.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Rate Everything</p>
            <p className="text-sm text-gray-600 m-0">
              Rate recipes after trying them. Helps AI suggest better recipes. You'll build a personalized collection of winners.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Rotation Not Repetition</p>
            <p className="text-sm text-gray-600 m-0">
              Find 10-15 recipes you love and rotate them. You don't need infinite variety. Mastering favorites is better than constant experimentation.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Make Notes</p>
            <p className="text-sm text-gray-600 m-0">
              Add notes to recipes with your modifications. "Added extra garlic", "Kids loved this", "Next time double the sauce". Makes repeat cooking easier.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Recipe not found</h3>
      <ul>
        <li>Check spelling in search</li>
        <li>Try broader search terms</li>
        <li>Clear dietary filters (may be too restrictive)</li>
        <li>Use ingredient search instead of recipe name</li>
      </ul>

      <h3>Nutrition info looks wrong</h3>
      <ul>
        <li>Verify serving size is correct</li>
        <li>Check if recipe was modified (custom recipes)</li>
        <li>Report issue if nutrition data is clearly incorrect</li>
        <li>WPL staff reviews and corrects flagged recipes</li>
      </ul>

      <h3>Can't add to shopping list</h3>
      <ul>
        <li>Ensure you have an active shopping list</li>
        <li>Check internet connection</li>
        <li>Try refreshing the page</li>
        <li>Some ingredients may need manual addition</li>
      </ul>

      <h3>Cooking mode not working</h3>
      <ul>
        <li>Enable screen wake lock in browser settings</li>
        <li>Check that device isn't in power saving mode</li>
        <li>Voice control requires microphone permission</li>
        <li>Works best in Chrome or Safari</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/meal-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Meal Tracking →</h3>
          <p className="text-sm text-gray-600">
            Log meals from recipes you cook
          </p>
        </Link>
        <Link
          href="/docs/user-guides/shopping"
          className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Shopping Lists →</h3>
          <p className="text-sm text-gray-600">
            Build shopping lists from your meal plans
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
