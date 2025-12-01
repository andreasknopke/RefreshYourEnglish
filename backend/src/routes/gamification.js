import express from 'express';
import db from '../models/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Hilfsfunktion: Aktuelles Datum (nur Date-Teil)
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Hilfsfunktion: Datum vor X Tagen
const getDateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// POST /api/gamification/activity - Aktivität tracken
router.post('/activity', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { minutesPracticed, exercisesCompleted } = req.body;
    const secondsPracticed = Math.round((minutesPracticed || 0) * 60);
    const today = getTodayDate();

    console.log(`📊 Activity tracking: User ${userId}, ${minutesPracticed} min (${secondsPracticed}s), ${exercisesCompleted} exercises`);

    // Hole oder erstelle heutigen Eintrag
    let activity = db.prepare(`
      SELECT * FROM daily_activity WHERE user_id = ? AND date = ?
    `).get(userId, today);

    if (activity) {
      // Update existierenden Eintrag
      const newSeconds = activity.seconds_practiced + secondsPracticed;
      const newMinutes = newSeconds / 60;
      const newExercises = activity.exercises_completed + (exercisesCompleted || 0);
      const goalAchieved = newMinutes >= 15;

      console.log(`📊 Updating activity: ${activity.seconds_practiced}s -> ${newSeconds}s (${newMinutes.toFixed(2)} min), goal: ${goalAchieved}`);

      db.prepare(`
        UPDATE daily_activity 
        SET seconds_practiced = ?, exercises_completed = ?, goal_achieved = ?
        WHERE id = ?
      `).run(newSeconds, newExercises, goalAchieved ? 1 : 0, activity.id);

      activity.seconds_practiced = newSeconds;
      activity.exercises_completed = newExercises;
      activity.goal_achieved = goalAchieved;
    } else {
      // Erstelle neuen Eintrag
      const goalAchieved = (secondsPracticed / 60) >= 15;
      
      console.log(`📊 Creating new activity: ${secondsPracticed}s (${(secondsPracticed/60).toFixed(2)} min), goal: ${goalAchieved}`);

      const result = db.prepare(`
        INSERT INTO daily_activity (user_id, date, seconds_practiced, exercises_completed, goal_achieved)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, today, secondsPracticed, exercisesCompleted || 0, goalAchieved ? 1 : 0);

      activity = {
        id: result.lastInsertRowid,
        user_id: userId,
        date: today,
        seconds_practiced: secondsPracticed,
        exercises_completed: exercisesCompleted || 0,
        goal_achieved: goalAchieved
      };
    }

    // Prüfe ob Tages-Trophäe vergeben werden soll
    if (activity.goal_achieved) {
      const existingTrophy = db.prepare(`
        SELECT * FROM user_trophies WHERE user_id = ? AND trophy_type = 'daily' AND earned_date = ?
      `).get(userId, today);

      if (!existingTrophy) {
        // Vergebe Tages-Trophäe
        db.prepare(`
          INSERT INTO user_trophies (user_id, trophy_type, earned_date)
          VALUES (?, 'daily', ?)
        `).run(userId, today);

        // Prüfe für Wochen-Trophäe (7 Tage in Folge)
        checkAndAwardWeeklyTrophy(userId);
      }
    }

    // Hole aktuelle Streak und Trophäen
    const stats = getGamificationStats(userId);

    res.json({
      activity,
      stats,
      newTrophy: activity.goal_achieved
    });
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/gamification/stats - Statistiken abrufen
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = getGamificationStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hilfsfunktion: Berechne Gamification-Statistiken
function getGamificationStats(userId) {
  const today = getTodayDate();
  const yesterday = getDateDaysAgo(1);

  // Heutige Aktivität
  const todayActivity = db.prepare(`
    SELECT * FROM daily_activity WHERE user_id = ? AND date = ?
  `).get(userId, today) || { seconds_practiced: 0, goal_achieved: 0 };

  const todayMinutes = Math.round((todayActivity.seconds_practiced || 0) / 60 * 10) / 10;

  // Gestrige Aktivität (für Streak-Prüfung)
  const yesterdayActivity = db.prepare(`
    SELECT * FROM daily_activity WHERE user_id = ? AND date = ?
  `).get(userId, yesterday);

  // Berechne aktuelle Streak
  let currentStreak = 0;
  if (todayActivity.goal_achieved) {
    currentStreak = 1;
    // Zähle rückwärts für zusammenhängende Tage
    for (let i = 1; i < 365; i++) {
      const checkDate = getDateDaysAgo(i);
      const activity = db.prepare(`
        SELECT goal_achieved FROM daily_activity WHERE user_id = ? AND date = ?
      `).get(userId, checkDate);
      
      if (activity && activity.goal_achieved) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else if (yesterdayActivity && yesterdayActivity.goal_achieved) {
    // Wenn heute noch nicht geschafft, aber gestern ja, zähle von gestern
    currentStreak = 1;
    for (let i = 2; i < 365; i++) {
      const checkDate = getDateDaysAgo(i);
      const activity = db.prepare(`
        SELECT goal_achieved FROM daily_activity WHERE user_id = ? AND date = ?
      `).get(userId, checkDate);
      
      if (activity && activity.goal_achieved) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Hole alle Trophäen
  const dailyTrophies = db.prepare(`
    SELECT COUNT(*) as count FROM user_trophies 
    WHERE user_id = ? AND trophy_type = 'daily'
  `).get(userId).count;

  const weeklyTrophies = db.prepare(`
    SELECT COUNT(*) as count FROM user_trophies 
    WHERE user_id = ? AND trophy_type = 'weekly'
  `).get(userId).count;

  // Letzte Trophäen
  const recentTrophies = db.prepare(`
    SELECT * FROM user_trophies 
    WHERE user_id = ? 
    ORDER BY earned_date DESC 
    LIMIT 10
  `).all(userId);

  return {
    todayMinutes: todayMinutes,
    todaySeconds: todayActivity.seconds_practiced || 0,
    todayGoalAchieved: todayActivity.goal_achieved === 1,
    currentStreak,
    dailyTrophies,
    weeklyTrophies,
    totalTrophies: dailyTrophies + weeklyTrophies,
    recentTrophies,
    needsMinutes: Math.max(0, Math.round((15 - todayMinutes) * 10) / 10)
  };
}

// Hilfsfunktion: Prüfe und vergebe Wochen-Trophäe
function checkAndAwardWeeklyTrophy(userId) {
  const today = getTodayDate();
  
  // Prüfe ob die letzten 7 Tage alle geschafft wurden
  let allAchieved = true;
  for (let i = 0; i < 7; i++) {
    const checkDate = getDateDaysAgo(i);
    const activity = db.prepare(`
      SELECT goal_achieved FROM daily_activity WHERE user_id = ? AND date = ?
    `).get(userId, checkDate);
    
    if (!activity || !activity.goal_achieved) {
      allAchieved = false;
      break;
    }
  }

  if (allAchieved) {
    // Prüfe ob diese Woche schon Trophäe vergeben
    const weekStart = getDateDaysAgo(6);
    const existingWeeklyTrophy = db.prepare(`
      SELECT * FROM user_trophies 
      WHERE user_id = ? AND trophy_type = 'weekly' 
      AND earned_date >= ? AND earned_date <= ?
    `).get(userId, weekStart, today);

    if (!existingWeeklyTrophy) {
      db.prepare(`
        INSERT INTO user_trophies (user_id, trophy_type, earned_date, streak_days)
        VALUES (?, 'weekly', ?, 7)
      `).run(userId, today);
    }
  }
}

// POST /api/gamification/reset-streak - Streak zurücksetzen (bei versäumtem Tag)
router.post('/reset-streak', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const yesterday = getDateDaysAgo(1);
    
    // Prüfe ob gestern die Aktivität verpasst wurde
    const yesterdayActivity = db.prepare(`
      SELECT * FROM daily_activity WHERE user_id = ? AND date = ?
    `).get(userId, yesterday);

    if (!yesterdayActivity || !yesterdayActivity.goal_achieved) {
      // Lösche alle Trophäen (hartes Reset)
      db.prepare(`DELETE FROM user_trophies WHERE user_id = ?`).run(userId);
      db.prepare(`DELETE FROM daily_activity WHERE user_id = ?`).run(userId);
      
      res.json({ message: 'Streak reset due to missed day', streakLost: true });
    } else {
      res.json({ message: 'No reset needed', streakLost: false });
    }
  } catch (error) {
    console.error('Error resetting streak:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
