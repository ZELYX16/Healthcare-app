import foodDatabase from '../data/foodDatabase.json';

class FoodService {
  constructor() {
    this.foodDatabase = foodDatabase;
    console.log(`Loaded ${this.foodDatabase.length} Indian food items`);
    if (this.foodDatabase.length > 0) {
      console.log('Sample food item structure:', this.foodDatabase[0]);
    }
  }

  findFood(foodName) {
    if (!foodName) return null;
    
    const searchTerm = foodName.toLowerCase().trim();
    console.log('Searching for:', searchTerm);
    let food = this.foodDatabase.find(item => 
      item["Dish Name"]?.toLowerCase() === searchTerm
    );
    
    if (food) {
      console.log('Found exact match:', food["Dish Name"]);
      return food;
    }
    
    food = this.foodDatabase.find(item => {
      const itemName = item["Dish Name"]?.toLowerCase();
      const matches = itemName?.includes(searchTerm) || 
                     searchTerm.includes(itemName) ||
                     this.matchesHindiName(itemName, searchTerm);
      
      if (matches) {
        console.log('Found partial match:', item["Dish Name"]);
      }
      return matches;
    });
    
    if (food) return food;
    
    food = this.foodDatabase.find(item => {
      const itemName = item["Dish Name"]?.toLowerCase();
      const words = searchTerm.split(' ');
      return words.some(word => itemName?.includes(word) && word.length > 2);
    });
    
    if (food) {
      console.log('Found fuzzy match:', food["Dish Name"]);
      return food;
    }
    
    console.log('No food found for:', searchTerm);
    return null;
  }

  matchesHindiName(itemName, searchTerm) {
    if (!itemName?.includes('(')) return false;
    
    const hindiPart = itemName.match(/\(([^)]+)\)/);
    if (hindiPart && hindiPart[1]) {
      const hindiNames = hindiPart[1].toLowerCase().split('/');
      return hindiNames.some(name => 
        name.trim().includes(searchTerm) || 
        searchTerm.includes(name.trim())
      );
    }
    return false;
  }

  calculateNutrition(foodName, quantityInGrams) {
    const food = this.findFood(foodName);
    if (!food) {
      console.log('Food not found for nutrition calculation:', foodName);
      return null;
    }
    
    console.log('Calculating nutrition for:', food["Dish Name"]);
    
    const multiplier = quantityInGrams / 100;
    
    return {
      foodName: food["Dish Name"],
      quantity: quantityInGrams,
      calories: Math.round((food["Calories (kcal)"] * multiplier) * 100) / 100,
      carbs: Math.round((food["Carbohydrates (g)"] * multiplier) * 100) / 100,
      protein: Math.round((food["Protein (g)"] * multiplier) * 100) / 100,
      fat: Math.round((food["Fats (g)"] * multiplier) * 100) / 100,
      sugar: Math.round((food["Free Sugar (g)"] * multiplier) * 100) / 100,
      fiber: Math.round((food["Fibre (g)"] * multiplier) * 100) / 100,
      sodium: Math.round((food["Sodium (mg)"] * multiplier) * 100) / 100,
    };
  }

  searchFoods(query, limit = 10) {
    if (!query || query.length < 2) return [];
    
    const searchTerm = query.toLowerCase().trim();
    const results = [];
    
    const matches = this.foodDatabase.filter(item => {
      const itemName = item["Dish Name"]?.toLowerCase();
      return itemName?.includes(searchTerm) || 
             this.matchesHindiName(itemName, searchTerm);
    });
    
    results.push(...matches.slice(0, limit));
    
    return results.map(item => ({
      name: item["Dish Name"],
      calories: item["Calories (kcal)"],
      carbs: item["Carbohydrates (g)"],
      protein: item["Protein (g)"],
      fat: item["Fats (g)"],
      sugar: item["Free Sugar (g)"],
      fiber: item["Fibre (g)"]
    }));
  }

  getFoodSuggestions(partialName) {
    if (!partialName || partialName.length < 2) return [];
    
    const searchTerm = partialName.toLowerCase();
    
    return this.foodDatabase
      .filter(item => {
        const itemName = item["Dish Name"]?.toLowerCase();
        return itemName?.startsWith(searchTerm) ||
               itemName?.includes(searchTerm) ||
               this.matchesHindiName(itemName, searchTerm);
      })
      .slice(0, 8)
      .map(item => item["Dish Name"]);
  }

  getDiabeticFriendlyFoods(limit = 20) {
    return this.foodDatabase
      .filter(item => (item["Free Sugar (g)"] || 0) <= 5 && (item["Fibre (g)"] || 0) >= 2)
      .sort((a, b) => (b["Fibre (g)"] || 0) - (a["Fibre (g)"] || 0))
      .slice(0, limit)
      .map(item => ({
        name: item["Dish Name"],
        calories: item["Calories (kcal)"],
        carbs: item["Carbohydrates (g)"],
        fiber: item["Fibre (g)"],
        sugar: item["Free Sugar (g)"]
      }));
  }

  debugDatabase() {
    console.log('Total foods in database:', this.foodDatabase.length);
    console.log('First 5 foods:', this.foodDatabase.slice(0, 5).map(item => item["Dish Name"]));
    
    if (this.foodDatabase.length > 0) {
      const firstItem = this.foodDatabase[0];
      console.log('Available fields:', Object.keys(firstItem));
    }
  }
}

export default new FoodService();
