import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUserDocument } from "../utils/userUtils";
import Profile from "../components/Profile/Profile";

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser?.uid) {
        const userDoc = await getUserDocument(currentUser.uid);
        setUserData(userDoc);
        console.log("User document:", userDoc); // Debug log
        if (userDoc && userDoc.hasProfile === false) {
          navigate("/profile");
        }
      }
    };
    fetchUserData();
  }, [currentUser, navigate]);

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
  if (!userData) {
    return <div>Loading...</div>;
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
            <h1 style={{ margin: 0, color: "#111827" }}>
              Welcome to your Dashboard
            </h1>
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

        <div
          style={{
            background: "#f9fafb",
            padding: "2rem",
            borderRadius: "8px",
            textAlign: "center",
          }}>
          <h2 style={{ color: "#374151", marginBottom: "1rem" }}>
            🎉 Authentication Successful!
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            Your React + Vite + Firebase app is now ready. Start building your
            amazing features here!
          </p>

          <div
            style={{
              background: "white",
              padding: "1rem",
              borderRadius: "6px",
              display: "inline-block",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
              <strong>User ID:</strong> {currentUser?.uid}
            </p>
          </div>
        </div>
      </div>
    );
};

export default Dashboard;
