import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getLeaderboard } from '../../utils/userUtils';
import './Leaderboard.css';

const Leaderboard = () => {
  const { currentUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getLeaderboard(20);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1: return 'gold';
      case 2: return 'silver';
      case 3: return 'bronze';
      default: return 'regular';
    }
  };

  const isCurrentUser = (userId) => {
    return currentUser?.uid === userId;
  };

  if (loading) {
    return (
      <div className="leaderboard-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-error">
        <h3>Oops! Something went wrong</h3>
        <p>{error}</p>
        <button onClick={fetchLeaderboard} className="retry-button">
          🔄 Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>🏆 Community Leaderboard</h2>
        <p>See how you stack up against other diabetes warriors!</p>
        <button onClick={fetchLeaderboard} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="no-leaderboard">
          <h3>No rankings yet</h3>
          <p>Be the first to start logging meals and earn points!</p>
        </div>
      ) : (
        <>
          {leaderboard.length >= 3 && (
            <div className="podium">
              <div className="podium-item second">
                <div className="podium-user">
                  <div className="user-avatar">🥈</div>
                  <div className="user-name">{leaderboard[1].name}</div>
                  <div className="user-points">{leaderboard[1].totalPoints} pts</div>
                  <div className="user-streak">🔥 {leaderboard[1].currentStreak} days</div>
                </div>
              </div>
              
              <div className="podium-item first">
                <div className="podium-user">
                  <div className="user-avatar">🥇</div>
                  <div className="user-name">{leaderboard[0].name}</div>
                  <div className="user-points">{leaderboard[0].totalPoints} pts</div>
                  <div className="user-streak">🔥 {leaderboard[0].currentStreak} days</div>
                </div>
              </div>
              
              <div className="podium-item third">
                <div className="podium-user">
                  <div className="user-avatar">🥉</div>
                  <div className="user-name">{leaderboard[2].name}</div>
                  <div className="user-points">{leaderboard[2].totalPoints} pts</div>
                  <div className="user-streak">🔥 {leaderboard[2].currentStreak} days</div>
                </div>
              </div>
            </div>
          )}

          <div className="leaderboard-list">
            <h3>Full Rankings</h3>
            {leaderboard.map((user) => (
              <div 
                key={user.userId} 
                className={`leaderboard-item ${getRankClass(user.rank)} ${isCurrentUser(user.userId) ? 'current-user' : ''}`}
              >
                <div className="rank-section">
                  <div className="rank-badge">
                    {getRankIcon(user.rank)}
                  </div>
                </div>
                
                <div className="user-section">
                  <div className="user-info">
                    <div className="user-name">
                      {user.name}
                      {isCurrentUser(user.userId) && <span className="you-badge">You</span>}
                    </div>
                    <div className="user-stats">
                      <span className="stat">
                        🔥 {user.currentStreak} day streak
                      </span>
                      <span className="stat">
                        📈 {user.longestStreak} best streak
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="points-section">
                  <div className="total-points">{user.totalPoints}</div>
                  <div className="points-label">points</div>
                </div>
              </div>
            ))}
          </div>

          <div className="motivation-section">
            <h3>💪 Keep Going!</h3>
            <div className="motivation-cards">
              <div className="motivation-card">
                <div className="card-icon">🍽️</div>
                <div className="card-text">
                  <h4>Log Meals</h4>
                  <p>Earn 12-15 points per meal</p>
                </div>
              </div>
              <div className="motivation-card">
                <div className="card-icon">🔥</div>
                <div className="card-text">
                  <h4>Build Streaks</h4>
                  <p>Log 2+ meals daily to maintain your streak</p>
                </div>
              </div>
              <div className="motivation-card">
                <div className="card-icon">📊</div>
                <div className="card-text">
                  <h4>Track Progress</h4>
                  <p>Monthly improvements earn bonus points</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
