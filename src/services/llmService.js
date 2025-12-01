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
 * Generiert ein Gesprächsszenario für den Dialog-Trainer
 * @returns {Promise<{description: string, role: string, firstMessage: string}>}
 */
export async function generateDialogScenario() {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!API_KEY) {
    // Simulationsmodus - erstelle ein zufälliges Szenario
    const scenarios = [
      {
        description: "Du bist in einem Café in London und möchtest etwas bestellen.",
        role: "Kellner/Kellnerin",
        firstMessage: "Good morning! Welcome to our café. What can I get you today?"
      },
      {
        description: "Du bist am Flughafen und fragst nach deinem Gate.",
        role: "Flughafen-Mitarbeiter",
        firstMessage: "Hello! How can I help you today?"
      },
      {
        description: "Du bist in einem Geschäft und suchst nach einem bestimmten Produkt.",
        role: "Verkäufer/Verkäuferin",
        firstMessage: "Good afternoon! Are you looking for something specific?"
      },
      {
        description: "Du triffst einen neuen Kollegen am ersten Arbeitstag.",
        role: "Neuer Kollege",
        firstMessage: "Hi there! You must be the new team member. Welcome! How are you settling in?"
      },
      {
        description: "Du bist im Hotel und hast ein Problem mit deinem Zimmer.",
        role: "Hotel-Rezeptionist",
        firstMessage: "Good evening! How can I assist you today?"
      }
    ];
    
    return scenarios[Math.floor(Math.random() * scenarios.length)];
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
          content: 'Du erstellst realistische Gesprächsszenarios für Englischlernende. Erstelle ein Szenario mit einer Beschreibung auf Deutsch, der Rolle des Gesprächspartners und einer ersten Nachricht auf Englisch. Antworte im JSON-Format: {"description": string, "role": string, "firstMessage": string}'
        }, {
          role: 'user',
          content: 'Erstelle ein realistisches Alltagsszenario für ein Englisch-Gespräch (B2-C1 Level).'
        }],
        temperature: 0.9,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Failed to generate scenario with OpenAI:', error);
    // Fallback zu Simulation
    const scenarios = [
      {
        description: "Du bist in einem Restaurant und bestellst Essen.",
        role: "Kellner/Kellnerin",
        firstMessage: "Good evening! Here's the menu. Can I get you something to drink while you decide?"
      }
    ];
    return scenarios[0];
  }
}

/**
 * Generiert eine Antwort der LLM im Dialog
 * @param {object} scenario - Das aktuelle Szenario
 * @param {Array} conversationHistory - Die bisherige Konversation
 * @returns {Promise<string>}
 */
export async function generateDialogResponse(scenario, conversationHistory) {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!API_KEY) {
    // Simulationsmodus - generiere eine einfache Antwort
    const responses = [
      "That sounds interesting! Could you tell me more about that?",
      "I see. And what would you like to do next?",
      "Great! Is there anything else I can help you with?",
      "Perfect! Let me take care of that for you.",
      "I understand. Would you like me to explain that in more detail?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  try {
    const systemPrompt = `Du spielst die Rolle: ${scenario.role}. 
Szenario: ${scenario.description}
Führe ein natürliches Gespräch auf Englisch (B2-C1 Level). 
Bleibe in deiner Rolle und reagiere angemessen auf die Antworten des Lernenden.
Halte deine Antworten kurz und natürlich (1-3 Sätze).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Failed to generate dialog response:', error);
    return "I'm sorry, could you repeat that? I didn't quite catch what you said.";
  }
}

/**
 * Generiert einen Tipp für den Benutzer auf Deutsch
 * @param {object} scenario - Das aktuelle Szenario
 * @param {Array} conversationHistory - Die bisherige Konversation
 * @returns {Promise<string>}
 */
export async function generateDialogHint(scenario, conversationHistory) {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!API_KEY) {
    // Simulationsmodus
    return "Versuche auf Englisch zu antworten und bleibe im Gespräch. Frage nach Details oder antworte auf die gestellte Frage.";
  }

  try {
    const systemPrompt = `Du bist ein Englischlehrer. 
Szenario: ${scenario.description}
Rolle des Gesprächspartners: ${scenario.role}

Gib einen kurzen, hilfreichen Tipp auf DEUTSCH, was der Lernende als nächstes auf Englisch sagen könnte. 
Gib keine komplette Übersetzung, sondern nur einen Hinweis oder eine Idee (1-2 Sätze auf Deutsch).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: 'Gib mir einen Tipp auf Deutsch, was ich antworten könnte.' }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Failed to generate hint:', error);
    return "Tipp: Antworte freundlich und stelle bei Bedarf eine Rückfrage, um das Gespräch fortzuführen.";
  }
}
