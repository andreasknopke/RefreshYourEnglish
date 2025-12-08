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
          content: `Du bist ein freundlicher und ermutigender Englischlehrer. 

WICHTIGE BEWERTUNGSRICHTLINIEN:
1. Rechtschreibfehler und Tippfehler: Erwähne sie im Feedback, aber ziehe KEINE Punkte ab
2. Wenn die Übersetzung den SINN des Satzes korrekt wiedergibt: Mindestens 8/10 Punkte
3. Grammatikfehler: Nur bei gravierenden Fehlern Punktabzug (max. -2 Punkte)
4. Wortwahl: Akzeptiere verschiedene gültige Formulierungen

BEWERTUNGSSKALA:
- 10/10: Perfekte Übersetzung (Sinn, Grammatik, Wortwahl)
- 9/10: Sehr gut (minimale stilistische Unterschiede)
- 8/10: Gut (Sinn korrekt, kleine grammatische Ungenauigkeiten ODER unnatürliche Wortwahl)
- 7/10: Akzeptabel (Sinn größtenteils korrekt, einige Fehler)
- 6/10 oder weniger: Nur wenn der Sinn verfehlt oder Grammatik gravierend falsch ist

Antworte im JSON-Format: {"score": number, "feedback": string, "improvements": string[], "spellingNotes": string[]}`
        }, {
          role: 'user',
          content: `Deutscher Satz: "${germanSentence}"\nÜbersetzung des Schülers: "${userTranslation}"\nMusterlösung: "${correctTranslation}"\n\nBitte bewerte die Übersetzung nach den Richtlinien.`
        }],
        temperature: 0.7,
        max_tokens: 400
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
        score: parsed.score || 8,
        feedback: parsed.feedback || 'Gute Übersetzung!',
        improvements: parsed.improvements || [],
        spellingNotes: parsed.spellingNotes || [],
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
      // Berechne Ähnlichkeit basierend auf verschiedenen Faktoren
      const similarity = calculateSimilarity(userTranslation.toLowerCase(), correctTranslation.toLowerCase());
      
      // Großzügigere Bewertung: Wenn Ähnlichkeit > 0.6, gib mindestens 8 Punkte
      let score;
      if (similarity >= 0.9) {
        score = 10;
      } else if (similarity >= 0.75) {
        score = 9;
      } else if (similarity >= 0.6) {
        score = 8;
      } else if (similarity >= 0.5) {
        score = 7;
      } else if (similarity >= 0.35) {
        score = 6;
      } else {
        score = Math.max(5, Math.round(similarity * 10));
      }
      
      let feedback = '';
      let improvements = [];
      let spellingNotes = [];
      
      if (score >= 9) {
        feedback = 'Ausgezeichnet! Deine Übersetzung ist nahezu perfekt. 🎉';
      } else if (score >= 8) {
        feedback = 'Sehr gut! Du hast den Sinn korrekt wiedergegeben. 👍';
        improvements.push('Versuche, idiomatischere Ausdrücke zu verwenden');
      } else if (score >= 7) {
        feedback = 'Gut! Die grundlegende Bedeutung stimmt.';
        improvements.push('Achte auf die Wortstellung');
      } else if (score >= 5) {
        feedback = 'Solide Grundlage, aber der Sinn könnte präziser sein.';
        improvements.push('Überprüfe die Kernaussage des Satzes');
        improvements.push('Achte auf die verwendeten Zeitformen');
      } else {
        feedback = 'Guter Versuch! Lass uns gemeinsam daran arbeiten.';
        improvements.push('Versuche, den Satz Schritt für Schritt zu übersetzen');
        improvements.push('Achte auf die Grundstruktur');
      }
      
      // Hinweis: In der Simulation können wir keine echten Rechtschreibfehler erkennen
      if (similarity >= 0.6 && similarity < 0.9) {
        spellingNotes.push('Überprüfe die Rechtschreibung einiger Wörter');
      }
      
      resolve({
        score,
        feedback,
        improvements,
        spellingNotes,
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

  // Niveau-spezifische Anforderungen
  const levelRequirements = {
    B2: {
      complexity: 'mittel',
      vocabulary: 'gebräuchlich und alltäglich',
      structures: 'Hauptsätze mit gelegentlichen Nebensätzen, einfache Konjunktionen',
      wordCount: '8-15 Wörter',
      examples: 'Themen aus dem täglichen Leben, Arbeit, Freizeit',
      avoid: 'Fachbegriffe, komplexe Satzgefüge, literarische Sprache, abstrakte Konzepte',
      tenses: 'Präsens, Perfekt, gelegentlich Futur',
      instructions: 'Erstelle einen EINFACHEN, KLAREN Satz, den ein fortgeschrittener Lerner problemlos verstehen kann. Nutze ALLTÄGLICHE Vokabeln und DIREKTE Aussagen.'
    },
    C1: {
      complexity: 'hoch',
      vocabulary: 'differenziert, teils anspruchsvoll',
      structures: 'komplexe Satzkonstruktionen, Nebensätze, gehobene Konjunktionen',
      wordCount: '15-25 Wörter',
      examples: 'abstrakte Themen, Fachthemen, gesellschaftliche Diskurse',
      avoid: 'zu einfache Alltagssprache, extrem seltene Fachbegriffe',
      tenses: 'alle Zeitformen inklusive Konjunktiv I und II',
      instructions: 'Erstelle einen ANSPRUCHSVOLLEN Satz mit DIFFERENZIERTER Wortwahl und komplexerer Satzstruktur. Nutze gehobenes Vokabular, aber bleibe verständlich.'
    },
    C2: {
      complexity: 'sehr hoch',
      vocabulary: 'elaboriert, Fachsprache, idiomatisch',
      structures: 'hochkomplexe Satzkonstruktionen, verschachtelte Nebensätze, Partizipialkonstruktionen',
      wordCount: '20-35 Wörter',
      examples: 'philosophische Konzepte, wissenschaftliche Themen, literarische Analysen',
      avoid: 'einfache oder alltägliche Formulierungen',
      tenses: 'alle Zeitformen, komplexe Modi, Passivkonstruktionen',
      instructions: 'Erstelle einen HOCHKOMPLEXEN Satz mit ELABORIERTER, fast literarischer Sprache. Nutze ABSTRAKTE Konzepte, FACHVOKABULAR und anspruchsvolle Satzstrukturen.'
    }
  };

  const currentLevel = levelRequirements[level];

  // Detaillierte Anweisungen für verschiedene Satztypen und Variationen
  const sentenceTypesByLevel = {
    B2: [
      'eine einfache Aussage über alltägliche Aktivitäten',
      'eine direkte Frage zu persönlichen Präferenzen',
      'eine klare Meinungsäußerung',
      'eine Beschreibung einer Situation',
      'einen einfachen Vergleich',
      'eine Empfehlung',
      'eine persönliche Erfahrung'
    ],
    C1: [
      'eine differenzierte Analyse',
      'eine hypothetische Überlegung mit Konsequenzen',
      'eine kritische Bewertung',
      'einen komplexen Vergleich mit mehreren Aspekten',
      'eine begründete Argumentation',
      'eine Schlussfolgerung aus verschiedenen Faktoren'
    ],
    C2: [
      'eine philosophische Reflexion',
      'eine wissenschaftliche Hypothese',
      'eine literarische Analyse',
      'eine abstrakte Konzeptualisierung',
      'eine epistemologische Betrachtung',
      'eine interdisziplinäre Synthese'
    ]
  };

  const sentenceTypes = sentenceTypesByLevel[level];
  const sentenceType = sentenceTypes[Math.floor(Math.random() * sentenceTypes.length)];

  // Spezifische Themenaspekte für mehr Variation
  const topicVariations = {
    'Politik': ['Wahlen', 'internationale Beziehungen', 'Gesetzgebung', 'Demokratie', 'Klimapolitik', 'Wirtschaftspolitik', 'Sozialpolitik', 'Außenpolitik'],
    'Sport': ['Mannschaftssport', 'Einzelsport', 'Olympia', 'Fitness', 'E-Sport', 'Extremsport', 'Sportpsychologie', 'Doping'],
    'Literatur': ['Romane', 'Lyrik', 'Sachbücher', 'Biografien', 'Literaturkritik', 'Bestseller', 'klassische Literatur', 'moderne Literatur'],
    'Film, Musik, Kunst': ['Kino', 'Streaming', 'Konzerte', 'Museen', 'Street Art', 'Pop-Kultur', 'Klassik', 'zeitgenössische Kunst'],
    'Alltag': ['Technologie', 'soziale Medien', 'Arbeitswelt', 'Familie', 'Freundschaft', 'Freizeit', 'Gesundheit', 'Bildung', 'Konsum', 'Mobilität'],
    'Persönliche Gespräche': ['Beziehungen', 'Lebensentscheidungen', 'Karriere', 'Hobbys', 'Reisen', 'Zukunftspläne', 'Erinnerungen', 'persönliche Entwicklung']
  };

  const specificTopic = topicVariations[topic]?.[Math.floor(Math.random() * (topicVariations[topic]?.length || 1))] || topic;

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
          content: `Du bist ein erfahrener Englischlehrer, der Übersetzungssätze für VERSCHIEDENE Sprachniveaus erstellt.

KRITISCH - NIVEAU ${level} ANFORDERUNGEN:
- Komplexität: ${currentLevel.complexity}
- Vokabular: ${currentLevel.vocabulary}
- Satzstrukturen: ${currentLevel.structures}
- Wortanzahl: ${currentLevel.wordCount}
- Thematik: ${currentLevel.examples}
- VERMEIDE: ${currentLevel.avoid}
- Zeitformen: ${currentLevel.tenses}

SPEZIFISCHE ANWEISUNG FÜR ${level}:
${currentLevel.instructions}

NIVEAUBEISPIELE ZUR ORIENTIERUNG:

B2-Beispiele (EINFACH):
- "Ich gehe heute Abend mit meinen Freunden ins Kino."
- "Viele Menschen arbeiten heutzutage von zu Hause aus."
- "Kannst du mir bitte bei den Hausaufgaben helfen?"

C1-Beispiele (ANSPRUCHSVOLL):
- "Die zunehmende Digitalisierung erfordert eine grundlegende Anpassung unserer Bildungssysteme."
- "Angesichts der komplexen Situation müssen wir verschiedene Lösungsansätze in Betracht ziehen."

C2-Beispiele (HOCHKOMPLEX):
- "Die postmoderne Dekonstruktion traditioneller Narrative manifestiert sich in der ambivalenten Haltung zeitgenössischer Künstler."
- "Die epistemologischen Implikationen dieser Theorie werfen fundamentale Fragen bezüglich der Natur wissenschaftlicher Erkenntnis auf."

WICHTIG - VARIATIONSREGELN:
1. Vermeide repetitive Satzstrukturen
2. Wechsle zwischen verschiedenen Zeitformen (innerhalb des Niveaus)
3. Verwende unterschiedliche Perspektiven
4. Variiere die Satzlänge (innerhalb der Niveau-Vorgaben)
5. NIEMALS den gleichen Satzbau wie zuvor verwenden

Erstelle ${sentenceType} zum Aspekt "${specificTopic}" STRIKT auf ${level}-Niveau.

Antworte im JSON-Format: {"de": "deutscher Satz", "en": "englische Übersetzung"}`
        }, {
          role: 'user',
          content: `Generiere einen NEUEN deutschen Satz (${sentenceType}) zum Aspekt "${specificTopic}" EXAKT auf ${level}-Niveau (nicht einfacher, nicht schwieriger!). Beachte die Wortanzahl ${currentLevel.wordCount} und die Komplexität "${currentLevel.complexity}".`
        }],
        temperature: 0.9,
        max_tokens: 200,
        presence_penalty: 0.6,
        frequency_penalty: 0.6
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      console.log(`✨ Generated ${level} sentence via OpenAI:`, parsed);
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
  
  // Level-specific instructions for challenging scenarios
  const levelInstructions = {
    B2: 'Create a CHALLENGING situation where the student must handle a conflict, complaint, or difficult request. They should need to negotiate, explain, or defend their position.',
    C1: 'Create a COMPLEX situation involving nuanced arguments, ethical dilemmas, or professional conflicts. The student must use sophisticated language to persuade, negotiate, or resolve tensions.',
    C2: 'Create a HIGHLY COMPLEX situation with abstract concepts, philosophical debates, or high-stakes professional scenarios. The student must demonstrate mastery of formal language, rhetoric, and subtle argumentation.'
  };
  
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
          content: `You are an English teacher creating CHALLENGING conversation scenarios for German learners.

${levelInstructions[level]}

Topic: "${topic}"
Level: ${level}

REQUIREMENTS:
- The scenario must present a PROBLEM or CONFLICT that requires active problem-solving
- The student must DEFEND, NEGOTIATE, EXPLAIN, or PERSUADE
- Examples: handling complaints, resolving misunderstandings, negotiating deals, defending opinions, explaining complex situations
- Avoid simple question-answer exchanges or basic small talk

CRITICAL: 
- "firstMessage" MUST be in English only (the conversation partner's opening statement presenting the challenge)
- "description" in German (brief explanation of the situation and student's role)

Respond in JSON format: {"description": "German description", "firstMessage": "Challenging opening in ENGLISH"}`
        }, {
          role: 'user',
          content: `Create a challenging conversation scenario at ${level} level about "${topic}". The student should face a difficult situation requiring active language use.`
        }],
        temperature: 0.9,
        max_tokens: 250
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
        content: `You are a conversation partner in a CHALLENGING scenario: ${scenario.description}

CRITICAL RULES:
1. You MUST respond ONLY in English - never use German or any other language
2. Stay strictly in character and maintain the CONFLICT or CHALLENGE of the scenario
3. DO NOT make it easy - push back, question, or challenge the student's responses
4. If they provide weak arguments, point out flaws or inconsistencies
5. Make them WORK for a resolution - don't accept the first answer
6. Reference their previous statements to test their consistency
7. Match the language level: ${level}
8. Keep responses focused and challenging (2-4 sentences max)
9. If the user goes off-topic, firmly redirect them to the scenario

Your goal: Make the student demonstrate their language skills by DEFENDING, NEGOTIATING, or PERSUADING.`
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
        temperature: 0.8,
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
          content: `You are an experienced English language teacher evaluating a student's performance in this challenging conversation scenario: "${scenario.description}".

CRITICAL EVALUATION CRITERIA:

1. GRAMMAR (1-10): Accuracy of verb tenses, subject-verb agreement, articles, prepositions, sentence structure
2. VOCABULARY (1-10): Range and appropriateness of vocabulary, use of advanced expressions, collocations
3. FLUENCY (1-10): Natural flow, coherence, ability to maintain conversation without awkward pauses or repetition
4. TASK COMPLETION (1-10): How well did they handle the challenge? Did they defend/persuade/negotiate effectively?
5. PERSUASIVENESS (1-10): Strength of arguments, rhetorical effectiveness, ability to respond to counterarguments

DETAILED ANALYSIS REQUIRED:
- Identify SPECIFIC grammatical errors with corrections
- Highlight excellent phrases or expressions used
- Provide actionable improvement suggestions
- Assess overall language level (A1, A2, B1, B2, C1, C2)

ALL FEEDBACK MUST BE IN GERMAN.

Respond in JSON format:
{
  "grammar": 1-10,
  "vocabulary": 1-10,
  "fluency": 1-10,
  "taskCompletion": 1-10,
  "persuasiveness": 1-10,
  "overallScore": 1-10,
  "languageLevel": "A1|A2|B1|B2|C1|C2",
  "detailedFeedback": "Comprehensive feedback in German (3-4 sentences)",
  "errors": [
    {
      "original": "exact student phrase with error",
      "correction": "corrected version",
      "explanation": "explanation in German why this is wrong"
    }
  ],
  "strengths": ["strength 1 in German", "strength 2 in German"],
  "improvements": ["improvement 1 in German", "improvement 2 in German"],
  "tips": ["practical tip 1 in German", "practical tip 2 in German"]
}`
        }, {
          role: 'user',
          content: `Evaluate this conversation at target level ${level}:\n\nSCENARIO: ${scenario.description}\n\nCONVERSATION:\n${conversationHistory.map(m => `${m.role === 'user' ? 'STUDENT' : 'PARTNER'}: ${m.content}`).join('\n\n')}\n\nProvide detailed error analysis and constructive feedback.`
        }],
        temperature: 0.3,
        max_tokens: 800
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('OpenAI response:', data);
    
    const content = data.choices[0].message.content;
    console.log('Evaluation content:', content);
    
    const evaluation = JSON.parse(content);
    
    // Ensure all required fields exist
    return {
      grammar: evaluation.grammar || 5,
      vocabulary: evaluation.vocabulary || 5,
      fluency: evaluation.fluency || 5,
      taskCompletion: evaluation.taskCompletion || 5,
      persuasiveness: evaluation.persuasiveness || 5,
      overallScore: evaluation.overallScore || Math.round((evaluation.grammar + evaluation.vocabulary + evaluation.fluency + evaluation.taskCompletion + evaluation.persuasiveness) / 5),
      languageLevel: evaluation.languageLevel || level,
      detailedFeedback: evaluation.detailedFeedback || 'Gute Leistung im Dialog.',
      errors: evaluation.errors || [],
      strengths: evaluation.strengths || [],
      improvements: evaluation.improvements || [],
      tips: evaluation.tips || []
    };
  } catch (error) {
    console.error('Dialog evaluation failed, using fallback:', error);
    // Fallback
    const userMessages = conversationHistory.filter(m => m.role === 'user');
    const messageCount = userMessages.length;
    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / (messageCount || 1);
    
    const baseScore = Math.min(10, Math.max(5, Math.round(avgLength / 15)));
    
    return {
      grammar: baseScore,
      vocabulary: baseScore,
      fluency: baseScore,
      taskCompletion: baseScore,
      persuasiveness: baseScore - 1,
      overallScore: baseScore,
      languageLevel: level,
      detailedFeedback: 'Gute Leistung! Du hast aktiv am Gespräch teilgenommen und die Herausforderung angenommen. Die KI-Bewertung war nicht verfügbar, daher wurde eine Basis-Bewertung erstellt.',
      errors: [],
      strengths: ['Aktive Teilnahme am Dialog', 'Bemühung, die Situation zu lösen'],
      improvements: ['Verwende vollständigere Sätze', 'Versuche, mehr Details einzubauen'],
      tips: ['Versuche vollständige Sätze zu bilden', 'Nutze Konjunktionen wie "because", "although", "however"']
    };
  }
}

