import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUserDocument, getDailyProgress } from "../utils/userUtils";
import FoodLogger from "../components/Profile/FoodLogger";
// import BloodSugarLogger from "../components/BloodSugarLogger/BloodSugarLogger";
import Leaderboard from "../components/Profile/LeaderBoard";
import "./Dashboard.css";

// Circular Meter Component
const CircularMeter = ({ value, max, label, color = "#3b82f6", size = 120 }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="circular-meter" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="circular-meter-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="progress-circle"
        />
      </svg>
      <div className="meter-content">
        <div className="meter-value">{value}</div>
        <div className="meter-max">/ {max}</div>
        <div className="meter-label">{label}</div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [dailyProgress, setDailyProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Metrics state with default values
  const [metrics, setMetrics] = useState({
    calories: { current: 0, max: 1800 },
    carbs: { current: 0, max: 200 },
    protein: { current: 0, max: 150 },
    fat: { current: 0, max: 60 },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser?.uid) {
        try {
          const userDoc = await getUserDocument(currentUser.uid);
          setUserData(userDoc);
          console.log("User document:", userDoc);
          
          if (userDoc && userDoc.hasProfile === false) {
            navigate("/profile");
            return;
          }
          
          // Fetch daily progress and update metrics
          const progress = await getDailyProgress(currentUser.uid);
          setDailyProgress(progress);
          
          if (progress) {
            setMetrics({
              calories: { 
                current: Math.round(progress.consumed.consumedCalories || userDoc?.currentCalories || 0), 
                max: Math.round(progress.targets.targetCalories || userDoc?.dailyCalories || 1800) 
              },
              carbs: { 
                current: Math.round(progress.consumed.consumedCarbs || userDoc?.consumedCarbs || 0), 
                max: Math.round(progress.targets.targetCarbs || userDoc?.targetCarbs || 200) 
              },
              protein: { 
                current: Math.round(progress.consumed.consumedProtein || userDoc?.consumedProtein || 0), 
                max: Math.round(progress.targets.targetProtein || userDoc?.targetProtein || 150) 
              },
              fat: { 
                current: Math.round(progress.consumed.consumedFat || userDoc?.consumedFat || 0), 
                max: Math.round(progress.targets.targetFat || userDoc?.targetFat || 60) 
              },
            });
          } else if (userDoc) {
            // Use user's targets if no progress data
            setMetrics({
              calories: { current: 0, max: userDoc.dailyCalories || 1800 },
              carbs: { current: 0, max: userDoc.targetCarbs || 200 },
              protein: { current: 0, max: userDoc.targetProtein || 150 },
              fat: { current: 0, max: userDoc.targetFat || 60 },
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserData();
  }, [currentUser, navigate]);

  // Function to refresh data after food logging
  const handleFoodLogged = async () => {
    if (currentUser?.uid) {
      try {
        const progress = await getDailyProgress(currentUser.uid);
        const userDoc = await getUserDocument(currentUser.uid);
        
        setDailyProgress(progress);
        setUserData(userDoc);
        
        if (progress) {
          setMetrics({
            calories: { 
              current: Math.round(progress.consumed.consumedCalories || 0), 
              max: Math.round(progress.targets.targetCalories || 1800) 
            },
            carbs: { 
              current: Math.round(progress.consumed.consumedCarbs || 0), 
              max: Math.round(progress.targets.targetCarbs || 200) 
            },
            protein: { 
              current: Math.round(progress.consumed.consumedProtein || 0), 
              max: Math.round(progress.targets.targetProtein || 150) 
            },
            fat: { 
              current: Math.round(progress.consumed.consumedFat || 0), 
              max: Math.round(progress.targets.targetFat || 60) 
            },
          });
        }
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="overview-content">
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-info">
                  <div className="stat-value">{userData?.currentPoints || 0}</div>
                  <div className="stat-label">Points</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <div className="stat-value">{userData?.dailyStreak || 0}</div>
                  <div className="stat-label">Day Streak</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🍽️</div>
                <div className="stat-info">
                  <div className="stat-value">{dailyProgress?.mealsLogged?.length || 0}</div>
                  <div className="stat-label">Meals Today</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <div className="stat-value">{userData?.targetFbs || 100}</div>
                  <div className="stat-label">FBS Target</div>
                </div>
              </div>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <CircularMeter
                  value={metrics.calories.current}
                  max={metrics.calories.max}
                  label="Calories"
                  color="#ef4444"
                  size={120}
                />
                <div className="metric-details">
                  <p>{metrics.calories.current} / {metrics.calories.max} kcal</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill calories-fill"
                      style={{ width: `${Math.min((metrics.calories.current / metrics.calories.max) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <CircularMeter
                  value={metrics.carbs.current}
                  max={metrics.carbs.max}
                  label="Carbs"
                  color="#f59e0b"
                  size={120}
                />
                <div className="metric-details">
                  <p>{metrics.carbs.current} / {metrics.carbs.max}g</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill carbs-fill"
                      style={{ width: `${Math.min((metrics.carbs.current / metrics.carbs.max) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <CircularMeter
                  value={metrics.protein.current}
                  max={metrics.protein.max}
                  label="Protein"
                  color="#10b981"
                  size={120}
                />
                <div className="metric-details">
                  <p>{metrics.protein.current} / {metrics.protein.max}g</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill protein-fill"
                      style={{ width: `${Math.min((metrics.protein.current / metrics.protein.max) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <CircularMeter
                  value={metrics.fat.current}
                  max={metrics.fat.max}
                  label="Fat"
                  color="#8b5cf6"
                  size={120}
                />
                <div className="metric-details">
                  <p>{metrics.fat.current} / {metrics.fat.max}g</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill fat-fill"
                      style={{ width: `${Math.min((metrics.fat.current / metrics.fat.max) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <button 
                className="quick-action-btn primary"
                onClick={() => setActiveTab('food')}
              >
                🍽️ Log Food
              </button>
              <button 
                className="quick-action-btn secondary"
                onClick={() => setActiveTab('bloodSugar')}
              >
                🩸 Log Blood Sugar
              </button>
              <button 
                className="quick-action-btn tertiary"
                onClick={() => setActiveTab('progress')}
              >
                📊 View Progress
              </button>
            </div>

            {/* Today's Summary */}
            {dailyProgress && dailyProgress.mealsLogged && dailyProgress.mealsLogged.length > 0 && (
              <div className="today-summary">
                <h3>Today's Meals</h3>
                <div className="meals-preview">
                  {dailyProgress.mealsLogged.slice(0, 3).map((meal, index) => (
                    <div key={index} className="meal-preview-item">
                      <div className="meal-preview-info">
                        <span className="meal-name">{meal.foodName}</span>
                        <span className="meal-type">{meal.mealType}</span>
                      </div>
                      <div className="meal-preview-stats">
                        <span>{Math.round(meal.calories)} cal</span>
                      </div>
                    </div>
                  ))}
                  {dailyProgress.mealsLogged.length > 3 && (
                    <div className="more-meals">
                      +{dailyProgress.mealsLogged.length - 3} more meals
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case "food":
        return (
          <div className="food-tab-content">
            <FoodLogger onFoodLogged={handleFoodLogged} />
          </div>
        );

      case "bloodSugar":
        return (
          <div className="blood-sugar-tab-content">
            <BloodSugarLogger />
          </div>
        );

      case "progress":
        return (
          <div className="progress-content">
            <h3>📊 Detailed Progress</h3>
            {dailyProgress && (
              <div className="progress-details">
                <div className="daily-summary">
                  <h4>Today's Summary</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Meals Logged</span>
                      <span className="summary-value">{dailyProgress.mealsLogged?.length || 0}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Current Streak</span>
                      <span className="summary-value">{userData?.dailyStreak || 0} days</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Points Today</span>
                      <span className="summary-value">{userData?.currentPoints || 0}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Calories Remaining</span>
                      <span className="summary-value">{Math.max(0, metrics.calories.max - metrics.calories.current)}</span>
                    </div>
                  </div>
                </div>
                
                {dailyProgress.mealsLogged && dailyProgress.mealsLogged.length > 0 && (
                  <div className="meals-list">
                    <h4>Today's Meals</h4>
                    {dailyProgress.mealsLogged.map((meal, index) => (
                      <div key={index} className="meal-item">
                        <div className="meal-info">
                          <span className="meal-name">{meal.foodName}</span>
                          <span className="meal-type">{meal.mealType}</span>
                          <span className="meal-time">{new Date(meal.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="meal-nutrition">
                          <span>{Math.round(meal.calories)} cal</span>
                          <span>{Math.round(meal.carbs)}g carbs</span>
                          <span>{Math.round(meal.protein)}g protein</span>
                          <span>{Math.round(meal.fat)}g fat</span>
                        </div>
                        <div className="meal-points">
                          +{meal.pointsEarned} pts
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progressive Targets Info */}
                {dailyProgress.progressInfo && (
                  <div className="targets-info">
                    <h4>🎯 Your Progressive Targets</h4>
                    <div className="targets-grid">
                      <div className="target-item">
                        <span className="target-label">Current FBS Target</span>
                        <span className="target-value">{dailyProgress.progressInfo.currentTargetFbs} mg/dL</span>
                      </div>
                      <div className="target-item">
                        <span className="target-label">Current PPBS Target</span>
                        <span className="target-value">{dailyProgress.progressInfo.currentTargetPpbs} mg/dL</span>
                      </div>
                      <div className="target-item">
                        <span className="target-label">Initial FBS</span>
                        <span className="target-value">{dailyProgress.progressInfo.initialFbs} mg/dL</span>
                      </div>
                      <div className="target-item">
                        <span className="target-label">Initial PPBS</span>
                        <span className="target-value">{dailyProgress.progressInfo.initialPpbs} mg/dL</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {(!dailyProgress || !dailyProgress.mealsLogged || dailyProgress.mealsLogged.length === 0) && (
              <div className="no-progress">
                <h4>No meals logged today</h4>
                <p>Start by logging your first meal to see your progress!</p>
                <button 
                  className="start-logging-btn"
                  onClick={() => setActiveTab('food')}
                >
                  🍽️ Log Your First Meal
                </button>
              </div>
            )}
          </div>
        );

      case "leaderboard":
        return (
          <div className="leaderboard-tab-content">
            <Leaderboard />
          </div>
        );

      default:
        return (
          <div className="overview-content">
            <p>Select a tab to view content</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="dashboard-error">
        <h2>Unable to load dashboard</h2>
        <p>Please try refreshing the page</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Welcome back, {userData.fullName || currentUser.displayName || 'User'}! 👋</h1>
          <p>Track your meals and manage your diabetes journey</p>
        </div>
        <div className="header-actions">
          <button onClick={handleProfileClick} className="profile-btn">
            👤 Profile
          </button>
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button
          className={`tab ${activeTab === "food" ? "active" : ""}`}
          onClick={() => setActiveTab("food")}
        >
          🍽️ Log Food
        </button>
        <button
          className={`tab ${activeTab === "bloodSugar" ? "active" : ""}`}
          onClick={() => setActiveTab("bloodSugar")}
        >
          🩸 Blood Sugar
        </button>
        <button
          className={`tab ${activeTab === "progress" ? "active" : ""}`}
          onClick={() => setActiveTab("progress")}
        >
          📈 Progress
        </button>
        <button
          className={`tab ${activeTab === "leaderboard" ? "active" : ""}`}
          onClick={() => setActiveTab("leaderboard")}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Dashboard;
