import { formatDistanceToNow } from 'date-fns';
import './ThreadList.css';

const ThreadList = ({ threads, loading, onThreadSelect }) => {
  const formatTimeAgo = (dateString) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getCategoryIcon = (category) => {
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
  };

  if (loading) {
    return (
      <div className="thread-list-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading threads...</p>
        </div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="no-threads">
        <h3>No threads found</h3>
        <p>Be the first to start a conversation!</p>
      </div>
    );
  }

  return (
    <div className="thread-list">
      {threads.map(thread => (
        <div
          key={thread.id}
          className={`thread-item ${thread.isPinned ? 'pinned' : ''}`}
          onClick={() => onThreadSelect(thread)}
        >
          {thread.isPinned && <div className="pin-indicator">📌</div>}
          
          <div className="thread-main">
            <div className="thread-header">
              <div className="thread-category">
                <span className="category-icon">{getCategoryIcon(thread.category)}</span>
                <span className="category-name">{thread.category}</span>
              </div>
              
              <div className="thread-meta">
                <span className="author">by {thread.authorName}</span>
                <span className="time">{formatTimeAgo(thread.createdAt)}</span>
              </div>
            </div>

            <h3 className="thread-title">{thread.title}</h3>
            <p className="thread-preview">
              {thread.content.substring(0, 150)}
              {thread.content.length > 150 && '...'}
            </p>

            {thread.tags && thread.tags.length > 0 && (
              <div className="thread-tags">
                {thread.tags.map((tag, index) => (
                  <span key={index} className="tag">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="thread-stats">
            <div className="stat">
              <span className="stat-number">{thread.replies || 0}</span>
              <span className="stat-label">replies</span>
            </div>
            <div className="stat">
              <span className="stat-number">{thread.views || 0}</span>
              <span className="stat-label">views</span>
            </div>
            <div className="stat">
              <span className="stat-number">{thread.likes || 0}</span>
              <span className="stat-label">likes</span>
            </div>
          </div>

          {thread.lastReplyBy && thread.replies > 0 && (
            <div className="last-reply">
              <small>Last reply by {thread.lastReplyBy}</small>
              <small>{formatTimeAgo(thread.lastReplyAt)}</small>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ThreadList;
