import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function GamificationBanner({ user }) {
  const [stats, setStats] = useState(null);
  const [showTrophyAnimation, setShowTrophyAnimation] = useState(false);

  useEffect(() => {
    if (user) {
      loadStats();
      
      // Polling alle 5 Sekunden für Live-Updates
      const interval = setInterval(loadStats, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const data = await apiService.getGamificationStats();
      console.log('📊 Gamification stats loaded:', data);
      setStats(data);
      
      // Animation bei neuer Trophäe
      if (data.todayGoalAchieved && !localStorage.getItem(`trophy_shown_${data.todayMinutes}`)) {
        setShowTrophyAnimation(true);
        localStorage.setItem(`trophy_shown_${data.todayMinutes}`, 'true');
        setTimeout(() => setShowTrophyAnimation(false), 3000);
      }
    } catch (error) {
      console.error('Failed to load gamification stats:', error);
    }
  };

  if (!user || !stats) return null;

  const progressPercentage = Math.min(100, (stats.todayMinutes / 15) * 100);
  const isGoalReached = stats.todayGoalAchieved;

  return (
    <div className="glass-card rounded-2xl p-3 mb-3 shadow-lg relative overflow-hidden">
      {/* Trophy Animation */}
      {showTrophyAnimation && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm animate-fade-in">
          <div className="text-6xl animate-bounce">
            🏆
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Streak und Trophäen */}
        <div className="flex items-center gap-2">
          {/* Streak */}
          <div className="flex items-center gap-1 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg px-2 py-1">
            <span className="text-xl">🔥</span>
            <div className="text-xs">
              <div className="font-bold text-orange-600">{stats.currentStreak}</div>
              <div className="text-[8px] text-orange-500 leading-none">Tage</div>
            </div>
          </div>

          {/* Trophäen */}
          <div className="flex items-center gap-1 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg px-2 py-1">
            <span className="text-xl">🏆</span>
            <div className="text-xs">
              <div className="font-bold text-amber-600">{stats.totalTrophies}</div>
              <div className="text-[8px] text-amber-500 leading-none">Total</div>
            </div>
          </div>

          {/* Wochen-Trophäen */}
          {stats.weeklyTrophies > 0 && (
            <div className="flex items-center gap-1 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg px-2 py-1">
              <span className="text-xl">👑</span>
              <div className="text-xs">
                <div className="font-bold text-purple-600">{stats.weeklyTrophies}</div>
                <div className="text-[8px] text-purple-500 leading-none">Wochen</div>
              </div>
            </div>
          )}
        </div>

        {/* Tages-Fortschritt */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-gray-600">
              {isGoalReached ? '✅ Tagesziel erreicht!' : `Heute: ${stats.todayMinutes}/15 min`}
            </span>
            {!isGoalReached && (
              <span className="text-[10px] text-gray-500">
                noch {stats.needsMinutes} min
              </span>
            )}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                isGoalReached 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Tages-Trophäe */}
        <div className={`text-3xl transition-all duration-300 ${
          isGoalReached ? 'scale-110 animate-pulse' : 'opacity-30 grayscale'
        }`}>
          🏆
        </div>
      </div>

      {/* Warnung bei Streak-Verlust */}
      {stats.currentStreak > 0 && !isGoalReached && stats.todayMinutes === 0 && (
        <div className="mt-2 text-[10px] text-red-600 font-semibold text-center bg-red-50 rounded-lg py-1 border border-red-200">
          ⚠️ Übe heute, sonst verlierst du deine {stats.currentStreak}-Tage-Streak!
        </div>
      )}
    </div>
  );
}

export default GamificationBanner;
