import { useState, useEffect, useCallback } from 'react';
import { getForumThreads, searchForumThreads } from '../../utils/userUtils';
import ThreadList from './ThreadList';
import CreateThread from './CreateThread';
import ThreadView from './ThreadView';
import './Forum.css';

const Forum = () => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('list');
  const [selectedThread, setSelectedThread] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const categories = [
    { id: 'all', name: 'All Topics', icon: '💬' },
    { id: 'progress', name: 'Progress Sharing', icon: '📈' },
    { id: 'recipes', name: 'Healthy Recipes', icon: '🍽️' },
    { id: 'support', name: 'Support & Motivation', icon: '💪' },
    { id: 'questions', name: 'Questions & Help', icon: '❓' },
    { id: 'tips', name: 'Tips & Advice', icon: '💡' },
    { id: 'success', name: 'Success Stories', icon: '🎉' },
    { id: 'general', name: 'General Discussion', icon: '🗣️' }
  ];

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching threads for category:', selectedCategory, 'search:', searchTerm);
      
      let threadData;
      
      if (searchTerm.trim()) {
        threadData = await searchForumThreads(searchTerm);
      } else {
        threadData = await getForumThreads(selectedCategory);
      }
      
      console.log('Fetched threads:', threadData);
      setThreads(threadData);
    } catch (error) {
      console.error('Error fetching threads:', error);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads, refreshTrigger]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      await fetchThreads();
    }
  };

  const handleThreadCreated = useCallback(() => {
    console.log('Thread created, refreshing forum...');
    setActiveView('list');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleThreadSelect = useCallback((thread) => {
    console.log('Thread selected:', thread);
    setSelectedThread(thread);
    setActiveView('thread');
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveView('list');
    setSelectedThread(null);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleManualRefresh = useCallback(() => {
    console.log('Manual refresh triggered');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case 'create':
        return (
          <CreateThread
            categories={categories.filter(cat => cat.id !== 'all')}
            onThreadCreated={handleThreadCreated}
            onCancel={() => setActiveView('list')}
          />
        );
      case 'thread':
        return (
          <ThreadView
            thread={selectedThread}
            onBack={handleBackToList}
          />
        );
      default:
        return (
          <ThreadList
            threads={threads}
            loading={loading}
            onThreadSelect={handleThreadSelect}
            onRefresh={handleManualRefresh}
          />
        );
    }
  };

  return (
    <div className="forum">
      <div className="forum-header">
        <h2>💬 Community Forum</h2>
        <p>Connect with fellow diabetes warriors, share experiences, and support each other!</p>
      </div>

      {activeView === 'list' && (
        <>
          <div className="forum-controls">
            <div className="forum-actions">
              <button 
                className="create-thread-btn"
                onClick={() => setActiveView('create')}
              >
                ✍️ Start New Thread
              </button>
              
              <button 
                className="refresh-btn"
                onClick={handleManualRefresh}
              >
                🔄 Refresh
              </button>
              
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Search threads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-btn">🔍</button>
              </form>
            </div>
          </div>

          <div className="forum-categories">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSearchTerm('');
                }}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="forum-content">
        {renderActiveView()}
      </div>
    </div>
  );
};

export default Forum;
