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
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  console.log('🔑 OpenAI API Key status:', {
    exists: !!API_KEY,
    length: API_KEY ? API_KEY.length : 0,
    prefix: API_KEY ? API_KEY.substring(0, 7) + '...' : 'none'
  });
  
  // Wenn kein API-Key vorhanden ist, verwende Simulation
  if (!API_KEY) {
    console.warn('⚠️ No OpenAI API key found, using simulation mode');
    return simulateEvaluation(germanSentence, userTranslation, correctTranslation);
  }
  
  console.log('✨ Using OpenAI API for translation evaluation');
  
  // Echte OpenAI-Integration (nur wenn API-Key vorhanden)
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'Du bist ein hilfreicher Englischlehrer. Bewerte die Übersetzung auf einer Skala von 1-10 und gib konstruktives Feedback. Antworte im JSON-Format: {"score": number, "feedback": string, "improvements": string[]}'
        }, {
          role: 'user',
          content: `Deutscher Satz: "${germanSentence}"\nÜbersetzung des Schülers: "${userTranslation}"\nMusterlösung: "${correctTranslation}"\n\nBitte bewerte die Übersetzung.`
        }],
        temperature: 0.7,
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      return {
        score: parsed.score || 5,
        feedback: parsed.feedback || 'Gute Übersetzung!',
        improvements: parsed.improvements || [],
        correctTranslation
      };
    } catch {
      // Fallback wenn JSON-Parsing fehlschlägt
      return simulateEvaluation(germanSentence, userTranslation, correctTranslation);
    }
  } catch (error) {
    console.error('OpenAI API failed, falling back to simulation:', error);
    return simulateEvaluation(germanSentence, userTranslation, correctTranslation);
  }
}

/**
 * Simulierte Bewertung (funktioniert ohne API-Key)
 */
function simulateEvaluation(germanSentence, userTranslation, correctTranslation) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const similarity = calculateSimilarity(userTranslation.toLowerCase(), correctTranslation.toLowerCase());
      const score = Math.round(similarity * 10);
      
      let feedback = '';
      let improvements = [];
      
      if (score >= 9) {
        feedback = 'Ausgezeichnet! Deine Übersetzung ist nahezu perfekt. 🎉';
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
    }, 800); // Simuliere API-Latenz
  });
}

/**
 * Generiert einen deutschen Satz zum Übersetzen mit Hilfe eines LLM
 * @param {string} level - Sprachniveau (B2, C1, C2)
 * @returns {Promise<{de: string, en: string}>}
 */
export async function generateTranslationSentence(level = 'B2') {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  console.log('📝 Generating translation sentence, API Key exists:', !!API_KEY);
  
  if (!API_KEY) {
    console.warn('⚠️ No OpenAI API key, using fallback sentences');
    return getFallbackSentence(level);
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `Du bist ein Englischlehrer. Generiere einen deutschen Satz auf ${level}-Niveau zum Übersetzen ins Englische. Der Satz sollte interessant und lehrreich sein. Antworte im JSON-Format: {"de": "deutscher Satz", "en": "englische Übersetzung"}`
        }, {
          role: 'user',
          content: `Generiere einen neuen deutschen Satz auf ${level}-Niveau mit der korrekten englischen Übersetzung.`
        }],
        temperature: 0.8,
        max_tokens: 150
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      console.log('✨ Generated sentence via OpenAI:', parsed);
      return {
        de: parsed.de || parsed.german || 'Fehler beim Generieren',
        en: parsed.en || parsed.english || 'Error generating'
      };
    } catch {
      throw new Error('Failed to parse OpenAI response');
    }
  } catch (error) {
    console.error('OpenAI sentence generation failed, using fallback:', error);
    return getFallbackSentence(level);
  }
}

/**
 * Fallback-Sätze wenn keine API verfügbar ist
 */
