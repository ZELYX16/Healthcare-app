import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getThreadWithReplies, replyToThread, toggleLike } from '../../utils/userUtils';
import { formatDistanceToNow } from 'date-fns';
import './ThreadView.css';

const ThreadView = ({ thread: initialThread, onBack }) => {
  const { currentUser } = useAuth();
  const [threadData, setThreadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchThreadData = useCallback(async () => {
    if (!initialThread?.id) return;
    
    try {
      setLoading(true);
      const data = await getThreadWithReplies(initialThread.id);
      setThreadData(data);
    } catch (error) {
      console.error('Error fetching thread data:', error);
    } finally {
      setLoading(false);
    }
  }, [initialThread?.id]);

  useEffect(() => {
    fetchThreadData();
  }, [fetchThreadData]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const result = await replyToThread(currentUser.uid, initialThread.id, replyContent);
      if (result.success) {
        setReplyContent('');
        await fetchThreadData();
      }
    } catch (error) {
      console.error('Error replying:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (itemId, itemType) => {
    try {
      const result = await toggleLike(currentUser.uid, itemId, itemType);
      if (result.success) {
        await fetchThreadData();
      }
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  const formatTimeAgo = useCallback((dateString) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  }, []);

  const getCategoryIcon = useCallback((category) => {
    const icons = {
      progress: '📈',
      recipes: '🍽️',
      support: '💪',
      questions: '❓',
      tips: '💡',
      success: '🎉',
      general: '🗣️'
    };
    return icons[category] || '💬';
  }, []);

  if (loading) {
    return (
      <div className="thread-view-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading thread...</p>
        </div>
      </div>
    );
  }

  if (!threadData) {
    return (
      <div className="thread-error">
        <h3>Thread not found</h3>
        <button onClick={onBack} className="back-btn">← Back to Forum</button>
      </div>
    );
  }

  const { thread, replies } = threadData;

  return (
    <div className="thread-view">
      <div className="thread-view-header">
        <button onClick={onBack} className="back-btn">← Back to Forum</button>
        <div className="thread-category">
          <span className="category-icon">{getCategoryIcon(thread.category)}</span>
          <span className="category-name">{thread.category}</span>
        </div>
      </div>

      {/* Original Thread */}
      <div className="thread-main-post">
        <div className="post-header">
          <div className="author-info">
            <div className="author-avatar">👤</div>
            <div className="author-details">
              <div className="author-name">{thread.authorName}</div>
              <div className="post-time">{formatTimeAgo(thread.createdAt)}</div>
            </div>
          </div>
          
          <div className="post-stats">
            <span className="views">👁️ {thread.views} views</span>
          </div>
        </div>

        <h1 className="thread-title">{thread.title}</h1>
        
        <div className="thread-content">
          {thread.content.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {thread.tags && thread.tags.length > 0 && (
          <div className="thread-tags">
            {thread.tags.map((tag, index) => (
              <span key={index} className="tag">#{tag}</span>
            ))}
          </div>
        )}

        <div className="post-actions">
          <button
            className={`like-btn ${thread.likedBy?.includes(currentUser.uid) ? 'liked' : ''}`}
            onClick={() => handleLike(thread.id, 'thread')}
          >
            ❤️ {thread.likes || 0}
          </button>
        </div>
      </div>

      {/* Replies Section */}
      <div className="replies-section">
        <h3>💬 Replies ({replies.length})</h3>

        {/* Reply Form */}
        <form onSubmit={handleReply} className="reply-form">
          <div className="form-group">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              maxLength={1000}
              required
            />
            <small>{replyContent.length}/1000 characters</small>
          </div>
          <button type="submit" disabled={submitting} className="reply-submit-btn">
            {submitting ? 'Posting...' : '📝 Post Reply'}
          </button>
        </form>

        {/* Replies List */}
        {replies.length > 0 ? (
          <div className="replies-list">
            {replies.map((reply, index) => (
              <div key={reply.id} className="reply-item">
                <div className="reply-header">
                  <div className="author-info">
                    <div className="author-avatar">👤</div>
                    <div className="author-details">
                      <div className="author-name">{reply.authorName}</div>
                      <div className="reply-time">{formatTimeAgo(reply.createdAt)}</div>
                    </div>
                  </div>
                  <div className="reply-number">#{index + 1}</div>
                </div>

                <div className="reply-content">
                  {reply.content.split('\n').map((paragraph, pIndex) => (
                    <p key={pIndex}>{paragraph}</p>
                  ))}
                </div>

                <div className="reply-actions">
                  <button
                    className={`like-btn ${reply.likedBy?.includes(currentUser.uid) ? 'liked' : ''}`}
                    onClick={() => handleLike(reply.id, 'reply')}
                  >
                    ❤️ {reply.likes || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-replies">
            <p>No replies yet. Be the first to respond!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadView;
