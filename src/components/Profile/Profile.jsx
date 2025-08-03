import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserDocument, updateUserProfile } from '../../utils/userUtils';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    activityLevel: 'moderate',
    currentFbs: '',
    currentPpbs: '',
    medicalHistory: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      const user = await getUserDocument(currentUser.uid);
      
      if (user) {
        setUserData(user);
        setFormData({
          fullName: user.fullName || '',
          age: user.age || '',
          gender: user.gender || '',
          height: user.height || '',
          weight: user.weight || '',
          activityLevel: user.activityLevel || 'moderate',
          currentFbs: user.currentFbs || '',
          currentPpbs: user.currentPpbs || '',
          medicalHistory: user.medicalHistory || '',
          emergencyContact: user.emergencyContact || '',
          emergencyPhone: user.emergencyPhone || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Handle form input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!currentUser?.uid) {
      setError('User not authenticated');
      return;
    }

    // Validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!formData.age || formData.age < 1 || formData.age > 120) {
      setError('Please enter a valid age');
      return;
    }

    if (!formData.height || formData.height < 50 || formData.height > 300) {
      setError('Please enter a valid height in cm');
      return;
    }

    if (!formData.weight || formData.weight < 20 || formData.weight > 500) {
      setError('Please enter a valid weight in kg');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const profileData = {
        ...formData,
        age: parseInt(formData.age),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        currentFbs: parseFloat(formData.currentFbs) || 100,
        currentPpbs: parseFloat(formData.currentPpbs) || 140
      };

      const result = await updateUserProfile(currentUser.uid, profileData);
      
      if (result) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [currentUser?.uid, formData, navigate]);

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2>Complete Your Profile</h2>
      <p>Help us personalize your diabetes management experience</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label htmlFor="fullName">Full Name *</label>
          <input
            type="text"
            id="fullName"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="age">Age *</label>
          <input
            type="number"
            id="age"
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            min="1"
            max="120"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender *</label>
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            required
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="height">Height (cm) *</label>
          <input
            type="number"
            id="height"
            value={formData.height}
            onChange={(e) => handleInputChange('height', e.target.value)}
            min="50"
            max="300"
            step="0.1"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="weight">Weight (kg) *</label>
          <input
            type="number"
            id="weight"
            value={formData.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            min="20"
            max="500"
            step="0.1"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="activityLevel">Activity Level</label>
          <select
            id="activityLevel"
            value={formData.activityLevel}
            onChange={(e) => handleInputChange('activityLevel', e.target.value)}
          >
            <option value="sedentary">Sedentary (little/no exercise)</option>
            <option value="light">Light (light exercise 1-3 days/week)</option>
            <option value="moderate">Moderate (moderate exercise 3-5 days/week)</option>
            <option value="high">High (hard exercise 6-7 days/week)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="currentFbs">Current Fasting Blood Sugar (mg/dL)</label>
          <input
            type="number"
            id="currentFbs"
            value={formData.currentFbs}
            onChange={(e) => handleInputChange('currentFbs', e.target.value)}
            min="50"
            max="500"
            placeholder="100"
          />
        </div>

        <div className="form-group">
          <label htmlFor="currentPpbs">Current Post-Meal Blood Sugar (mg/dL)</label>
          <input
            type="number"
            id="currentPpbs"
            value={formData.currentPpbs}
            onChange={(e) => handleInputChange('currentPpbs', e.target.value)}
            min="50"
            max="500"
            placeholder="140"
          />
        </div>

        <div className="form-group">
          <label htmlFor="medicalHistory">Medical History (Optional)</label>
          <textarea
            id="medicalHistory"
            value={formData.medicalHistory}
            onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
            rows="4"
            placeholder="Any relevant medical conditions, medications, allergies..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="emergencyContact">Emergency Contact Name</label>
          <input
            type="text"
            id="emergencyContact"
            value={formData.emergencyContact}
            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
            placeholder="Full name of emergency contact"
          />
        </div>

        <div className="form-group">
          <label htmlFor="emergencyPhone">Emergency Contact Phone</label>
          <input
            type="tel"
            id="emergencyPhone"
            value={formData.emergencyPhone}
            onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
            placeholder="+1234567890"
          />
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