function getFallbackSentence(level) {
  const sentences = {
    B2: [
      { de: "Die zunehmende Digitalisierung verändert unsere Arbeitswelt grundlegend.", en: "Increasing digitalization is fundamentally changing our world of work." },
      { de: "Trotz der Herausforderungen haben wir unser Ziel erreicht.", en: "Despite the challenges, we achieved our goal." },
      { de: "Die Wissenschaftler haben eine bahnbrechende Entdeckung gemacht.", en: "The scientists have made a groundbreaking discovery." },
      { de: "Nachhaltige Entwicklung ist eine der größten Herausforderungen unserer Zeit.", en: "Sustainable development is one of the greatest challenges of our time." }
    ],
    C1: [
      { de: "Die gesellschaftlichen Auswirkungen des Klimawandels werden oft unterschätzt.", en: "The societal impacts of climate change are often underestimated." },
      { de: "Angesichts der komplexen Situation müssen wir alternative Lösungsansätze in Betracht ziehen.", en: "Given the complex situation, we must consider alternative approaches to solutions." },
      { de: "Die Authentizität seiner Argumentation wurde von mehreren Experten in Frage gestellt.", en: "The authenticity of his argumentation was questioned by several experts." },
      { de: "Zwischenmenschliche Beziehungen erfordern kontinuierliche Kommunikation und gegenseitiges Verständnis.", en: "Interpersonal relationships require continuous communication and mutual understanding." }
    ],
    C2: [
      { de: "Die ambivalente Haltung der Regierung gegenüber den Reformen spiegelt die Zerrissenheit der Gesellschaft wider.", en: "The government's ambivalent stance toward the reforms reflects society's divisiveness." },
      { de: "Sein eloquentes Plädoyer für mehr soziale Gerechtigkeit fand breite Zustimmung unter den Anwesenden.", en: "His eloquent plea for greater social justice found broad approval among those present." }
    ]
  };
  
  const levelSentences = sentences[level] || sentences.B2;
  const random = levelSentences[Math.floor(Math.random() * levelSentences.length)];
  console.log('📚 Using fallback sentence:', random);
  return random;
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

/**
 * Generiert ein Dialog-Szenario
 * @param {string} level - Sprachniveau (B2, C1, C2)
 * @returns {Promise<{situation: string, role: string, context: string}>}
 */
export async function generateDialogScenario(level = 'B2') {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!API_KEY) {
    return getFallbackScenario(level);
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `Du bist ein Englischlehrer. Erstelle ein realistisches Gesprächsszenario auf ${level}-Niveau für Englischlerner. Antworte im JSON-Format: {"situation": "kurze Beschreibung", "role": "deine Rolle", "context": "zusätzlicher Kontext"}`
        }, {
          role: 'user',
          content: `Erstelle ein neues Konversationsszenario auf ${level}-Niveau.`
        }],
        temperature: 0.8,
        max_tokens: 200
      })
    });
    
    if (!response.ok) throw new Error('API error');
    
    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed;
  } catch (error) {
    console.error('Dialog scenario generation failed, using fallback:', error);
    return getFallbackScenario(level);
  }
}

/**
 * Generiert eine Antwort im Dialog
 */
export async function generateDialogResponse(scenario, conversationHistory, level = 'B2') {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!API_KEY) {
    return getFallbackResponse();
  }
  
  try {
    const messages = [
      {
        role: 'system',
        content: `Du bist ein Gesprächspartner in folgendem Szenario: ${scenario.situation}. Deine Rolle: ${scenario.role}. Antworte natürlich und auf ${level}-Niveau.`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    ];
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 150
      })
    });
    
    if (!response.ok) throw new Error('API error');
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Dialog response generation failed:', error);
    return getFallbackResponse();
  }
}

/**
 * Generiert einen Hinweis für den Dialog
 */
export async function generateDialogHint(scenario, conversationHistory) {
  const hints = [
    "Versuche eine offene Frage zu stellen",
    "Nutze Phrasen wie 'Could you...' oder 'Would you mind...'",
    "Frage nach weiteren Details",
    "Drücke deine Meinung höflich aus"
  ];
  return hints[Math.floor(Math.random() * hints.length)];
}

/**
 * Bewertet die Dialog-Performance
 */
export async function evaluateDialogPerformance(conversationHistory, level) {
  const messageCount = conversationHistory.filter(m => m.role === 'user').length;
  const score = Math.min(10, Math.max(1, messageCount * 2));
  
  return {
    score,
    feedback: score >= 8 ? 'Sehr gut! Du hast aktiv am Gespräch teilgenommen.' : 'Gut gemacht! Versuche noch mehr ins Gespräch einzubringen.',
    strengths: ['Aktive Teilnahme', 'Gute Gesprächsführung'],
    improvements: score < 8 ? ['Stelle mehr Fragen', 'Gehe mehr ins Detail'] : []
  };
}

/**
 * Fallback-Szenarios
 */
function getFallbackScenario(level) {
  const scenarios = [
    {
      situation: "At a job interview",
      role: "Hiring manager at a tech company",
      context: "You're interviewing for a software developer position"
    },
    {
      situation: "At a restaurant",
      role: "Waiter at an upscale restaurant",
      context: "You're ordering dinner with business colleagues"
    },
    {
      situation: "At a doctor's office",
      role: "Medical receptionist",
      context: "You need to schedule an appointment"
    }
  ];
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

/**
 * Fallback-Antworten
 */
function getFallbackResponse() {
  const responses = [
    "That's interesting. Could you tell me more about that?",
    "I see. What do you think about this?",
    "Thank you for sharing. How does that make you feel?",
    "Interesting perspective. What else can you tell me?"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
