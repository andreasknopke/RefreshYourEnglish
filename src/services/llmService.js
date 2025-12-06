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
 * @param {string} topic - Themenbereich (optional)
 * @returns {Promise<{de: string, en: string}>}
 */
export async function generateTranslationSentence(level = 'B2', topic = 'Alltag') {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  console.log('📝 Generating translation sentence, API Key exists:', !!API_KEY);
  
  if (!API_KEY) {
    console.warn('⚠️ No OpenAI API key, using fallback sentences');
    return getFallbackSentence(level, topic);
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
          content: `Du bist ein Englischlehrer. Generiere einen deutschen Satz auf ${level}-Niveau zum Thema "${topic}" zum Übersetzen ins Englische. Der Satz sollte interessant und lehrreich sein. Antworte im JSON-Format: {"de": "deutscher Satz", "en": "englische Übersetzung"}`
        }, {
          role: 'user',
          content: `Generiere einen neuen deutschen Satz auf ${level}-Niveau zum Thema "${topic}" mit der korrekten englischen Übersetzung.`
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
    return getFallbackSentence(level, topic);
  }
}

/**
 * Fallback-Sätze wenn keine API verfügbar ist
 */
function getFallbackSentence(level, topic = 'Alltag') {
  const sentences = {
    B2: {
      'Politik': [
        { de: "Die Regierung kündigte neue Maßnahmen zur Bekämpfung des Klimawandels an.", en: "The government announced new measures to combat climate change." },
        { de: "Die Wahlbeteiligung bei der letzten Bundestagswahl war überraschend hoch.", en: "The voter turnout in the last federal election was surprisingly high." }
      ],
      'Sport': [
        { de: "Der Fußballverein gewann das Finale in letzter Minute.", en: "The football club won the final in the last minute." },
        { de: "Die Athletin brach den Weltrekord im Hochsprung.", en: "The athlete broke the world record in high jump." }
      ],
      'Literatur': [
        { de: "Der Roman wurde von Kritikern weltweit gelobt.", en: "The novel was praised by critics worldwide." },
        { de: "Die Autorin erhielt einen renommierten Literaturpreis.", en: "The author received a prestigious literary award." }
      ],
      'Film, Musik, Kunst': [
        { de: "Die Ausstellung zeitgenössischer Kunst zog viele Besucher an.", en: "The contemporary art exhibition attracted many visitors." },
        { de: "Der Film gewann mehrere Oscars bei der diesjährigen Verleihung.", en: "The film won several Oscars at this year's ceremony." }
      ],
      'Alltag': [
        { de: "Die zunehmende Digitalisierung verändert unsere Arbeitswelt grundlegend.", en: "Increasing digitalization is fundamentally changing our world of work." },
        { de: "Trotz der Herausforderungen haben wir unser Ziel erreicht.", en: "Despite the challenges, we achieved our goal." }
      ],
      'Persönliche Gespräche': [
        { de: "Wir sollten uns bald mal wieder treffen und über alte Zeiten reden.", en: "We should meet up soon and talk about old times." },
        { de: "Ich freue mich sehr auf deinen Besuch nächste Woche.", en: "I'm really looking forward to your visit next week." }
      ]
    },
    C1: {
      'Politik': [
        { de: "Die gesellschaftlichen Auswirkungen des Klimawandels werden oft unterschätzt.", en: "The societal impacts of climate change are often underestimated." },
        { de: "Die diplomatischen Beziehungen zwischen den beiden Ländern haben sich deutlich verbessert.", en: "Diplomatic relations between the two countries have improved significantly." }
      ],
      'Sport': [
        { de: "Die olympischen Spiele fördern den internationalen Zusammenhalt und sportlichen Ehrgeiz.", en: "The Olympic Games promote international unity and athletic ambition." }
      ],
      'Literatur': [
        { de: "Die Authentizität seiner Argumentation wurde von mehreren Experten in Frage gestellt.", en: "The authenticity of his argumentation was questioned by several experts." }
      ],
      'Film, Musik, Kunst': [
        { de: "Die Symphonie vereint klassische Elemente mit modernen experimentellen Klängen.", en: "The symphony combines classical elements with modern experimental sounds." }
      ],
      'Alltag': [
        { de: "Angesichts der komplexen Situation müssen wir alternative Lösungsansätze in Betracht ziehen.", en: "Given the complex situation, we must consider alternative approaches to solutions." }
      ],
      'Persönliche Gespräche': [
        { de: "Zwischenmenschliche Beziehungen erfordern kontinuierliche Kommunikation und gegenseitiges Verständnis.", en: "Interpersonal relationships require continuous communication and mutual understanding." }
      ]
    },
    C2: {
      'Politik': [
        { de: "Die ambivalente Haltung der Regierung gegenüber den Reformen spiegelt die Zerrissenheit der Gesellschaft wider.", en: "The government's ambivalent stance toward the reforms reflects society's divisiveness." }
      ],
      'Sport': [
        { de: "Seine außergewöhnliche Leistung demonstrierte eindrucksvoll die Synthese aus jahrelangem Training und mentaler Stärke.", en: "His exceptional performance impressively demonstrated the synthesis of years of training and mental strength." }
      ],
      'Literatur': [
        { de: "Sein eloquentes Plädoyer für mehr soziale Gerechtigkeit fand breite Zustimmung unter den Anwesenden.", en: "His eloquent plea for greater social justice found broad approval among those present." }
      ],
      'Film, Musik, Kunst': [
        { de: "Die postmoderne Inszenierung hinterfragt konventionelle narrative Strukturen auf provokante Weise.", en: "The postmodern production provocatively questions conventional narrative structures." }
      ],
      'Alltag': [
        { de: "Die Komplexität moderner Lebensführung erfordert eine ausgeprägte Fähigkeit zur Priorisierung.", en: "The complexity of modern life requires a pronounced ability to prioritize." }
      ],
      'Persönliche Gespräche': [
        { de: "Unsere jahrelange Freundschaft basiert auf gegenseitigem Respekt und unerschütterlichem Vertrauen.", en: "Our long-standing friendship is based on mutual respect and unwavering trust." }
      ]
    }
  };
  
  const levelSentences = sentences[level]?.[topic] || sentences.B2['Alltag'];
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
 * @param {string} topic - Themenbereich (optional)
 * @returns {Promise<{situation: string, role: string, context: string, firstMessage: string, description: string}>}
 */
export async function generateDialogScenario(level = 'B2', topic = 'Alltag') {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!API_KEY) {
    return getFallbackScenario(level, topic);
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
          content: `You are an English teacher creating conversation scenarios for German learners. Create a realistic conversation scenario at ${level} level about "${topic}". CRITICAL: The "firstMessage" MUST be in English only, as the student needs to practice English. The "description" should be in German to help them understand the context. Respond in JSON format: {"description": "German description of the scenario", "firstMessage": "First message in ENGLISH to start the conversation"}`
        }, {
          role: 'user',
          content: `Create a new conversation scenario at ${level} level about "${topic}". Remember: firstMessage MUST be in English!`
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
    return getFallbackScenario(level, topic);
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
        content: `You are a conversation partner in the following scenario: ${scenario.description}. 

CRITICAL RULES:
1. You MUST respond ONLY in English - never use German or any other language
2. Stay strictly within the scenario context: ${scenario.description}
3. Refer to and build upon the user's previous messages
4. Match the language level: ${level}
5. Be natural and conversational, but stay in character
6. If the user goes off-topic, gently guide them back to the scenario

Respond naturally in English while staying in the scenario context.`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
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
export async function evaluateDialogPerformance(scenario, conversationHistory, level) {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!API_KEY) {
    // Fallback evaluation
    const userMessages = conversationHistory.filter(m => m.role === 'user');
    const messageCount = userMessages.length;
    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / messageCount;
    
    return {
      correctness: Math.min(10, Math.max(5, Math.round(avgLength / 10))),
      appropriateness: Math.min(10, Math.max(5, messageCount)),
      languageLevel: level,
      feedback: 'Gute Leistung! Du hast aktiv am Gespräch teilgenommen.',
      tips: ['Versuche vollständige Sätze zu bilden', 'Stelle offene Fragen']
    };
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
          content: `You are an English language teacher evaluating a student's performance in a conversation scenario: "${scenario.description}".

Evaluate the student's performance based on:
1. CORRECTNESS (1-10): Grammar, vocabulary, and sentence structure
2. APPROPRIATENESS (1-10): How well they stayed in the scenario context and responded relevantly to the conversation partner
3. LANGUAGE LEVEL: Estimate their actual level (A1, A2, B1, B2, C1, C2)

Provide constructive feedback in German and practical tips for improvement.

Respond in JSON format:
{
  "correctness": 1-10,
  "appropriateness": 1-10,
  "languageLevel": "A1|A2|B1|B2|C1|C2",
  "feedback": "Detailed feedback in German about their performance",
  "tips": ["Tip 1 in German", "Tip 2 in German"]
}`
        }, {
          role: 'user',
          content: `Evaluate this conversation at target level ${level}:\n\n${conversationHistory.map(m => `${m.role === 'user' ? 'STUDENT' : 'PARTNER'}: ${m.content}`).join('\n\n')}`
        }],
        temperature: 0.3,
        max_tokens: 400
      })
    });
    
    if (!response.ok) throw new Error('API error');
    
    const data = await response.json();
    const evaluation = JSON.parse(data.choices[0].message.content);
    
    return evaluation;
  } catch (error) {
    console.error('Dialog evaluation failed, using fallback:', error);
    // Fallback
    const userMessages = conversationHistory.filter(m => m.role === 'user');
    const messageCount = userMessages.length;
    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / messageCount;
    
    return {
      correctness: Math.min(10, Math.max(5, Math.round(avgLength / 10))),
      appropriateness: Math.min(10, Math.max(5, messageCount)),
      languageLevel: level,
      feedback: 'Gute Leistung! Du hast aktiv am Gespräch teilgenommen.',
      tips: ['Versuche vollständige Sätze zu bilden', 'Stelle offene Fragen']
    };
  }
}