/**
 * Fallback-Szenarios
 */
function getFallbackScenario(level, topic = 'Alltag') {
  const scenarios = {
    'B2': {
      'Politik': [
        {
          description: "Du bist auf einer Bürgerversammlung. Ein aufgebrachter Anwohner beschuldigt dich, für ein lokales Problem verantwortlich zu sein. Du musst dich verteidigen und die Situation klären.",
          firstMessage: "Excuse me, I need to talk to you! I've heard that you're part of the committee that approved the new parking regulations. Do you realize how much trouble this has caused for local residents? My elderly mother can't park near her own house anymore! What were you thinking?"
        },
        {
          description: "Als Stadtratsmitglied musst du einem wütenden Geschäftsinhaber erklären, warum seine Steuererhöhung gerechtfertigt ist.",
          firstMessage: "I just received my new tax bill and it's completely outrageous! How can you justify a 30% increase? This will force me to close my business. I demand an explanation!"
        }
      ],
      'Sport': [
        {
          description: "Du hast dich für einen Marathonlauf angemeldet, aber die Organisation hat deinen Namen vergessen. Überzeuge sie, dich noch teilnehmen zu lassen.",
          firstMessage: "I'm sorry, but your name isn't on our list. The registration closed three weeks ago. I'm afraid we can't let you participate without proper registration."
        },
        {
          description: "Im Fitnessstudio beschwert sich ein anderes Mitglied, dass du zu laut trainierst. Verteidige dein Training.",
          firstMessage: "Excuse me, but you're making way too much noise with those weights! Other people are trying to concentrate. Could you please be more considerate?"
        }
      ],
      'Literatur': [
        {
          description: "In einer Buchhandlung wird dir vorgeworfen, ein Buch beschädigt zu haben, das du gar nicht angefasst hast.",
          firstMessage: "Sir/Madam, I saw you handling that book earlier, and now there's a torn page. You'll need to pay for the damage."
        },
        {
          description: "In deinem Buchclub kritisiert jemand scharf dein Lieblingsbuch. Verteidige deine Position.",
          firstMessage: "I honestly can't understand why you like this book so much. The characters are shallow, the plot is predictable, and the writing style is mediocre at best. What could you possibly see in it?"
        }
      ],
      'Film, Musik, Kunst': [
        {
          description: "Du hast Konzertkarten online gekauft, aber an der Kasse behauptet man, sie seien gefälscht. Beweise, dass sie echt sind.",
          firstMessage: "I'm sorry, but these tickets don't scan properly. They appear to be counterfeit. I can't let you enter with these."
        },
        {
          description: "Im Kino sitzt jemand auf deinem reservierten Platz und weigert sich aufzustehen.",
          firstMessage: "What do you mean this is your seat? I've been sitting here for ten minutes already. Maybe you should check your ticket again."
        }
      ],
      'Alltag': [
        {
          description: "Dein Nachbar beschwert sich über den Lärm von deiner Party gestern Abend. Rechtfertige dich und finde eine Lösung.",
          firstMessage: "I need to talk to you about last night. Your party was incredibly loud until 2 AM! I couldn't sleep at all, and I have important work today. This is completely unacceptable!"
        },
        {
          description: "Im Restaurant behauptet der Kellner, du hättest ein Glas zerbrochen und verlangt Bezahlung.",
          firstMessage: "Excuse me, one of our servers saw you knock over a wine glass. That will be €15 for the replacement. Would you like to pay cash or card?"
        }
      ],
      'Persönliche Gespräche': [
        {
          description: "Ein Freund ist sauer, weil du eine Verabredung vergessen hast. Entschuldige dich und erkläre die Situation.",
          firstMessage: "I can't believe you just didn't show up yesterday! I waited for an hour at the restaurant. You didn't even call or text. What kind of friend does that?"
        },
        {
          description: "Dein Mitbewohner beschuldigt dich, seine Lebensmittel aus dem Kühlschrank gegessen zu haben.",
          firstMessage: "Hey, I need to talk to you. My expensive cheese and the leftover pizza I was saving are gone. I'm pretty sure you ate them. Can you explain this?"
        }
      ]
    },
    'C1': {
      'Politik': [
        {
          description: "In einer Debatte musst du eine umstrittene politische Entscheidung gegen heftige Kritik verteidigen.",
          firstMessage: "Your proposal to increase funding for renewable energy is economically irresponsible. We're already in debt, and you want to burden taxpayers even more? How can you justify prioritizing environmental concerns over economic stability when families are struggling to make ends meet?"
        },
        {
          description: "Als Berater musst du einem skeptischen Investor erklären, warum er in ein riskantes Sozialprojekt investieren sollte.",
          firstMessage: "I've reviewed your proposal, and frankly, the ROI projections seem overly optimistic. You're asking me to invest substantial capital in a social housing project with uncertain returns. Why should I risk my money on this when there are safer investment opportunities available?"
        }
      ],
      'Sport': [
        {
          description: "Du musst als Teamkapitän einen talentierten, aber problematischen Spieler aus dem Team ausschließen und diese Entscheidung rechtfertigen.",
          firstMessage: "I've just heard that you're removing our best player from the team before the championship! His statistics are outstanding. How can you possibly justify this decision? Are you trying to sabotage our chances of winning?"
        }
      ],
      'Literatur': [
        {
          description: "In einer akademischen Diskussion musst du deine kontroverse These über einen klassischen Autor gegen Literaturprofessoren verteidigen.",
          firstMessage: "Your interpretation completely contradicts decades of established literary criticism. You're suggesting that the author's intentions were fundamentally different from what scholars have conclusively demonstrated. What evidence could you possibly have to support such a radical reinterpretation?"
        }
      ],
      'Film, Musik, Kunst': [
        {
          description: "Als Kurator musst du die Entscheidung verteidigen, ein kontroverses Kunstwerk auszustellen, das viele als anstößig empfinden.",
          firstMessage: "I'm deeply disturbed that you've chosen to display this piece in our gallery. It's offensive to many members of our community and doesn't align with our institution's values. How can you defend this decision when it clearly prioritizes shock value over artistic merit?"
        }
      ],
      'Alltag': [
        {
          description: "Bei einer Gehaltsverhandlung lehnt dein Chef deine Forderung ab und argumentiert, dass du sie nicht verdienst.",
          firstMessage: "I appreciate your interest in a salary increase, but I have to be frank with you. Your performance this year hasn't met expectations. You've missed several deadlines, and the quality of your work has been inconsistent. Why should I approve a raise when your contributions don't justify it?"
        },
        {
          description: "Du musst einem Vermieter erklären, warum du die Miete diesen Monat nicht zahlen kannst, ohne die Wohnung zu verlieren.",
          firstMessage: "This is the second time this year you're asking for an extension on rent. I'm running a business, not a charity. I have mortgage payments to make. If you can't meet your obligations, I'll have to consider other tenants who can."
        }
      ],
      'Persönliche Gespräche': [
        {
          description: "Ein enger Freund konfrontiert dich mit dem Vorwurf, hinter seinem Rücken über ihn geredet zu haben.",
          firstMessage: "I need to address something serious. Multiple people have told me that you've been spreading rumors about my personal life. I trusted you with confidential information, and now I find out you've been gossiping about me. How could you betray my trust like this?"
        }
      ]
    },
    'C2': {
      'Politik': [
        {
          description: "In einer hochrangigen Debatte musst du ein komplexes ethisches Dilemma zur Privatsphäre vs. nationale Sicherheit argumentieren.",
          firstMessage: "Your argument for unrestricted civil liberties fundamentally ignores the existential security threats we face. In an era of sophisticated terrorism and cyber warfare, your idealistic position could cost lives. How do you reconcile your philosophical principles with the pragmatic reality that surveillance has demonstrably prevented attacks?"
        }
      ],
      'Literatur': [
        {
          description: "Du musst eine radikale postmoderne Interpretation eines kanonischen Werkes gegen traditionelle Literaturwissenschaftler verteidigen.",
          firstMessage: "Your deconstructionist approach fundamentally undermines the authorial intentionality that gives literature its meaning. By reducing the text to an endless play of signifiers, you're essentially arguing that literary criticism is a solipsistic exercise. How can you defend a methodology that renders objective textual analysis impossible?"
        }
      ],
      'Alltag': [
        {
          description: "Als Führungskraft musst du eine unpopuläre Umstrukturierung rechtfertigen, die Entlassungen bedeutet.",
          firstMessage: "Your restructuring plan will destroy the careers of dozens of loyal employees who've given years to this company. You're prioritizing short-term profitability over human welfare. How can you ethically justify these decisions when alternative solutions, though more complex, might preserve jobs?"
        }
      ],
      'Persönliche Gespräche': [
        {
          description: "In einem philosophischen Streit musst du deine fundamentale Weltanschauung gegen intensive intellektuelle Kritik verteidigen.",
          firstMessage: "Your entire moral framework rests on assumptions that you haven't adequately justified. You claim objective ethical principles exist, yet you can't ground them in anything beyond subjective preference. Your position collapses under scrutiny - how do you respond to the fundamental circularity in your reasoning?"
        }
      ]
    }
  };
  
  const levelScenarios = scenarios[level] || scenarios['B2'];
  const topicScenarios = levelScenarios[topic] || levelScenarios['Alltag'];
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
