import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { checkUserProfile, getUserDocument, updateUserProfile } from '../../utils/userUtils';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useAuth();
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
          // Update form data with existing profile data
          setFormData({
            fullName: profile.fullName || currentUser?.displayName || '',
            phoneNumber: profile.phoneNumber || '',
            address: profile.address || '',
            dateOfBirth: profile.dateOfBirth || '',
            gender: profile.gender || '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateUserProfile(currentUser.uid, {
        ...formData,
        email: currentUser.email,
        updatedAt: new Date().toISOString(),
      });
      setHasProfile(true);
      setProfileData(formData);
    } catch (error) {
      setError('Failed to save profile');
      console.error('Error:', error);
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
          <p><strong>Name:</strong> {profileData.displayName}</p>
          <p><strong>Email:</strong> {profileData.email}</p>
          <p><strong>Phone:</strong> {profileData.phoneNumber}</p>
          <p><strong>Address:</strong> {profileData.address}</p>
          <p><strong>Date of Birth:</strong> {profileData.dateOfBirth}</p>
          <p><strong>Gender:</strong> {profileData.gender}</p>
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

        <button type="submit" className="submit-button">
          {hasProfile ? 'Update Profile' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default Profile;