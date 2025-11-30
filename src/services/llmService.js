// LLM Service für KI-basierte Bewertung und Generierung
// Diese Funktionen können mit verschiedenen LLM-APIs verbunden werden (OpenAI, Anthropic, lokale Modelle, etc.)

/**
 * Evaluiert eine Übersetzung mit Hilfe eines LLM
 * @param {string} germanSentence - Der deutsche Satz
 * @param {string} userTranslation - Die Übersetzung des Benutzers
 * @param {string} correctTranslation - Die korrekte Übersetzung (optional)
 * @returns {Promise<{score: number, feedback: string, improvements: string[], correctTranslation: string}>}
 */
export async function evaluateTranslation(germanSentence, userTranslation, correctTranslation = '') {
  // Simulierte LLM-Antwort für Demo-Zwecke
  // In Produktion würde hier ein echter API-Call stattfinden
  
  // Beispiel für einen echten API-Call (auskommentiert):
  /*
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'Du bist ein Englischlehrer. Bewerte die Übersetzung und gib konstruktives Feedback.'
      }, {
        role: 'user',
        content: `Deutscher Satz: "${germanSentence}"\nÜbersetzung des Schülers: "${userTranslation}"\nMusterlösung: "${correctTranslation}"\n\nBitte bewerte die Übersetzung auf einer Skala von 1-10 und gib Feedback.`
      }]
    })
  });
  
  const data = await response.json();
  // Parse die Antwort und extrahiere Score, Feedback, etc.
  */
  
  // Simulierte Bewertung für Demo
  return new Promise((resolve) => {
    setTimeout(() => {
      const similarity = calculateSimilarity(userTranslation.toLowerCase(), correctTranslation.toLowerCase());
      const score = Math.round(similarity * 10);
      
      let feedback = '';
      let improvements = [];
      
      if (score >= 9) {
        feedback = 'Ausgezeichnet! Deine Übersetzung ist nahezu perfekt.';
      } else if (score >= 7) {
        feedback = 'Sehr gut! Deine Übersetzung ist korrekt, könnte aber noch natürlicher klingen.';
        improvements.push('Versuche, idiomatischere Ausdrücke zu verwenden');
      } else if (score >= 5) {
        feedback = 'Gut! Die grundlegende Bedeutung ist richtig, aber es gibt Raum für Verbesserungen.';
        improvements.push('Achte auf die Wortstellung');
        improvements.push('Überprüfe die verwendeten Zeitformen');
      } else {
        feedback = 'Nicht schlecht für einen Versuch! Lass uns gemeinsam daran arbeiten.';
        improvements.push('Achte auf die Grundstruktur des Satzes');
        improvements.push('Überprüfe die Vokabeln');
        improvements.push('Beachte die Grammatik');
      }
      
      resolve({
        score,
        feedback,
        improvements,
        correctTranslation
      });
    }, 1000); // Simuliere API-Latenz
  });
}

/**
 * Generiert eine Vokabel-Challenge mit Hilfe eines LLM
 * @param {string} difficulty - Schwierigkeitsgrad (easy, medium, hard)
 * @param {string} category - Kategorie (optional)
 * @returns {Promise<{word: string, translation: string, example: string}>}
 */
export async function generateVocabularyChallenge(difficulty = 'medium', category = '') {
  // Simulierte LLM-Antwort für Demo-Zwecke
  return new Promise((resolve) => {
    setTimeout(() => {
      const challenges = {
        easy: [
          { de: 'Apfel', en: 'apple', example: 'An apple a day keeps the doctor away.' },
          { de: 'Brot', en: 'bread', example: 'I eat bread for breakfast.' },
          { de: 'Milch', en: 'milk', example: 'Do you want milk in your coffee?' }
        ],
        medium: [
          { de: 'Freundschaft', en: 'friendship', example: 'Their friendship lasted for years.' },
          { de: 'Verantwortung', en: 'responsibility', example: 'It is your responsibility.' },
          { de: 'Gelegenheit', en: 'opportunity', example: 'This is a great opportunity.' }
        ],
        hard: [
          { de: 'Durchsetzungsvermögen', en: 'assertiveness', example: 'Assertiveness is an important skill.' },
          { de: 'Nachhaltigkeit', en: 'sustainability', example: 'We need to focus on sustainability.' },
          { de: 'Gewissenhaft', en: 'conscientious', example: 'She is a conscientious worker.' }
        ]
      };
      
      const level = challenges[difficulty] || challenges.medium;
      const randomChallenge = level[Math.floor(Math.random() * level.length)];
      
      resolve(randomChallenge);
    }, 500);
  });
}

/**
 * Hilfsfunktion zur Berechnung der Ähnlichkeit zwischen zwei Strings
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein-Distanz zur Messung der Ähnlichkeit
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Konfiguration für LLM-API (Beispiel)
 * Erstelle eine .env Datei mit deinen API-Keys:
 * VITE_OPENAI_API_KEY=your_key_here
 * VITE_ANTHROPIC_API_KEY=your_key_here
 */
export const LLM_CONFIG = {
  provider: 'openai', // 'openai', 'anthropic', 'local', etc.
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 500
};