/**
 * Fallback-Szenarios
 */
function getFallbackScenario(level, topic = 'Alltag') {
  const scenarios = {
    'Politik': [
      {
        description: "Political discussion at a town hall meeting",
        firstMessage: "Hello! I'm interested in hearing your thoughts on the upcoming local elections. What issues matter most to you?"
      },
      {
        description: "Debate about environmental policies",
        firstMessage: "Good afternoon! I'm conducting a survey about environmental policies. Do you have a few minutes to share your opinion?"
      }
    ],
    'Sport': [
      {
        description: "At a sports club registration desk",
        firstMessage: "Welcome to our sports club! Are you interested in joining any particular sport or fitness program?"
      },
      {
        description: "Discussion about a recent sporting event",
        firstMessage: "Did you watch the big game yesterday? What did you think about the final result?"
      }
    ],
    'Literatur': [
      {
        description: "At a bookstore or library",
        firstMessage: "Hello! I see you're browsing the literature section. Are you looking for anything specific today?"
      },
      {
        description: "Book club discussion",
        firstMessage: "Welcome to our book club! Have you read this month's selection yet? What are your initial thoughts?"
      }
    ],
    'Film, Musik, Kunst': [
      {
        description: "At a museum or art gallery",
        firstMessage: "Good afternoon! I'm the gallery guide. Would you like to hear about the current exhibition?"
      },
      {
        description: "Discussion about a new movie release",
        firstMessage: "Hi! I heard you just saw the new movie everyone's talking about. What did you think of it?"
      }
    ],
    'Alltag': [
      {
        description: "At a job interview",
        firstMessage: "Good morning! Thank you for coming in today. Could you start by telling me a bit about yourself and your background?"
      },
      {
        description: "At a restaurant",
        firstMessage: "Good evening! Welcome to our restaurant. Have you dined with us before, or is this your first visit?"
      },
      {
        description: "At a doctor's office",
        firstMessage: "Hello, I'm the receptionist. How can I help you today? Do you need to schedule an appointment?"
      }
    ],
    'Persönliche Gespräche': [
      {
        description: "Meeting an old friend",
        firstMessage: "Hey! It's been so long! How have you been? What have you been up to lately?"
      },
      {
        description: "Getting to know a new neighbor",
        firstMessage: "Hi there! I just moved in next door. I wanted to introduce myself and say hello!"
      }
    ]
  };
  
  const topicScenarios = scenarios[topic] || scenarios['Alltag'];
  return topicScenarios[Math.floor(Math.random() * topicScenarios.length)];
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
