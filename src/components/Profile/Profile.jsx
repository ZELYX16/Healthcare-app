import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import { checkUserProfile, getUserDocument, updateUserProfile } from '../../utils/userUtils';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const [formData, setFormData] = useState({
    fullName: currentUser?.displayName || '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    diabeticType: '',
    currentHba1cLevel: '',
    fastingBloodSugar: '',
    preferredFoodType: '',
    age: '',
    height: '',
    weight: '',
    bmi: '',
  });

  useEffect(() => {
    const checkProfile = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        const exists = await checkUserProfile(currentUser.uid);
        setHasProfile(exists);
        
        if (exists) {
          const profile = await getUserDocument(currentUser.uid);
          setProfileData(profile);
          setFormData({
            fullName: profile.fullName || currentUser?.displayName || '',
            phoneNumber: profile.phoneNumber || '',
            address: profile.address || '',
            dateOfBirth: profile.dateOfBirth || '',
            gender: profile.gender || '',
            diabeticType: profile.diabeticType || '',
            currentHba1cLevel: profile.currentHba1cLevel || '',
            fastingBloodSugar: profile.fastingBloodSugar || '',
            preferredFoodType: profile.preferredFoodType || '',
            age: profile.age || '',
            height: profile.height || '',
            weight: profile.weight || '',
            bmi: profile.bmi || '',
          });
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [currentUser]);

  // Auto-calculate BMI when height or weight changes
  useEffect(() => {
    const { height, weight } = formData;
    if (height && weight) {
      const heightInMeters = parseFloat(height) / 100;
      const bmi = (parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(2);
      setFormData((prev) => ({ ...prev, bmi }));
    }
  }, [formData.height, formData.weight]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await updateUserProfile(currentUser.uid, {
        ...formData,
        email: currentUser.email,
        updatedAt: new Date().toISOString(),
      });
      setHasProfile(true);
      setProfileData(formData);
      navigate("/dashboard");
    } catch (error) {
      setError("Failed to save profile");
      console.error("Error:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div>Loading...</div>
      </div>
    );
  }

  if (hasProfile.hasProfile && profileData) {
    return (
      <div className="profile-container">
        <h2>Profile Information</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="profile-info">
          <p><strong>Name:</strong> {profileData.fullName}</p>
          <p><strong>Email:</strong> {profileData.email}</p>
          <p><strong>Phone:</strong> {profileData.phoneNumber}</p>
          <p><strong>Address:</strong> {profileData.address}</p>
          <p><strong>Date of Birth:</strong> {profileData.dateOfBirth}</p>
          <p><strong>Gender:</strong> {profileData.gender}</p>
          <p><strong>Diabetic Type:</strong> {profileData.diabeticType}</p>
          <p><strong>Current HbA1c Level:</strong> {profileData.currentHba1cLevel}</p>
          <p><strong>Fasting Blood Sugar:</strong> {profileData.fastingBloodSugar}</p>
          <p><strong>Preferred Food Type:</strong> {profileData.preferredFoodType}</p>
          <p><strong>Age:</strong> {profileData.age}</p>
          <p><strong>Height:</strong> {profileData.height} cm</p>
          <p><strong>Weight:</strong> {profileData.weight} kg</p>
          <p><strong>BMI:</strong> {profileData.bmi}</p>
          <button 
            onClick={() => setHasProfile(false)} 
            className="submit-button"
            style={{ marginTop: '1rem' }}
          >
            Edit Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2>{hasProfile ? 'Edit Profile' : 'Complete Your Profile'}</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth</label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="diabeticType">Diabetic Type</label>
          <input
            type="text"
            id="diabeticType"
            name="diabeticType"
            value={formData.diabeticType}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="currentHba1cLevel">Current HbA1c Level</label>
          <input
            type="number"
            id="currentHba1cLevel"
            name="currentHba1cLevel"
            value={formData.currentHba1cLevel}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fastingBloodSugar">Fasting Blood Sugar</label>
          <input
            type="number"
            id="fastingBloodSugar"
            name="fastingBloodSugar"
            value={formData.fastingBloodSugar}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="preferredFoodType">Preferred Food Type</label>
          <input
            type="text"
            id="preferredFoodType"
            name="preferredFoodType"
            value={formData.preferredFoodType}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="height">Height (cm)</label>
          <input
            type="number"
            id="height"
            name="height"
            value={formData.height}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="weight">Weight (kg)</label>
          <input
            type="number"
            id="weight"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="bmi">BMI (Auto-calculated)</label>
          <input
            type="text"
            id="bmi"
            name="bmi"
            value={formData.bmi}
            readOnly
          />
        </div>

        <button type="submit" className="submit-button">
          {hasProfile.hasProfile ? 'Update Profile' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
