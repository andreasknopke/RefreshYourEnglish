import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function StatsModule({ user }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    progress: null,
    flashcards: null,
    actionReviews: null,
    gamification: null,
  });

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    setLoading(true);
    try {
      // Lade Stats einzeln mit Fehlerbehandlung für jeden Endpoint
      const [progress, flashcards, actionReviews, gamification] = await Promise.allSettled([
        apiService.getStats(),
        apiService.getFlashcardStats(),
        apiService.getActionReviewStats(),
        apiService.getGamificationStats(),
      ]);

      console.log('📊 Stats loaded:', { 
        progress: progress.status === 'fulfilled' ? progress.value : null,
        flashcards: flashcards.status === 'fulfilled' ? flashcards.value : null,
        actionReviews: actionReviews.status === 'fulfilled' ? actionReviews.value : null,
        gamification: gamification.status === 'fulfilled' ? gamification.value : null,
      });

      setStats({
        progress: progress.status === 'fulfilled' ? progress.value : { overall: {}, recent: [] },
        flashcards: flashcards.status === 'fulfilled' ? flashcards.value : {},
        actionReviews: actionReviews.status === 'fulfilled' ? actionReviews.value : {},
        gamification: gamification.status === 'fulfilled' ? gamification.value : {},
      });
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Lade Statistiken...</p>
        </div>
      </div>
    );
  }

  const { progress, flashcards, actionReviews, gamification } = stats;

  console.log('🔍 Progress data:', progress);
  console.log('🔍 Progress.overall:', progress?.overall);
  console.log('🔍 total_words:', progress?.overall?.total_words);

  // Berechne Gesamtfortschritt aus progress.overall
  const totalWords = progress?.overall?.total_words || 0;
  const totalCorrect = progress?.overall?.total_correct || 0;
  const totalIncorrect = progress?.overall?.total_incorrect || 0;
  const totalQuestions = progress?.overall?.total_questions || 0;
  const totalAttempts = totalQuestions;
  const accuracy = progress?.overall?.avg_score || 0;

  // Flashcard Statistiken
  const totalFlashcards = flashcards?.total || 0;
  const dueFlashcards = flashcards?.due || 0;
  const masteredFlashcards = flashcards?.mastered || 0;
  const learningFlashcards = flashcards?.learning || 0;

  // Action Mode Statistiken
  const totalActionReviews = actionReviews?.total || 0;
  const dueActionReviews = actionReviews?.due || 0;
  // Backend gibt kein mastered zurück, berechne es
  const masteredActionReviews = Math.max(0, totalActionReviews - dueActionReviews);

  // Gamification Statistiken (Backend gibt currentStreak zurück)
  const streak = gamification?.currentStreak || 0;
  const gamificationMinutes = gamification?.totalMinutes || 0;
  const progressSeconds = progress?.overall?.total_time_seconds || 0;
  const progressMinutes = Math.round(progressSeconds / 60);
  const totalMinutes = Math.max(gamificationMinutes, progressMinutes); // Nutze den höheren Wert
  const totalExercises = progress?.overall?.total_exercises || 0;
  
  // Level-System basierend auf Gesamtübungen
  // Level 1: 0-99, Level 2: 100-249, Level 3: 250-499, etc.
  const calculateLevel = (exercises) => {
    if (exercises < 100) return 1;
    if (exercises < 250) return 2;
    if (exercises < 500) return 3;
    if (exercises < 1000) return 4;
    if (exercises < 2000) return 5;
    if (exercises < 3500) return 6;
    if (exercises < 5500) return 7;
    if (exercises < 8000) return 8;
    return Math.floor(8 + (exercises - 8000) / 2000);
  };

  const calculateXPForLevel = (lvl) => {
    if (lvl === 1) return 100;
    if (lvl === 2) return 250;
    if (lvl === 3) return 500;
    if (lvl === 4) return 1000;
    if (lvl === 5) return 2000;
    if (lvl === 6) return 3500;
    if (lvl === 7) return 5500;
    if (lvl === 8) return 8000;
    return 8000 + (lvl - 8) * 2000;
  };

  const level = calculateLevel(totalExercises);
  const xpForCurrentLevel = level > 1 ? calculateXPForLevel(level - 1) : 0;
  const xpForNextLevel = calculateXPForLevel(level);
  const xp = totalExercises;
  const xpProgress = xpForNextLevel > xpForCurrentLevel 
    ? ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100 
    : 0;

  // Session Statistiken (Backend gibt progress.recent zurück)
  const recentSessions = progress?.recent || [];
  const totalSessions = progress?.overall?.total_sessions || 0;
  const averageScore = progress?.overall?.avg_score || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              📊 Lernfortschritt
            </h1>
            <p className="text-gray-600">Deine ausführlichen Statistiken und Erfolge</p>
          </div>
          <button
            onClick={loadAllStats}
            className="btn-primary px-6 py-3 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Warnung wenn Progress-Daten fehlen */}
      {totalWords === 0 && totalExercises === 0 && (
        <div className="glass-card rounded-2xl p-4 bg-yellow-50 border-2 border-yellow-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="font-semibold text-gray-800">Noch keine Vokabel-Daten</p>
              <p className="text-sm text-gray-600">Beginne mit dem Lernen, um hier deine Fortschritte zu sehen!</p>
            </div>
          </div>
        </div>
      )}

      {/* Gamification Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl">
              🔥
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Streak</p>
              <p className="text-3xl font-bold text-gray-800">{streak}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Tage in Folge</p>
        </div>

        <div className="glass-card rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-2xl">
              ⏱️
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Lernzeit</p>
              <p className="text-3xl font-bold text-gray-800">{totalMinutes}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Minuten gesamt</p>
        </div>

        <div className="glass-card rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-2xl">
              ⭐
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Level</p>
              <p className="text-3xl font-bold text-gray-800">{level}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, xpProgress)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{xp} / {xpForNextLevel} Übungen</p>
        </div>

        <div className="glass-card rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Übungen</p>
              <p className="text-3xl font-bold text-gray-800">{totalExercises}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Abgeschlossen</p>
        </div>
      </div>

      {/* Vocabulary Progress */}
      <div className="glass-card rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl">
            📚
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Vokabel-Fortschritt</h2>
            <p className="text-sm text-gray-600">Gesamtübersicht deines Wortschatzes</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Gelernte Vokabeln</span>
              <span className="text-2xl font-bold text-indigo-600">{totalWords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Genauigkeit</span>
              <span className="text-2xl font-bold text-green-600">{accuracy.toFixed(1)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Richtige Antworten</span>
              <span className="text-2xl font-bold text-green-600">{totalCorrect}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Falsche Antworten</span>
              <span className="text-2xl font-bold text-red-600">{totalIncorrect}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Gesamt Übungen</span>
              <span className="text-2xl font-bold text-purple-600">{totalExercises}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Gesamtzeit</span>
              <span className="text-2xl font-bold text-blue-600">{totalMinutes} Min</span>
            </div>
          </div>
        </div>

        {/* Accuracy Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Erfolgsquote</span>
            <span className="text-sm font-bold text-indigo-600">{accuracy.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, accuracy)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Flashcards & Action Mode Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Flashcard Stats */}
        <div className="glass-card rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-2xl">
              🎴
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Flashcards</h2>
              <p className="text-sm text-gray-600">Spaced Repetition System</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <span className="font-semibold text-gray-700">Gesamt</span>
              <span className="text-2xl font-bold text-purple-600">{totalFlashcards}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
              <span className="font-semibold text-gray-700">Fällig heute</span>
              <span className="text-2xl font-bold text-red-600">{dueFlashcards}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl">
              <span className="font-semibold text-gray-700">In Bearbeitung</span>
              <span className="text-2xl font-bold text-yellow-600">{learningFlashcards}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
              <span className="font-semibold text-gray-700">Gemeistert</span>
              <span className="text-2xl font-bold text-green-600">{masteredFlashcards}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {totalFlashcards > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Meisterungsgrad</span>
                <span className="text-sm font-bold text-green-600">
                  {((masteredFlashcards / totalFlashcards) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${(masteredFlashcards / totalFlashcards) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Action Mode Stats */}
        <div className="glass-card rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-2xl">
              ⚡
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Action Mode</h2>
              <p className="text-sm text-gray-600">Schnelles Wiederholen</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
              <span className="font-semibold text-gray-700">Gesamt</span>
              <span className="text-2xl font-bold text-green-600">{totalActionReviews}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
              <span className="font-semibold text-gray-700">Fällig heute</span>
              <span className="text-2xl font-bold text-red-600">{dueActionReviews}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <span className="font-semibold text-gray-700">Gemeistert</span>
              <span className="text-2xl font-bold text-blue-600">{masteredActionReviews}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {totalActionReviews > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Meisterungsgrad</span>
                <span className="text-sm font-bold text-blue-600">
                  {((masteredActionReviews / totalActionReviews) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${(masteredActionReviews / totalActionReviews) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <div className="glass-card rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center text-2xl">
              📈
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Letzte Sessions</h2>
              <p className="text-sm text-gray-600">Deine letzten Trainingseinheiten</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Datum</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Modus</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Score</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Korrekt</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Dauer</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.slice(0, 10).map((session, index) => {
                  const date = new Date(session.completed_at || session.created_at);
                  const modeNames = {
                    translation: '🌐 Übersetzung',
                    action: '⚡ Action',
                    dialog: '💬 Dialog',
                    flashcards: '🎴 Flashcards',
                  };
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        <span className="text-xs text-gray-500 ml-2">
                          {date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold">
                        {modeNames[session.mode] || session.mode}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-lg font-bold ${
                          session.score >= 80 ? 'text-green-600' :
                          session.score >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {Math.round(session.score)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-700">
                        <span className="font-semibold text-green-600">{session.correct_answers}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-600">{session.total_answers}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {Math.floor(session.duration_seconds / 60)}:{String(session.duration_seconds % 60).padStart(2, '0')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Motivational Message */}
      <div className="glass-card rounded-3xl p-8 shadow-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🎯' : '💪'}
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {accuracy >= 80 ? 'Hervorragend!' : accuracy >= 60 ? 'Gute Arbeit!' : 'Weiter so!'}
          </h3>
          <p className="text-gray-600">
            {accuracy >= 80 
              ? 'Du machst ausgezeichnete Fortschritte! Bleib dran!'
              : accuracy >= 60
              ? 'Du bist auf einem guten Weg. Regelmäßiges Üben zahlt sich aus!'
              : 'Jeder Meister fängt klein an. Übung macht den Meister!'
            }
          </p>
          {streak > 0 && (
            <p className="text-sm text-indigo-600 font-semibold mt-4">
              🔥 {streak} Tage Streak - Fantastisch!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatsModule;
