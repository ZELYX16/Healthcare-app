import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createForumThread } from '../../utils/userUtils';
import './CreateThread.css';

const CreateThread = ({ categories, onThreadCreated, onCancel }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.title.trim()) {
      setError('Please enter a title for your thread');
      return;
    }
    
    if (!formData.content.trim()) {
      setError('Please enter some content for your thread');
      return;
    }

    if (formData.title.trim().length < 5) {
      setError('Title must be at least 5 characters long');
      return;
    }

    if (formData.content.trim().length < 10) {
      setError('Content must be at least 10 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Submitting thread with data:', formData);

      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .slice(0, 5); // Limit to 5 tags

      const threadData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        tags: tagsArray
      };

      console.log('Processed thread data:', threadData);

      const result = await createForumThread(currentUser.uid, threadData);
      
      console.log('Thread creation result:', result);

      if (result.success) {
        setSuccess(`Thread created successfully! You earned ${result.pointsEarned} points.`);
        
        // Clear form
        setFormData({
          title: '',
          content: '',
          category: 'general',
          tags: ''
        });
        
        // Wait a moment to show success message, then navigate back
        setTimeout(() => {
          onThreadCreated();
        }, 1500);
      } else {
        setError(result.error || 'Failed to create thread');
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      setError('Failed to create thread. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  return (
    <div className="create-thread">
      <div className="create-thread-header">
        <h3>✍️ Start New Thread</h3>
        <button onClick={onCancel} className="cancel-btn" type="button">✕</button>
      </div>

      {success && (
        <div className="success-message">
          <p>✅ {success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-thread-form">
        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            required
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="title">Thread Title *</label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="What would you like to discuss?"
            required
            maxLength={100}
            minLength={5}
          />
          <small className={formData.title.length > 90 ? 'warning' : ''}>
            {formData.title.length}/100 characters
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="content">Your Message *</label>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            placeholder="Share your thoughts, experiences, or questions with the community..."
            required
            rows={8}
            maxLength={2000}
            minLength={10}
          />
          <small className={formData.content.length > 1800 ? 'warning' : ''}>
            {formData.content.length}/2000 characters
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (optional)</label>
          <input
            type="text"
            id="tags"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            placeholder="diabetes, diet, exercise (comma separated, max 5 tags)"
            maxLength={100}
          />
          <small>Add tags to help others find your thread (max 5 tags)</small>
        </div>

        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
          </div>
        )}

        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel} 
            className="cancel-action-btn"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading || !formData.title.trim() || !formData.content.trim()} 
            className="submit-btn"
          >
            {loading ? '🔄 Creating...' : '🚀 Create Thread'}
          </button>
        </div>
      </form>

      {/* Preview Section */}
      {(formData.title.trim() || formData.content.trim()) && (
        <div className="thread-preview">
          <h4>Preview:</h4>
          <div className="preview-content">
            {formData.title.trim() && (
              <h5 className="preview-title">{formData.title}</h5>
            )}
            {formData.content.trim() && (
              <p className="preview-text">
                {formData.content.substring(0, 200)}
                {formData.content.length > 200 && '...'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateThread;
