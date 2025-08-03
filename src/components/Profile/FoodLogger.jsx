import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { logFoodEntry } from '../../utils/userUtils';
import foodService from '../../services/foodService';
import './FoodLogger.css';

const FoodLogger = ({ onFoodLogged }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    foodName: '',
    quantity: '',
    mealType: 'breakfast'
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [previewNutrition, setPreviewNutrition] = useState(null);

  const handleFoodNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, foodName: value });
    
    if (value.length >= 2) {
      const foodSuggestions = foodService.getFoodSuggestions(value);
      setSuggestions(foodSuggestions);
    } else {
      setSuggestions([]);
    }

    setPreviewNutrition(null);
  };

  const selectSuggestion = (suggestion) => {
    setFormData({ ...formData, foodName: suggestion });
    setSuggestions([]);
    updatePreview(suggestion, formData.quantity);
  };

  const handleQuantityChange = (e) => {
    const quantity = e.target.value;
    setFormData({ ...formData, quantity });
    updatePreview(formData.foodName, quantity);
  };

  const updatePreview = (foodName, quantity) => {
    if (foodName && quantity) {
      const nutrition = foodService.calculateNutrition(foodName, parseInt(quantity));
      setPreviewNutrition(nutrition);
    } else {
      setPreviewNutrition(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const result = await logFoodEntry(currentUser.uid, formData);
      
      if (result.success) {
        setResult(result);
        setFormData({ foodName: '', quantity: '', mealType: 'breakfast' });
        setPreviewNutrition(null);
        
        // Call the callback to refresh dashboard data
        if (onFoodLogged) {
          onFoodLogged();
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to log food entry');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="food-logger">
      <h2>Log Your Meal</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="foodName">Food Name</label>
          <input
            type="text"
            id="foodName"
            value={formData.foodName}
            onChange={handleFoodNameChange}
            placeholder="Start typing food name... (e.g., Rice, Dal, Roti)"
            required
          />
          
          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className="suggestion-item"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="quantity">Quantity (grams)</label>
          <input
            type="number"
            id="quantity"
            value={formData.quantity}
            onChange={handleQuantityChange}
            placeholder="100"
            min="1"
            required
          />
        </div>

        {previewNutrition && (
          <div className="nutrition-preview">
            <h4>Nutrition Preview:</h4>
            <div className="nutrition-grid">
              <span>Calories: {previewNutrition.calories}</span>
              <span>Carbs: {previewNutrition.carbs}g</span>
              <span>Protein: {previewNutrition.protein}g</span>
              <span>Fat: {previewNutrition.fat}g</span>
              <span>Sugar: {previewNutrition.sugar}g</span>
              <span>Fiber: {previewNutrition.fiber}g</span>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="mealType">Meal Type</label>
          <select
            id="mealType"
            value={formData.mealType}
            onChange={(e) => setFormData({...formData, mealType: e.target.value})}
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging...' : 'Log Food'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}
      
      {result && (
        <div className="success-message">
          <h3>Food Logged Successfully! 🎉</h3>
          <div className="nutrition-info">
            <p><strong>Nutrition Added:</strong></p>
            <div className="nutrition-grid">
              <span>Calories: {result.nutritionData.calories}</span>
              <span>Carbs: {result.nutritionData.carbs}g</span>
              <span>Protein: {result.nutritionData.protein}g</span>
              <span>Fat: {result.nutritionData.fat}g</span>
              <span>Sugar: {result.nutritionData.sugar}g</span>
              <span>Fiber: {result.nutritionData.fiber}g</span>
            </div>
            <div className="points-info">
              <p><strong>Points Earned:</strong> +{result.pointsEarned} points</p>
              <p><strong>Current Streak:</strong> {result.currentStreak} days</p>
            </div>
          </div>
        </div>
      )}

      <div className="diabetic-suggestions">
        <h3>💡 Diabetic-Friendly Foods</h3>
        <div className="suggestions-grid">
          {foodService.getDiabeticFriendlyFoods(6).map((food, index) => (
            <div 
              key={index} 
              className="suggestion-card"
              onClick={() => setFormData({...formData, foodName: food.name})}
            >
              <div className="food-name">{food.name}</div>
              <div className="food-stats">
                <small>{food.calories} cal • {food.fiber}g fiber</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FoodLogger;
