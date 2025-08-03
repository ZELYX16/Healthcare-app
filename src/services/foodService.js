import foodDatabase from '../data/foodDatabase.json';

class FoodService {
  constructor() {
    this.foodDatabase = foodDatabase;
    console.log(`Loaded ${this.foodDatabase.length} Indian food items`);
  }

  findFood(foodName) {
    if (!foodName) return null;
    
    const searchTerm = foodName.toLowerCase().trim();
    
    // Exact match first
    let food = this.foodDatabase.find(item => 
      item.name?.toLowerCase() === searchTerm
    );
    
    // Partial match with Indian food names
    if (!food) {
      food = this.foodDatabase.find(item => {
        const itemName = item.name?.toLowerCase();
        return itemName?.includes(searchTerm) || 
               searchTerm.includes(itemName) ||
               // Check for Hindi names in parentheses
               this.matchesHindiName(itemName, searchTerm);
      });
    }
    
    // Fuzzy search for common variations
    if (!food) {
      food = this.foodDatabase.find(item => {
        const itemName = item.name?.toLowerCase();
        const words = searchTerm.split(' ');
        return words.some(word => itemName?.includes(word) && word.length > 2);
      });
    }
    
    return food;
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
    if (!food) return null;
    
    // Calculate proportionally (your dataset is per 100g)
    const multiplier = quantityInGrams / 100;
    
    return {
      foodName: food.name,
      quantity: quantityInGrams,
      calories: Math.round((food.calories * multiplier) * 100) / 100,
      carbs: Math.round((food.carbohydrates * multiplier) * 100) / 100,
      protein: Math.round((food.protein * multiplier) * 100) / 100,
      fat: Math.round((food.fat * multiplier) * 100) / 100,
      sugar: Math.round((food.sugar * multiplier) * 100) / 100,
      fiber: Math.round((food.fiber * multiplier) * 100) / 100,
      sodium: Math.round((food.sodium * multiplier) * 100) / 100,
    };
  }

  searchFoods(query, limit = 10) {
    if (!query || query.length < 2) return [];
    
    const searchTerm = query.toLowerCase().trim();
    const results = [];
    
    // Add matches
    const matches = this.foodDatabase.filter(item => {
      const itemName = item.name?.toLowerCase();
      return itemName?.includes(searchTerm) || 
             this.matchesHindiName(itemName, searchTerm);
    });
    
    results.push(...matches.slice(0, limit));
    
    return results.map(item => ({
      name: item.name,
      calories: item.calories,
      carbs: item.carbohydrates,
      protein: item.protein,
      fat: item.fat,
      sugar: item.sugar,
      fiber: item.fiber
    }));
  }

  getFoodSuggestions(partialName) {
    if (!partialName || partialName.length < 2) return [];
    
    const searchTerm = partialName.toLowerCase();
    
    return this.foodDatabase
      .filter(item => {
        const itemName = item.name?.toLowerCase();
        return itemName?.startsWith(searchTerm) ||
               this.matchesHindiName(itemName, searchTerm);
      })
      .slice(0, 8)
      .map(item => item.name);
  }

  // Get diabetic-friendly foods (low sugar, high fiber)
  getDiabeticFriendlyFoods(limit = 20) {
    return this.foodDatabase
      .filter(item => item.sugar <= 5 && item.fiber >= 2)
      .sort((a, b) => b.fiber - a.fiber)
      .slice(0, limit)
      .map(item => ({
        name: item.name,
        calories: item.calories,
        carbs: item.carbohydrates,
        fiber: item.fiber,
        sugar: item.sugar
      }));
  }
}

export default new FoodService();
