import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { checkUserProfile, getUserDocument, updateUserProfile } from '../../utils/userUtils';

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
      if (currentUser?.uid) {
        const exists = await checkUserProfile(currentUser.uid);
        setHasProfile(exists);
        if (exists) {
          const profile = await getUserDocument(currentUser.uid);
          setProfileData(profile);
        }
        setLoading(false);
      }
    };
    checkProfile();
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateUserProfile(currentUser.uid, {
        ...formData,
        email: currentUser.email,
      });
      setHasProfile(true);
      setProfileData(formData);
    } catch (error) {
      setError('Failed to save profile');
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (hasProfile && profileData) {
    return (
      <div className="profile-container">
        <h2>Profile Information</h2>
        <div className="profile-info">
          <p><strong>Name:</strong> {profileData.fullName}</p>
          <p><strong>Email:</strong> {profileData.email}</p>
          <p><strong>Phone:</strong> {profileData.phoneNumber}</p>
          <p><strong>Address:</strong> {profileData.address}</p>
          <p><strong>Date of Birth:</strong> {profileData.dateOfBirth}</p>
          <p><strong>Gender:</strong> {profileData.gender}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2>Complete Your Profile</h2>
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
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default Profile;