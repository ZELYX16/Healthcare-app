import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUserDocument } from "../utils/userUtils";





// Circular Meter Component
const CircularMeter = ({
  value,
  max,
  label,
  color = "#3b82f6",
  size = 120,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${
    (percentage / 100) * circumference
  } ${circumference}`;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="15"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          style={{
            transition: "stroke-dasharray 0.3s ease",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}>
        <div style={{ fontSize: "20px", fontWeight: "bold", color }}>
          {value}
        </div>
        <div style={{ fontSize: "12px", color: "#666" }}>{label}</div>
      </div>
    </div>
  );
};


const FloatingPlusButton = ({ onClick, size = 60, color = "#10b981" }) => {
  const [isHovered, setIsHovered] = useState(false);

  const fabStyle = {
    position: "fixed",
    bottom: "2rem",
    right: "2rem",
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundColor: color,
    color: "white",
    border: "none",
    fontSize: size / 2.5,
    fontWeight: "300",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: isHovered
      ? "0 8px 20px rgba(0, 0, 0, 0.2)"
      : "0 6px 12px rgba(0, 0, 0, 0.15)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    transform: isHovered ? "scale(1.1)" : "scale(1)",
    zIndex: 1000,
    outline: "none",
  };

  return (
    <button
      style={fabStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Add new meal"
      title="Add new meal">
      +
    </button>
  );
};




const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data has been loaded
  const navigate = useNavigate();

  const handleAddMeal = () => {
    navigate("/add-meal");
  };

  // Dynamic metrics based on user data - only nutrition metrics
  const [metrics, setMetrics] = useState({
    calories: { current: 0, max: 2000, color: "#3b82f6" },
    carbs: { current: 0, max: 300, color: "#f59e0b" },
    protein: { current: 0, max: 150, color: "#10b981" },
    fat: { current: 0, max: 80, color: "#ef4444" },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      // Wait for currentUser to be defined (not null or undefined)
      if (currentUser === null) {
        // User is not authenticated, redirect to login
        navigate("/login");
        return;
      }

      if (currentUser === undefined) {
        // Still loading authentication state
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching user data for:", currentUser.uid);

        const userDoc = await getUserDocument(currentUser.uid);
        setUserData(userDoc);
        setDataLoaded(true);
        console.log("User document:", userDoc);

        // Check if user needs to complete profile FIRST
        if (!userDoc || userDoc.hasProfile === false) {
          console.log(
            "Redirecting to profile - hasProfile:",
            userDoc?.hasProfile
          );
          navigate("/profile");
          return;
        }

        // Update metrics from user data only if user has completed profile
        if (userDoc) {
          setMetrics((prev) => ({
            calories: {
              ...prev.calories,
              current: userDoc.currentCalories || 0,
              max: userDoc.dailyCalories || 2000,
            },
            carbs: {
              ...prev.carbs,
              current: userDoc.currentCarbs || 0,
              max: userDoc.targetCarbs || 300,
            },
            protein: {
              ...prev.protein,
              current: userDoc.currentProtein || 0,
              max: userDoc.targetProtein || 150,
            },
            fat: {
              ...prev.fat,
              current: userDoc.currentFat || 0,
              max: userDoc.targetFat || 80,
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, navigate]); // Re-run when currentUser changes

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

  // Show loading spinner while authentication is being determined
  if (currentUser === undefined || loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
        }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "2rem",
              marginBottom: "1rem",
              animation: "spin 1s linear infinite",
            }}>
            ⏳
          </div>
          <p style={{ color: "#6b7280" }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if user is not authenticated
  if (!currentUser) {
    return null; // Will redirect to login in useEffect
  }

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      }}>
      {/* Your existing JSX content remains the same */}
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #e5e7eb",
        }}>
        <div>
          <h1 style={{ margin: 0, color: "#111827" }}>Nutrition Dashboard</h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
            Hello, {currentUser?.displayName || currentUser?.email}!
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleProfileClick}
            style={{
              background: "#4f46e5",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}>
            Profile
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}>
            Logout
          </button>
        </div>
      </header>

      {/* Leaderboard Section */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "2rem",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          color: "white",
          marginBottom: "1rem",
        }}
        onClick={() => navigate("/leaderboard")}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-3px)";
          e.target.style.boxShadow = "0 8px 15px rgba(102, 126, 234, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        }}>
        <div style={{ marginBottom: "1rem" }}>
          <span style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>🏆</span>
        </div>
        <h2
          style={{
            color: "white",
            marginBottom: "1rem",
            margin: 0,
            fontSize: "2rem",
          }}>
          Leaderboard
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.9)",
            marginBottom: "1.5rem",
            fontSize: "16px",
          }}>
          Compete with others and climb the ranks!
        </p>
      </div>

      {/* Nutrition Metrics Dashboard */}
      <div
        style={{
          display: "flex",
          gap: "2rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}>
        {/* Daily Calories */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: "1.5rem",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            flex: "3",
            minWidth: "250px",
          }}>
          <h3 style={{ margin: "0 0 1rem 0", color: "#374151" }}>
            Daily Calories
          </h3>
          <CircularMeter
            value={metrics.calories.current}
            max={metrics.calories.max}
            label="kcal"
            color={metrics.calories.color}
            size={150}
          />
          <p style={{ fontSize: "18px", color: "#666", marginTop: "0.5rem" }}>
            {metrics.calories.current} / {metrics.calories.max} kcal
          </p>
        </div>

        {/* Carbohydrates */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: "1.5rem",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            flex: "1",
            minWidth: "250px",
          }}>
          <h3 style={{ margin: "0 0 1rem 0", color: "#374151" }}>
            Carbohydrates
          </h3>
          <CircularMeter
            value={metrics.carbs.current}
            max={metrics.carbs.max}
            label="g"
            color={metrics.carbs.color}
            size={150}
          />
          <p style={{ fontSize: "18px", color: "#666", marginTop: "0.5rem" }}>
            {metrics.carbs.current} / {metrics.carbs.max}g
          </p>
        </div>

        {/* Protein */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: "1.5rem",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            flex: "1",
            minWidth: "250px",
          }}>
          <h3 style={{ margin: "0 0 1rem 0", color: "#374151" }}>Protein</h3>
          <CircularMeter
            value={metrics.protein.current}
            max={metrics.protein.max}
            label="g"
            color={metrics.protein.color}
            size={150}
          />
          <p style={{ fontSize: "18px", color: "#666", marginTop: "0.5rem" }}>
            {metrics.protein.current} / {metrics.protein.max}g
          </p>
        </div>

        {/* Fat */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: "1.5rem",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            flex: "1",
            minWidth: "250px",
          }}>
          <h3 style={{ margin: "0 0 1rem 0", color: "#374151" }}>Fat</h3>
          <CircularMeter
            value={metrics.fat.current}
            max={metrics.fat.max}
            label="g"
            color={metrics.fat.color}
            size={150}
          />
          <p style={{ fontSize: "18px", color: "#666", marginTop: "0.5rem" }}>
            {metrics.fat.current} / {metrics.fat.max}g
          </p>
        </div>
      </div>

      <FloatingPlusButton onClick={handleAddMeal} size={60} color="#10b981" />
    </div>
  );
};

export default Dashboard;
