import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "./MedicalHistory.css";

const MedicalHistory = ({ isOnboarding = false }) => {
  const { currentUser, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Diabetes Information
    diabetesType: "",
    hba1cLevel: "",
    fastingBloodSugar: "",
    postprandialSugar: "",
    insulinMedicationStatus: "",

    // Health Information
    existingHealthConditions: "",
    allergies: "",
    preferredDietType: "",

    // Personal Information
    age: "",
    gender: "",
    height: "",
    weight: "",
    bmi: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMedicalData = async () => {
      if (currentUser && !isOnboarding) {
        try {
          const medicalDoc = await getDoc(
            doc(db, "medicalHistory", currentUser.uid)
          );
          if (medicalDoc.exists()) {
            const medicalData = medicalDoc.data();
            setFormData((prev) => ({
              ...prev,
              ...medicalData,
            }));
          }
        } catch (error) {
          console.error("Error loading medical data:", error);
        }
      }
    };

    loadMedicalData();
  }, [currentUser, isOnboarding]);

  useEffect(() => {
    if (formData.height && formData.weight) {
      const heightInMeters = parseFloat(formData.height) / 100;
      const weightInKg = parseFloat(formData.weight);

      if (heightInMeters > 0 && weightInKg > 0) {
        const bmiValue = (
          weightInKg /
          (heightInMeters * heightInMeters)
        ).toFixed(1);
        setFormData((prev) => ({
          ...prev,
          bmi: bmiValue,
        }));
      }
    }
  }, [formData.height, formData.weight]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  //BMI Change
  const getBMICategory = (bmi) => {
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { category: "Underweight", color: "#3b82f6" };
    if (bmiValue < 25) return { category: "Normal weight", color: "#10b981" };
    if (bmiValue < 30) return { category: "Overweight", color: "#f59e0b" };
    return { category: "Obese", color: "#ef4444" };
  };

  const validateForm = () => {
    const requiredFields = [
      "diabetesType",
      "age",
      "gender",
      "height",
      "weight",
    ];
    const missingFields = requiredFields.filter((field) => !formData[field]);

    if (missingFields.length > 0) {
      setError("Please fill in all required fields.");
      return false;
    }

    if (formData.age < 1 || formData.age > 120) {
      setError("Please enter a valid age between 1 and 120.");
      return false;
    }

    if (formData.height < 50 || formData.height > 300) {
      setError("Please enter a valid height between 50 and 300 cm.");
      return false;
    }

    if (formData.weight < 20 || formData.weight > 500) {
      setError("Please enter a valid weight between 20 and 500 kg.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await setDoc(
        doc(db, "medicalHistory", currentUser.uid),
        {
          ...formData,
          userId: currentUser.uid,
          createdAt: isOnboarding ? new Date() : undefined,
          updatedAt: new Date(),
        },
        { merge: !isOnboarding }
      );

      if (isOnboarding) {
        await completeOnboarding();
        setMessage(
          "Welcome! Your medical history has been saved successfully."
        );
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } else {
        setMessage("Medical history updated successfully!");
      }
    } catch (error) {
      setError("Failed to save medical history. Please try again.");
      console.error("Medical history save error:", error);
    }

    setLoading(false);
  };

  const handleSkipForNow = async () => {
    if (isOnboarding) {
      try {
        await completeOnboarding();
        navigate("/dashboard");
      } catch (error) {
        console.error("Error skipping onboarding:", error);
      }
    }
  };

  return (
    <div className="medical-container">
      <div className="medical-card">
        <div className="medical-header">
          <h2>
            {isOnboarding
              ? "Welcome! Complete Your Medical Profile"
              : "Medical History"}
          </h2>
          <p>
            {isOnboarding
              ? "Help us provide you with personalized health recommendations by sharing your medical information"
              : "Please provide your medical information for better health tracking"}
          </p>
          {isOnboarding && (
            <div className="onboarding-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "100%" }}></div>
              </div>
              <span className="progress-text">
                Step 1 of 1 - Medical Information
              </span>
            </div>
          )}
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="medical-form">
          <div className="form-section">
            <h3>🩺 Diabetes Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="diabetesType">
                  Diabetes Type <span className="required">*</span>
                </label>
                <select
                  id="diabetesType"
                  name="diabetesType"
                  value={formData.diabetesType}
                  onChange={handleInputChange}
                  className="form-select"
                  required>
                  <option value="">Select diabetes type</option>
                  <option value="type1">Type 1 Diabetes</option>
                  <option value="type2">Type 2 Diabetes</option>
                  <option value="gestational">Gestational Diabetes</option>
                  <option value="prediabetes">Prediabetes</option>
                  <option value="none">No Diabetes</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="hba1cLevel">Current HbA1c Level (%)</label>
                <input
                  id="hba1cLevel"
                  type="number"
                  name="hba1cLevel"
                  value={formData.hba1cLevel}
                  onChange={handleInputChange}
                  placeholder="e.g., 7.2"
                  step="0.1"
                  min="4"
                  max="15"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fastingBloodSugar">
                  Fasting Blood Sugar (mg/dL)
                </label>
                <input
                  id="fastingBloodSugar"
                  type="number"
                  name="fastingBloodSugar"
                  value={formData.fastingBloodSugar}
                  onChange={handleInputChange}
                  placeholder="e.g., 120"
                  min="50"
                  max="500"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="postprandialSugar">
                  Post-meal Blood Sugar (mg/dL)
                </label>
                <input
                  id="postprandialSugar"
                  type="number"
                  name="postprandialSugar"
                  value={formData.postprandialSugar}
                  onChange={handleInputChange}
                  placeholder="e.g., 180"
                  min="50"
                  max="500"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="insulinMedicationStatus">
                Insulin/Medication Status
              </label>
              <select
                id="insulinMedicationStatus"
                name="insulinMedicationStatus"
                value={formData.insulinMedicationStatus}
                onChange={handleInputChange}
                className="form-select">
                <option value="">Select medication status</option>
                <option value="insulin-only">Insulin Only</option>
                <option value="oral-medication">Oral Medication Only</option>
                <option value="insulin-and-oral">
                  Insulin + Oral Medication
                </option>
                <option value="diet-exercise">Diet & Exercise Only</option>
                <option value="none">No Medication</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>🏥 Health Conditions</h3>

            <div className="form-group">
              <label htmlFor="existingHealthConditions">
                Existing Health Conditions
              </label>
              <textarea
                id="existingHealthConditions"
                name="existingHealthConditions"
                value={formData.existingHealthConditions}
                onChange={handleInputChange}
                placeholder="List any other health conditions (e.g., hypertension, heart disease, etc.)"
                className="form-textarea"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="allergies">Allergies</label>
              <textarea
                id="allergies"
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                placeholder="List any food, drug, or environmental allergies"
                className="form-textarea"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="preferredDietType">Preferred Diet Type</label>
              <select
                id="preferredDietType"
                name="preferredDietType"
                value={formData.preferredDietType}
                onChange={handleInputChange}
                className="form-select">
                <option value="">Select diet preference</option>
                <option value="diabetic-friendly">Diabetic-Friendly</option>
                <option value="low-carb">Low Carbohydrate</option>
                <option value="mediterranean">Mediterranean</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Ketogenic</option>
                <option value="balanced">Balanced Diet</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>👤 Personal Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="age">
                  Age <span className="required">*</span>
                </label>
                <input
                  id="age"
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Enter your age"
                  min="1"
                  max="120"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">
                  Gender <span className="required">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="form-select"
                  required>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="height">
                  Height (cm) <span className="required">*</span>
                </label>
                <input
                  id="height"
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  placeholder="e.g., 175"
                  min="50"
                  max="300"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="weight">
                  Weight (kg) <span className="required">*</span>
                </label>
                <input
                  id="weight"
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="e.g., 70"
                  min="20"
                  max="500"
                  step="0.1"
                  className="form-input"
                  required
                />
              </div>
            </div>

            {formData.bmi && (
              <div className="bmi-display">
                <label>BMI (Auto-calculated)</label>
                <div className="bmi-result">
                  <span className="bmi-value">{formData.bmi}</span>
                  <span
                    className="bmi-category"
                    style={{ color: getBMICategory(formData.bmi).color }}>
                    {getBMICategory(formData.bmi).category}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading}
              className="medical-button primary">
              {loading
                ? isOnboarding
                  ? "Saving Information..."
                  : "Updating Medical History..."
                : isOnboarding
                ? "Complete Setup"
                : "Update Medical History"}
            </button>

            {isOnboarding && (
              <button
                type="button"
                onClick={handleSkipForNow}
                className="medical-button secondary"
                disabled={loading}>
                Skip for Now
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MedicalHistory;
