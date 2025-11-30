// LLM Service für KI-basierte Bewertung und Generierung
// Diese Funktionen können mit verschiedenen LLM-APIs verbunden werden (OpenAI, Anthropic, lokale Modelle, etc.)

const USE_REAL_LLM = !!import.meta.env.VITE_OPENAI_API_KEY;

/**
 * Evaluiert eine Übersetzung mit Hilfe eines LLM
 * @param {string} germanSentence - Der deutsche Satz
 * @param {string} userTranslation - Die Übersetzung des Benutzers
 * @param {string} correctTranslation - Die korrekte Übersetzung (optional)
 * @returns {Promise<{score: number, feedback: string, improvements: string[], correctTranslation: string}>}
 */
export async function evaluateTranslation(germanSentence, userTranslation, correctTranslation = '') {
  // Wenn OpenAI API Key vorhanden ist, nutze echtes LLM
  if (USE_REAL_LLM) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: `Du bist ein erfahrener Englischlehrer. Bewerte die Übersetzung des Schülers und gib konstruktives Feedback. 
            
Antworte ausschließlich mit einem JSON-Objekt in folgendem Format (ohne Markdown-Formatierung):
{
  "score": <Zahl von 1-10>,
  "feedback": "<Dein Feedback in 1-2 Sätzen>",
  "improvements": ["<Verbesserungsvorschlag 1>", "<Verbesserungsvorschlag 2>"]
}`
          }, {
            role: 'user',
            content: `Deutscher Satz: "${germanSentence}"
Übersetzung des Schülers: "${userTranslation}"
Musterlösung: "${correctTranslation}"

Bitte bewerte die Übersetzung.`
          }]
        })
      });
      
      if (!response.ok) {
        console.error('OpenAI API Error:', response.status);
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON aus der Antwort
      let result;
      try {
        // Entferne mögliche Markdown-Formatierung
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(jsonStr);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        throw new Error('Failed to parse LLM response');
      }
      
      return {
        score: result.score || 5,
        feedback: result.feedback || 'Übersetzung erhalten.',
        improvements: result.improvements || [],
        correctTranslation
      };
      
    } catch (error) {
      console.error('LLM Error, falling back to simulation:', error);
      // Fallback auf Simulation
      return simulateEvaluation(germanSentence, userTranslation, correctTranslation);
    }
  }
  
  // Simulierte Bewertung für Demo
  return simulateEvaluation(germanSentence, userTranslation, correctTranslation);
}

/**
 * Simulierte Bewertung als Fallback
 */
function simulateEvaluation(germanSentence, userTranslation, correctTranslation) {
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
 * Generiert einen deutschen Satz auf B2-C1 Niveau zum Übersetzen
 * @returns {Promise<{de: string, en: string, id: number}>}
 */
export async function generateTranslationSentence() {
  if (USE_REAL_LLM) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: `Du bist ein Englischlehrer. Generiere einen deutschen Satz zum Übersetzen ins Englische auf B2-C1 Sprachniveau.

Der Satz sollte:
- Interessant und abwechslungsreich sein
- Grammatikalisch anspruchsvoll sein (z.B. Konjunktiv, Passiv, Nebensätze)
- Alltagsrelevant oder aus verschiedenen Themenbereichen sein
- Nicht zu lang sein (max. 20 Wörter)

Antworte ausschließlich mit einem JSON-Objekt (ohne Markdown):
{
  "de": "<Deutscher Satz>",
  "en": "<Englische Übersetzung>"
}`
          }, {
            role: 'user',
            content: 'Generiere einen neuen Übersetzungssatz auf B2-C1 Niveau.'
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(jsonStr);
      
      return {
        id: Date.now(),
        de: result.de,
        en: result.en
      };
      
    } catch (error) {
      console.error('LLM Error generating sentence:', error);
      return getRandomFallbackSentence();
    }
  }
  
  return getRandomFallbackSentence();
}

/**
 * Fallback Sätze wenn LLM nicht verfügbar
 */
function getRandomFallbackSentence() {
  const fallbackSentences = [
    { de: "Obwohl er sich intensiv vorbereitet hatte, fiel ihm die Prüfung schwerer als erwartet.", en: "Although he had prepared intensively, the exam was harder than he expected." },
    { de: "Die Entwicklung neuer Technologien hat unser tägliches Leben grundlegend verändert.", en: "The development of new technologies has fundamentally changed our daily lives." },
    { de: "Es wäre besser gewesen, wenn wir früher über die Konsequenzen nachgedacht hätten.", en: "It would have been better if we had thought about the consequences earlier." },
    { de: "Der Klimawandel stellt eine der größten Herausforderungen unserer Generation dar.", en: "Climate change represents one of the greatest challenges of our generation." },
    { de: "Je mehr man sich mit komplexen Themen beschäftigt, desto mehr Fragen entstehen.", en: "The more one deals with complex topics, the more questions arise." },
    { de: "Die Forscherin wurde für ihre bahnbrechenden Erkenntnisse ausgezeichnet.", en: "The researcher was awarded for her groundbreaking discoveries." },
    { de: "Angesichts der wirtschaftlichen Lage müssen wir unsere Strategie überdenken.", en: "In view of the economic situation, we need to reconsider our strategy." },
    { de: "Er hätte nicht erwartet, dass seine Idee auf so viel Begeisterung stoßen würde.", en: "He wouldn't have expected his idea to meet with so much enthusiasm." },
    { de: "Die zunehmende Digitalisierung wirft wichtige ethische Fragen auf.", en: "Increasing digitalization raises important ethical questions." },
    { de: "Trotz wiederholter Versuche gelang es ihr nicht, das Problem zu lösen.", en: "Despite repeated attempts, she didn't succeed in solving the problem." },
    { de: "Die Entscheidung wurde nach reiflicher Überlegung getroffen.", en: "The decision was made after careful consideration." },
    { de: "Man sollte nicht unterschätzen, wie wichtig gute Kommunikation ist.", en: "One shouldn't underestimate how important good communication is." },
  ];
  
  const randomIndex = Math.floor(Math.random() * fallbackSentences.length);
  return {
    id: Date.now(),
    ...fallbackSentences[randomIndex]
  };
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
