// LLM Service für KI-basierte Bewertung und Generierung
// Diese Funktionen können mit verschiedenen LLM-APIs verbunden werden (OpenAI, Anthropic, lokale Modelle, etc.)

import logService from './logService';

/**
 * Konfiguration für LLM-Provider
 */
const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    apiKeyEnv: 'VITE_OPENAI_API_KEY',
    model: 'gpt-3.5-turbo',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    getHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  },
  mistral: {
    name: 'Mistral Large',
    apiKeyEnv: 'VITE_MISTRAL_API_KEY',
    model: 'mistral-large-latest',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    getHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  }
};

/**
 * Ruft den aktuellen LLM-Provider ab
 */
export function getLLMProvider() {
  const provider = localStorage.getItem('llm_provider') || 'openai';
  return provider;
}

/**
 * Setzt den LLM-Provider
 */
export function setLLMProvider(provider) {
  if (!LLM_PROVIDERS[provider]) {
    throw new Error(`Unknown LLM provider: ${provider}`);
  }
  localStorage.setItem('llm_provider', provider);
  console.log(`✨ LLM Provider changed to: ${provider}`);
}

/**
 * Gibt alle verfügbaren LLM-Provider zurück
 */
export function getAvailableLLMProviders() {
  return Object.entries(LLM_PROVIDERS).map(([key, config]) => ({
    id: key,
    name: config.name,
    available: !!import.meta.env[config.apiKeyEnv]
  }));
}

/**
 * Evaluiert eine Übersetzung mit Hilfe eines LLM
 * @param {string} germanSentence - Der deutsche Satz
 * @param {string} userTranslation - Die Übersetzung des Benutzers
 * @param {string} correctTranslation - Die korrekte Übersetzung (optional)
 * @param {object} targetVocab - Die Ziel-Vokabel, die verwendet werden sollte (optional)
 * @returns {Promise<{score: number, feedback: string, improvements: string[], correctTranslation: string}>}
 */
export async function evaluateTranslation(germanSentence, userTranslation, correctTranslation = '', targetVocab = null) {
  const currentProvider = getLLMProvider();
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = import.meta.env[providerConfig.apiKeyEnv];
  
console.log('🔑 LLM API Key status:', {
    provider: currentProvider,
    exists: !!API_KEY,
    length: API_KEY ? API_KEY.length : 0,
    prefix: API_KEY ? API_KEY.substring(0, 7) + '...' : 'none'
  });
  
  // Log API Key status
  logService.info('LLM', 'API Key Check', {
    provider: currentProvider,
    exists: !!API_KEY,
    length: API_KEY ? API_KEY.length : 0
  });
  
  // Wenn kein API-Key vorhanden ist, verwende Simulation
  if (!API_KEY) {
    console.warn(`⚠️ [LLM Evaluation] No ${providerConfig.name} API key found, using simulation mode`, {
      provider: currentProvider,
      envVarName: providerConfig.apiKeyEnv,
      hasTargetVocab: !!targetVocab
    });
    logService.warn('LLM', 'Keine API Key - Simulation verwendet', {
      provider: currentProvider,
      envVarName: providerConfig.apiKeyEnv
    });
    return simulateEvaluation(germanSentence, userTranslation, correctTranslation, targetVocab);
  }

  console.log(`✨ Using ${providerConfig.name} API for translation evaluation`);
  logService.info('LLM', 'Verwende API für Evaluation', { provider: currentProvider });

  // Zusätzliche Anweisungen für Ziel-Vokabel
  const vocabInstruction = targetVocab 
    ? `\n\nWICHTIG - ZIEL-VOKABEL:
Der Schüler SOLLTE die englische Vokabel "${targetVocab.english}" (deutsch: "${targetVocab.german}") in der Übersetzung verwenden.
- Wenn der Schüler diese Vokabel korrekt verwendet hat, erwähne dies POSITIV im Feedback
- Schlage NICHT vor, diese Vokabel durch andere Wörter zu ersetzen
- Wenn die Vokabel korrekt verwendet wurde, gib mindestens 8/10 Punkte (bei korrekter Grammatik)`
    : '';
  
  // Echte LLM-Integration (nur wenn API-Key vorhanden)
  try {
    const requestStartTime = performance.now();
    
    console.log(`🔍 [LLM Evaluation] Requesting from ${providerConfig.name}...`, {
      provider: currentProvider,
      endpoint: providerConfig.endpoint,
      model: providerConfig.model,
      hasTargetVocab: !!targetVocab,
      germanLength: germanSentence.length,
      userTranslationLength: userTranslation.length
    });
    
    const requestBody = {
      model: providerConfig.model,
      messages: [{
        role: 'system',
        content: `Du bist ein freundlicher und ermutigender Englischlehrer. 

WICHTIGE BEWERTUNGSRICHTLINIEN:
1. Rechtschreibfehler und Tippfehler: Erwähne sie im Feedback, aber ziehe KEINE Punkte ab
2. Wenn die Übersetzung den SINN des Satzes korrekt wiedergibt: Mindestens 8/10 Punkte
3. Grammatikfehler: Nur bei gravierenden Fehlern Punktabzug (max. -2 Punkte)
4. Wortwahl: Akzeptiere verschiedene gültige Formulierungen${vocabInstruction}

BEWERTUNGSSKALA:
- 10/10: Perfekte Übersetzung (Sinn, Grammatik, Wortwahl)
- 9/10: Sehr gut (minimale stilistische Unterschiede)
- 8/10: Gut (Sinn korrekt, kleine grammatische Ungenauigkeiten ODER unnatürliche Wortwahl)
- 7/10: Akzeptabel (Sinn größtenteils korrekt, einige Fehler)
- 6/10 oder weniger: Nur wenn der Sinn verfehlt oder Grammatik gravierend falsch ist

Antworte im JSON-Format: {"score": number, "feedback": string, "improvements": string[], "spellingNotes": string[]}`
        }, {
          role: 'user',
          content: `Deutscher Satz: "${germanSentence}"

ÜBERSETZUNG DES SCHÜLERS (zu bewerten): "${userTranslation}"

Musterlösung (nur als Referenz): "${correctTranslation}"

Bitte bewerte NUR die ÜBERSETZUNG DES SCHÜLERS (nicht die Musterlösung). Vergleiche sie mit der Musterlösung und dem deutschen Original.`
      }],
      temperature: 0.7,
      max_tokens: 400
    };
    
    // Log LLM Request
    logService.logLLMRequest(currentProvider, providerConfig.endpoint, requestBody);
    
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify(requestBody)
    });
    
    const requestDuration = Math.round(performance.now() - requestStartTime);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [LLM Evaluation] ${providerConfig.name} API error:`, {
        status: response.status,
        statusText: response.statusText,
        errorPreview: errorData.substring(0, 300),
        provider: currentProvider,
        endpoint: providerConfig.endpoint
      });
      
      // Log Error
      logService.logLLMError(currentProvider, new Error(`API error: ${response.status} - ${errorData.substring(0, 200)}`), requestBody);
      
      throw new Error(`${providerConfig.name} API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ [LLM Evaluation] ${providerConfig.name} response received:`, {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      usage: data.usage
    });
    
    // Log LLM Response
    logService.logLLMResponse(currentProvider, data, requestDuration);
    
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      console.log(`✅ Translation evaluation successful (${providerConfig.name}):`, {
        score: parsed.score,
        hasVocabTarget: !!targetVocab
      });
      
      // Log success
      logService.llm('Evaluation erfolgreich', {
        provider: currentProvider,
        score: parsed.score,
        duration: `${requestDuration}ms`,
        germanSentence,
        userTranslation,
        feedback: parsed.feedback
      });
      
      return {
        score: parsed.score,
        feedback: parsed.feedback,
        improvements: parsed.improvements || [],
        spellingNotes: parsed.spellingNotes || [],
        correctTranslation
      };
    } catch (parseError) {
      console.error('❌ [LLM Evaluation] Failed to parse LLM response:', parseError);
      console.log('Raw response:', content);
      
      logService.warn('LLM', 'JSON Parsing fehlgeschlagen', {
        provider: currentProvider,
        error: parseError.message,
        content: content?.substring(0, 500)
      });
      return simulateEvaluation(germanSentence, userTranslation, correctTranslation, targetVocab);
    }
  } catch (error) {
    console.error(`❌ [LLM Evaluation] ${providerConfig.name} API failed:`, {
      error: error.message,
      errorStack: error.stack,
      provider: currentProvider,
      endpoint: providerConfig.endpoint,
      hasApiKey: !!API_KEY
    });
    
    logService.logLLMError(currentProvider, error, {
      germanSentence,
      userTranslation,
      correctTranslation
    });
    
    console.warn(`⚠️ [LLM Evaluation] Falling back to local evaluation due to: ${error.message}`);
    return simulateEvaluation(germanSentence, userTranslation, correctTranslation, targetVocab);
  }
}

/**
 * Simulierte Bewertung (funktioniert ohne API-Key)
 */
function simulateEvaluation(germanSentence, userTranslation, correctTranslation, targetVocab = null) {
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

      // Prüfe ob Ziel-Vokabel verwendet wurde
      const vocabUsed = targetVocab && userTranslation.toLowerCase().includes(targetVocab.english.toLowerCase());
      
      if (score >= 9) {
        feedback = vocabUsed 
          ? `Ausgezeichnet! Du hast die Vokabel "${targetVocab.english}" perfekt verwendet! 🎉`
          : 'Ausgezeichnet! Deine Übersetzung ist nahezu perfekt. 🎉';
      } else if (score >= 8) {
        feedback = vocabUsed
          ? `Sehr gut! Die Vokabel "${targetVocab.english}" wurde korrekt verwendet. 👍`
          : 'Sehr gut! Du hast den Sinn korrekt wiedergegeben. 👍';
        if (!vocabUsed) {
          improvements.push('Versuche, idiomatischere Ausdrücke zu verwenden');
        }
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

      // WICHTIG: Schlage nicht vor, die Ziel-Vokabel zu ersetzen
      if (targetVocab && vocabUsed) {
        // Filtere Verbesserungsvorschläge, die die Ziel-Vokabel betreffen könnten
        improvements = improvements.filter(imp => 
          !imp.toLowerCase().includes(targetVocab.english.toLowerCase())
        );
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
 * @param {object} targetVocab - Ziel-Vokabel die verwendet werden soll (optional)
 * @returns {Promise<{de: string, en: string, targetVocab?: object}>}
 */
export async function generateTranslationSentence(level = 'B2', topic = 'Alltag', targetVocab = null) {
  const currentProvider = getLLMProvider();
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = import.meta.env[providerConfig.apiKeyEnv];
  
  console.log('📝 Generating translation sentence', {
    provider: currentProvider,
    level,
    topic,
    hasAPIKey: !!API_KEY,
    apiKeyPrefix: API_KEY ? API_KEY.substring(0, 7) + '...' : 'none',
    targetVocab: targetVocab ? `${targetVocab.german}/${targetVocab.english}` : 'none'
  });
  
  logService.info('LLM', 'Generiere Übersetzungssatz', {
    provider: currentProvider,
    level,
    topic,
    hasAPIKey: !!API_KEY,
    targetVocab: targetVocab ? `${targetVocab.german}/${targetVocab.english}` : 'none'
  });
  
  if (!API_KEY) {
    console.warn(`⚠️ No ${providerConfig.name} API key found, using fallback sentences for ${level}/${topic}`);
    logService.warn('LLM', 'Fallback-Satz verwendet (kein API Key)', {
      provider: currentProvider,
      level,
      topic
    });
    const fallback = getFallbackSentence(level, topic, targetVocab);
    console.log('📚 Fallback sentence returned:', fallback);
    return fallback;
  }

  // Niveau-spezifische Anforderungen
  const levelRequirements = {
    A1: {
      complexity: 'sehr einfach',
      vocabulary: 'grundlegend, sehr häufig',
      structures: 'einfache Hauptsätze, keine Nebensätze',
      wordCount: '4-8 Wörter',
      examples: 'Zahlen, Farben, Familie, einfache Grüße, Tagesablauf',
      avoid: 'Nebensätze, Konjunktiv, Fachjargon, komplexe Zeitformen',
      tenses: 'nur Präsens und einfaches Perfekt',
      instructions: 'Erstelle einen SEHR EINFACHEN, KURZEN Satz. Ein Anfänger sollte jedes Wort verstehen. Nutze NUR die häufigsten Wörter und SIMPLE Satzstrukturen.'
    },
    A2: {
      complexity: 'einfach',
      vocabulary: 'häufig, alltäglich',
      structures: 'einfache Hauptsätze mit gelegentlichen Nebensätzen, einfache Konjunktionen (und, aber, weil)',
      wordCount: '6-12 Wörter',
      examples: 'alltägliche Situationen, Einkaufen, Reisen, Familie, Hobbys',
      avoid: 'seltene Wörter, komplexe Satzstrukturen, Konjunktiv, abstrakte Konzepte',
      tenses: 'Präsens, einfaches Perfekt, gelegentlich Präteritum',
      instructions: 'Erstelle einen KLAREN, EINFACHEN Satz über alltägliche Themen. Verwende häufiges Vokabular und einfache Satzstrukturen, aber etwas komplexer als A1.'
    },
    B1: {
      complexity: 'mittel-einfach',
      vocabulary: 'gebräuchlich, mit einigen anspruchsvolleren Wörtern',
      structures: 'Hauptsätze mit Nebensätzen, verschiedene Konjunktionen',
      wordCount: '8-15 Wörter',
      examples: 'Erfahrungen, Meinungen, Reiseerlebnisse, Berufliches',
      avoid: 'extrem seltene Wörter, sehr komplexe Satzstruktionen, literarische Sprache',
      tenses: 'Präsens, Perfekt, Präteritum, gelegentlich Futur',
      instructions: 'Erstelle einen VERSTÄNDLICHEN Satz mit einigen anspruchsvolleren Wörtern. Nutze Nebensätze aber halte es insgesamt klar und verständlich.'
    },
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

  const currentLevel = levelRequirements[level] || levelRequirements['B2'];

  // Detaillierte Anweisungen für verschiedene Satztypen und Variationen
  const sentenceTypesByLevel = {
    A1: [
      'eine sehr einfache Aussage',
      'eine einfache Frage',
      'eine kurze Beschreibung',
      'eine einfache Aktivität',
      'ein einfaches Objekt oder eine einfache Person'
    ],
    A2: [
      'eine einfache Aussage über alltägliche Aktivitäten',
      'eine einfache Frage zu alltäglichen Dingen',
      'eine kurze Beschreibung eines Ortes oder einer Person',
      'eine einfache Meinungsäußerung',
      'eine einfache persönliche Erfahrung'
    ],
    B1: [
      'eine Aussage über persönliche Erfahrungen',
      'eine Meinungsäußerung zu alltäglichen Themen',
      'eine Beschreibung eines Ereignisses',
      'eine Frage mit Begründung',
      'einen Vergleich zwischen zwei Dingen'
    ],
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

  const sentenceTypes = sentenceTypesByLevel[level] || sentenceTypesByLevel['B2'];
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

  // Vokabel-spezifische Anweisung
  const vocabInstruction = targetVocab 
    ? `\n\nWICHTIG - ZIEL-VOKABEL:
Der Satz MUSS so konstruiert sein, dass der Lerner das englische Wort "${targetVocab.english}" (deutsch: "${targetVocab.german}") in der Übersetzung verwenden MUSS.
- Das deutsche Wort "${targetVocab.german}" (oder eine Variante davon) MUSS im deutschen Satz vorkommen
- Die korrekte englische Übersetzung MUSS "${targetVocab.english}" enthalten
- Der Satz sollte natürlich klingen und die Vokabel sinnvoll einbetten`
    : '';

  try {
    const requestStartTime = performance.now();
    
    const requestBody = {
      model: providerConfig.model,
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
${currentLevel.instructions}${vocabInstruction}

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
          content: targetVocab 
            ? `Generiere einen deutschen Satz mit dem Wort "${targetVocab.german}", sodass in der englischen Übersetzung "${targetVocab.english}" verwendet werden muss.

WICHTIG - MEHRERE BEDEUTUNGEN:
Wenn "${targetVocab.german}" mehrere Bedeutungen hat (z.B. "wohl / streitbar"), dann wähle NUR EINE dieser Bedeutungen für den Satz. Verwende NICHT beide Bedeutungen im selben Satz!

WICHTIG - NUR DEUTSCHE WÖRTER:
Der deutsche Satz darf AUSSCHLIESSLICH deutsche Wörter enthalten. NIEMALS englische Wörter im deutschen Satz verwenden! Auch keine englischen Lehnwörter oder Anglizismen, es sei denn sie sind vollständig eingedeutscht (wie "Computer" oder "Email").

Beispiel RICHTIG: "Trotz ihrer großen Erfolge blieb sie stets demütig."
Beispiel FALSCH: "Trotz ihrer großen Erfolge blieb sie stets humble." ❌

Der Satz soll auf ${level}-Niveau sein.`
            : `Generiere einen NEUEN deutschen Satz (${sentenceType}) zum Aspekt "${specificTopic}" EXAKT auf ${level}-Niveau (nicht einfacher, nicht schwieriger!). Beachte die Wortanzahl ${currentLevel.wordCount} und die Komplexität "${currentLevel.complexity}".

WICHTIG: Der Satz muss zu 100% auf DEUTSCH sein, keine englischen Wörter!`
        }],
        temperature: 0.9,
        max_tokens: 200,
        presence_penalty: 0.6,
        frequency_penalty: 0.6
      };
    
    // Log LLM Request
    logService.logLLMRequest(currentProvider, providerConfig.endpoint, requestBody);
    
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify(requestBody)
    });
    
    console.log(`🔄 Sent request to ${providerConfig.name} API for translation sentence generation (${level}/${topic})`);
    
    const requestDuration = Math.round(performance.now() - requestStartTime);
    
    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `${providerConfig.name} API error: ${response.status}`;
      console.error(`❌ ${errorMsg}`, {
        status: response.status,
        responseText: errorText.substring(0, 500),
        level,
        topic,
        provider: currentProvider
      });
      
      // Log Error
      logService.logLLMError(currentProvider, new Error(`${errorMsg} - ${errorText.substring(0, 200)}`), requestBody);
      
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    console.log(`✅ ${providerConfig.name} response received for translation sentence`);
    
    // Log LLM Response
    logService.logLLMResponse(currentProvider, data, requestDuration);
    
    const content = data.choices[0].message.content;
    console.log('📝 API Response content:', content.substring(0, 200) + '...');
    
    try {
      const parsed = JSON.parse(content);
      console.log(`✨ Successfully generated ${level} sentence via ${providerConfig.name}:`, {
        german: parsed.de,
        english: parsed.en,
        hasVocab: !!targetVocab
      });
      
      logService.llm('Satz erfolgreich generiert', {
        provider: currentProvider,
        level,
        topic,
        duration: `${requestDuration}ms`,
        germanSentence: parsed.de,
        englishTranslation: parsed.en
      });
      
      return {
        de: parsed.de || parsed.german || 'Fehler beim Generieren',
        en: parsed.en || parsed.english || 'Error generating',
        targetVocab: targetVocab || null
      };
    } catch (parseError) {
      console.error(`❌ JSON parsing failed for ${providerConfig.name} response:`, {
        error: parseError.message,
        content: content.substring(0, 300)
      });
      
      logService.error('LLM', 'JSON Parsing fehlgeschlagen bei Satzgenerierung', {
        provider: currentProvider,
        error: parseError.message,
        content: content?.substring(0, 300)
      });
      
      // Fallback
      const fallback = getFallbackSentence(level, topic, targetVocab);
      console.log('📚 Using fallback sentence due to parsing error');
      return fallback;
    }
  } catch (error) {
    console.error(`❌ ${providerConfig.name} API failed for sentence generation:`, {
      error: error.message,
      level,
      topic
    });
    
    logService.logLLMError(currentProvider, error, { level, topic, targetVocab });
    
    console.log('📚 Using fallback sentence due to API error');
    return getFallbackSentence(level, topic, targetVocab);
  }
}

/**
 * Prüft, ob eine Ziel-Vokabel in der Übersetzung korrekt verwendet wurde
 * @param {string} userTranslation - Die Übersetzung des Users
 * @param {object} targetVocab - Die Ziel-Vokabel {english, german}
 * @returns {boolean}
 */
export function checkVocabularyUsage(userTranslation, targetVocab) {
  if (!targetVocab || !targetVocab.english) return false;
  
  const translation = userTranslation.toLowerCase();
  const targetWord = targetVocab.english.toLowerCase();
  
  // Prüfe auf exakte Übereinstimmung oder Wortform-Varianten
  // Berücksichtige Plural, Konjugation etc.
  const baseWord = targetWord.replace(/ing$|ed$|s$|es$|ies$/i, '');
  
  // Prüfe ob das Wort oder eine Variante vorkommt
  const wordPattern = new RegExp(`\\b${baseWord}\\w*\\b`, 'i');
  return wordPattern.test(translation) || translation.includes(targetWord);
}

/**
 * Fallback-Sätze wenn keine API verfügbar ist
 */
function getFallbackSentence(level, topic = 'Alltag', targetVocab = null) {
  const sentences = {
    A1: {
      'Politik': [
        { de: "Der Präsident ist wichtig.", en: "The president is important." },
        { de: "Wahlen sind in Deutschland.", en: "Elections are in Germany." }
      ],
      'Sport': [
        { de: "Ich spiele Fußball.", en: "I play football." },
        { de: "Das ist schnell und interessant.", en: "That is fast and interesting." }
      ],
      'Literatur': [
        { de: "Ich lese ein Buch.", en: "I read a book." },
        { de: "Das Buch ist gut.", en: "The book is good." }
      ],
      'Film, Musik, Kunst': [
        { de: "Der Film ist sehr schön.", en: "The film is very beautiful." },
        { de: "Ich sehe gerne Filme.", en: "I like to watch films." }
      ],
      'Alltag': [
        { de: "Ich essen einen Apfel.", en: "I eat an apple." },
        { de: "Das Wasser ist kalt.", en: "The water is cold." }
      ],
      'Persönliche Gespräche': [
        { de: "Hallo, wie geht es dir?", en: "Hello, how are you?" },
        { de: "Ich heiße Anna.", en: "My name is Anna." }
      ]
    },
    A2: {
      'Politik': [
        { de: "Die Regierung hat neue Gesetze gemacht.", en: "The government made new laws." },
        { de: "In Deutschland gibt es Wahlen alle vier Jahre.", en: "In Germany there are elections every four years." }
      ],
      'Sport': [
        { de: "Ich spiele gerne Fußball mit meinen Freunden.", en: "I like to play football with my friends." },
        { de: "Der Athlet läuft sehr schnell.", en: "The athlete runs very fast." }
      ],
      'Literatur': [
        { de: "Ich lese gerne Bücher, besonders Krimis.", en: "I like to read books, especially crime novels." },
        { de: "Die Geschichte ist spannend und lustig.", en: "The story is exciting and funny." }
      ],
      'Film, Musik, Kunst': [
        { de: "Wir gehen oft ins Kino und sehen Filme.", en: "We often go to the cinema and watch films." },
        { de: "Die Musik ist laut und modern.", en: "The music is loud and modern." }
      ],
      'Alltag': [
        { de: "Ich frühstücke jeden Morgen mit meiner Familie.", en: "I have breakfast every morning with my family." },
        { de: "Heute kaufe ich Obst und Gemüse auf dem Markt.", en: "Today I buy fruit and vegetables at the market." }
      ],
      'Persönliche Gespräche': [
        { de: "Mein Hobby ist Malen und ich mag das sehr.", en: "My hobby is painting and I really like it." },
        { de: "Nächste Woche fahre ich in den Urlaub nach Spanien.", en: "Next week I am going on vacation to Spain." }
      ]
    },
    B1: {
      'Politik': [
        { de: "Die Regierung diskutiert über neue Maßnahmen zur Umweltschutz.", en: "The government is discussing new environmental protection measures." },
        { de: "Viele Menschen interessieren sich für Politik, weil sie wichtig ist.", en: "Many people are interested in politics because it is important." }
      ],
      'Sport': [
        { de: "Der Fußballverein hat gestern gegen einen anderen Team gespielt und gewonnen.", en: "The football club played against another team yesterday and won." },
        { de: "Sport ist gesund und macht mir Spaß.", en: "Sports are healthy and I enjoy them." }
      ],
      'Literatur': [
        { de: "Der Roman behandelt die Geschichte einer Familie während des Krieges.", en: "The novel deals with the story of a family during the war." },
        { de: "Ich habe das Buch gelesen, weil viele Leute es empfohlen haben.", en: "I read the book because many people recommended it." }
      ],
      'Film, Musik, Kunst': [
        { de: "Die Ausstellung zeigt Werke von modernen Künstlern aus verschiedenen Ländern.", en: "The exhibition shows works by modern artists from different countries." },
        { de: "Der Film war interessant, obwohl die Geschichte ein bisschen kompliziert war.", en: "The film was interesting, although the story was a bit complicated." }
      ],
      'Alltag': [
        { de: "Ich arbeite in einem Büro, wo ich mit vielen Kollegen zusammenarbeite.", en: "I work in an office where I collaborate with many colleagues." },
        { de: "In meiner Freizeit mache ich gerne Sport und treffe meine Freunde.", en: "In my free time I like to play sports and meet my friends." }
      ],
      'Persönliche Gespräche': [
        { de: "Meine Familie und ich haben viel gemeinsam, aber wir haben auch unterschiedliche Interessen.", en: "My family and I have a lot in common, but we also have different interests." },
        { de: "Ich möchte die Welt bereisen und verschiedene Kulturen kennenlernen.", en: "I want to travel the world and get to know different cultures." }
      ]
    },
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
  
  // Stelle sicher, dass wir einen gültigen Level haben
  const validLevel = sentences[level] ? level : 'B2';
  // Stelle sicher, dass wir ein gültiges Topic haben
  const levelSentences = sentences[validLevel]?.[topic] || sentences[validLevel]?.['Alltag'] || sentences.B2['Alltag'];
  
  if (!levelSentences || levelSentences.length === 0) {
    console.warn(`⚠️ No sentences found for level ${validLevel} and topic ${topic}, using default`);
    return { de: "Hier ist ein Beispielsatz.", en: "Here is an example sentence.", targetVocab: targetVocab || null };
  }
  
  const random = levelSentences[Math.floor(Math.random() * levelSentences.length)];
  console.log('📚 Using fallback sentence:', random);
  return { ...random, targetVocab: targetVocab || null };
}

/**
 * Hilfsfunktion zur Berechnung der Ähnlichkeit zwischen zwei Strings
 */
function calculateSimilarity(str1, str2) {
  // Stelle sicher, dass beide Strings vorhanden sind
  if (!str1 || !str2) {
    console.warn('⚠️ calculateSimilarity received undefined string:', { str1, str2 });
    return 0;
  }
  
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
  // Stelle sicher, dass beide Strings vorhanden sind
  if (!str1 || !str2) {
    return Math.max(str1?.length || 0, str2?.length || 0);
  }
  
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
 * Klassifiziert Vokabeln nach CEFR-Level (A1-C2) mittels LLM
 * @param {Array<{id: number, english: string, german: string}>} vocabularyList - Liste der Vokabeln
 * @param {function} onProgress - Callback für Fortschrittsanzeige (optional)
 * @returns {Promise<Array<{id: number, level: string}>>}
 */
export async function classifyVocabularyLevels(vocabularyList, onProgress = null) {
  const currentProvider = getLLMProvider();
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = import.meta.env[providerConfig.apiKeyEnv];
  
  if (!API_KEY) {
    console.warn('⚠️ No OpenAI API key found, using fallback classification');
    return fallbackClassification(vocabularyList);
  }

  const results = [];
  const batchSize = 20; // Verarbeite 20 Vokabeln pro API-Aufruf für Effizienz
  
  for (let i = 0; i < vocabularyList.length; i += batchSize) {
    const batch = vocabularyList.slice(i, i + batchSize);
    
    if (onProgress) {
      onProgress({
        current: i,
        total: vocabularyList.length,
        message: `Klassifiziere ${Math.min(i + batchSize, vocabularyList.length)} von ${vocabularyList.length}...`
      });
    }

    try {
      const vocabText = batch.map(v => `ID:${v.id} | EN: "${v.english}" | DE: "${v.german}"`).join('\n');
      
      const response = await fetch(providerConfig.endpoint, {
        method: 'POST',
        headers: providerConfig.getHeaders(API_KEY),
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{
            role: 'system',
            content: `Du bist ein Experte für CEFR-Sprachlevel-Klassifizierung (Common European Framework of Reference for Languages).

Klassifiziere jede Vokabel nach ihrem Schwierigkeitsgrad für Englischlerner:

A1 - Anfänger: Grundlegende Alltagswörter (Zahlen, Farben, Familie, einfache Grüße, Körperteile)
A2 - Grundstufe: Häufige Alltagssituationen (Einkaufen, Reisen, einfache Beschreibungen)
B1 - Mittelstufe: Erfahrungen, Meinungen, abstrakte Konzepte
B2 - Gehobene Mittelstufe: Komplexere Themen, Fachvokabular, Redewendungen
C1 - Fortgeschritten: Idiomatische Ausdrücke, gehobene Sprache, spezialisiertes Vokabular
C2 - Nahezu muttersprachlich: Sehr seltene Wörter, Nuancen, Fachterminologie

Antworte NUR mit einem JSON-Array: [{"id": <ID>, "level": "<A1|A2|B1|B2|C1|C2>"}]
Keine zusätzlichen Erklärungen!`
          }, {
            role: 'user',
            content: `Klassifiziere folgende Vokabeln:\n${vocabText}`
          }],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        results.push(...parsed);
      } else {
        // Fallback für diesen Batch
        results.push(...fallbackClassification(batch));
      }
    } catch (error) {
      console.error('LLM classification failed for batch:', error);
      // Fallback für fehlgeschlagenen Batch
      results.push(...fallbackClassification(batch));
    }

    // Kleine Pause zwischen API-Aufrufen
    if (i + batchSize < vocabularyList.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (onProgress) {
    onProgress({
      current: vocabularyList.length,
      total: vocabularyList.length,
      message: 'Klassifizierung abgeschlossen!'
    });
  }

  return results;
}

/**
 * Klassifiziert eine einzelne Vokabel nach CEFR-Level
 * @param {string} english - Englisches Wort
 * @param {string} german - Deutsches Wort
 * @returns {Promise<string>} - CEFR-Level (A1-C2)
 */
export async function classifySingleVocabulary(english, german) {
  const currentProvider = getLLMProvider();
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = import.meta.env[providerConfig.apiKeyEnv];
  
  if (!API_KEY) {
    return fallbackSingleClassification(english);
  }

  try {
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [{
          role: 'system',
          content: `Du bist ein Experte für CEFR-Sprachlevel-Klassifizierung.

Klassifiziere die Vokabel nach Schwierigkeitsgrad für Englischlerner:
A1 - Grundlegend (Zahlen, Farben, Familie, einfache Grüße)
A2 - Grundstufe (Alltagssituationen)
B1 - Mittelstufe (abstrakte Konzepte)
B2 - Gehoben (komplexere Themen, Redewendungen)
C1 - Fortgeschritten (idiomatische Ausdrücke)
C2 - Muttersprachlich (sehr selten, Nuancen)

Antworte NUR mit dem Level: A1, A2, B1, B2, C1 oder C2`
        }, {
          role: 'user',
          content: `EN: "${english}" | DE: "${german}"`
        }],
        temperature: 0.3,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const level = data.choices[0].message.content.trim().toUpperCase();
    
    // Validiere Level
    if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
      return level;
    }
    return 'B2'; // Fallback
  } catch (error) {
    console.error('Single vocabulary classification failed:', error);
    return fallbackSingleClassification(english);
  }
}

/**
 * Fallback-Klassifizierung basierend auf Worthäufigkeit und Länge
 */
function fallbackClassification(vocabularyList) {
  return vocabularyList.map(vocab => ({
    id: vocab.id,
    level: fallbackSingleClassification(vocab.english)
  }));
}

function fallbackSingleClassification(english) {
  const word = english.toLowerCase();
  const wordLength = word.split(' ').length;
  
  // Sehr einfache Wörter (A1)
  const a1Words = ['hello', 'hi', 'yes', 'no', 'please', 'thank', 'sorry', 'good', 'bad', 'big', 'small', 
    'one', 'two', 'three', 'red', 'blue', 'green', 'mother', 'father', 'house', 'car', 'dog', 'cat',
    'water', 'food', 'name', 'day', 'night', 'morning', 'today', 'here', 'there', 'what', 'where', 'who'];
  
  // Grundlegende Wörter (A2)
  const a2Words = ['buy', 'sell', 'work', 'money', 'shop', 'travel', 'holiday', 'hotel', 'weather',
    'clothes', 'breakfast', 'lunch', 'dinner', 'restaurant', 'city', 'country', 'hospital', 'school'];
  
  // Einfache Phrasen und abstrakte Konzepte (B1)
  const b1Indicators = ['experience', 'opinion', 'believe', 'understand', 'decision', 'relationship'];
  
  // Komplexere Konzepte (C1/C2)
  const advancedIndicators = ['albeit', 'notwithstanding', 'hitherto', 'aforementioned', 'juxtaposition'];
  
  if (a1Words.some(w => word.includes(w))) return 'A1';
  if (a2Words.some(w => word.includes(w))) return 'A2';
  if (advancedIndicators.some(w => word.includes(w))) return 'C1';
  if (b1Indicators.some(w => word.includes(w))) return 'B1';
  
  // Nach Wortanzahl schätzen
  if (wordLength >= 4) return 'B2';
  if (wordLength >= 2) return 'B1';
  if (word.length <= 4) return 'A1';
  if (word.length <= 6) return 'A2';
  
  return 'B1'; // Default
}

/**
 * Generiert ein Dialog-Szenario
 * @param {string} level - Sprachniveau (B2, C1, C2)
 * @param {string} topic - Themenbereich (optional)
 * @returns {Promise<{situation: string, role: string, context: string, firstMessage: string, description: string}>}
 */
export async function generateDialogScenario(level = 'B2', topic = 'Alltag') {
  const currentProvider = getLLMProvider();
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = import.meta.env[providerConfig.apiKeyEnv];
  
  if (!API_KEY) {
    return getFallbackScenario(level, topic);
  }
  
  // Level-specific instructions for varied scenarios
  const levelInstructions = {
    B2: 'Create an engaging conversation scenario. Mix positive situations (making plans, sharing experiences, asking for advice) with occasional challenges. Keep it natural and enjoyable - not every conversation needs conflict.',
    C1: 'Create an interesting conversation with depth. Include scenarios like discussing ideas, sharing opinions, planning projects, or exploring topics. Make it intellectually stimulating but not necessarily confrontational.',
    C2: 'Create a sophisticated conversation on complex topics, professional discussions, or nuanced subjects. Focus on depth and complexity rather than conflict.'
  };
  
  try {
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [{
          role: 'system',
          content: `You are an English teacher creating VARIED and ENGAGING conversation scenarios for German learners.

${levelInstructions[level]}

Topic: "${topic}"
Level: ${level}

SCENARIO VARIETY - Use different types:
1. POSITIVE: Making plans, getting advice, sharing experiences, discussing interests
2. COLLABORATIVE: Planning together, brainstorming, problem-solving as a team
3. INFORMATIVE: Asking about something, getting recommendations, learning about a topic
4. SOCIAL: Small talk, catching up with someone, making new friends
5. OCCASIONAL CHALLENGE: Sometimes (not always) include a mild conflict or complaint

SCENARIO STRUCTURE:
- Define WHO the STUDENT is (their role: student, tourist, colleague, customer, etc.)
- Define WHO the CONVERSATION PARTNER is (your role: professor, local, colleague, shopkeeper, etc.)
- Set up an ENGAGING situation (not necessarily a problem)
- Create a natural conversation opportunity

CRITICAL RULES:
1. "studentRole" (in German): Who the STUDENT/LEARNER is (e.g., "Kunde", "Student", "Tourist", "Mitarbeiter")
2. "partnerRole" (in German): Who YOU are - the CONVERSATION PARTNER (e.g., "Verkäufer", "Professor", "Einheimischer", "Kollege")
3. "firstMessage" (in ENGLISH): YOU START the conversation from YOUR role's perspective
   
   ROLE CONSISTENCY EXAMPLES:
   
   ✅ CORRECT:
   * YOU = "Verkäufer" / STUDENT = "Kunde"
     → "Good morning! Welcome to our store. How can I help you today?"
   
   * YOU = "Kunde" / STUDENT = "Verkäufer"  
     → "Hello, I'm looking for a birthday gift for my sister. Can you recommend something?"
   
   * YOU = "Professor" / STUDENT = "Politikwissenschaftsstudent"
     → "Good morning! I wanted to discuss your research proposal. What topics interest you?"
   
   * YOU = "Freund" / STUDENT = "Freund"
     → "Hey! I was thinking we could do something fun this weekend. Any ideas?"
   
   ❌ WRONG:
   * YOU = "Professor" / STUDENT = "Student"
     → "I've been following political movements..." (This sounds like a STUDENT talking!)
   
   * YOU = "Verkäufer" / STUDENT = "Kunde"
     → "Do you have this in blue?" (This is a CUSTOMER question!)
   
   KEY PRINCIPLE: Always speak from YOUR partnerRole perspective, not from the student's!

VARY THE TONE: friendly, enthusiastic, curious, helpful, professional, casual - not always confrontational!

Respond in JSON format: 
{
  "studentRole": "Rolle des Studenten auf Deutsch (z.B. 'Politikwissenschaftsstudent')",
  "partnerRole": "Rolle des Gesprächspartners auf Deutsch (z.B. 'Dozent für Politikwissenschaft')", 
  "description": "Kurze Szenariobeschreibung auf Deutsch",
  "firstMessage": "Your engaging opening as the CONVERSATION PARTNER in ENGLISH"
}`
        }, {
          role: 'user',
          content: `Create an engaging conversation scenario at ${level} level about "${topic}". Make it interesting and varied - it doesn't need to be a conflict or complaint. Positive and collaborative scenarios are encouraged!`
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
  const currentProvider = getLLMProvider();
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = import.meta.env[providerConfig.apiKeyEnv];
  
  if (!API_KEY) {
    return getFallbackResponse();
  }
  
  try {
    const messages = [
      {
        role: 'system',
        content: `You are a conversation partner in this scenario: ${scenario.description}

CRITICAL RULES:
1. You MUST respond ONLY in English - never use German or any other language
2. Stay in character and respond naturally to what the student says
3. Be VARIED in your approach:
   - If the scenario is positive/collaborative: Be helpful, enthusiastic, and encouraging
   - If the scenario involves a question: Provide helpful information and ask follow-up questions
   - If the scenario has a conflict: Be reasonable but firm (don't be unnecessarily difficult)
   - If making plans: Be engaged and contribute ideas
4. React authentically to the student's responses:
   - If they make a good point, acknowledge it
   - If they're being creative or thoughtful, show appreciation
   - If there's a genuine issue, address it reasonably
5. Keep the conversation flowing naturally - ask questions, share thoughts, build on their ideas
6. Match the language level: ${level}
7. Keep responses conversational and natural (2-4 sentences max)
8. If the user goes off-topic, gently guide them back

Your goal: Have a natural, engaging conversation that helps the student practice English in a realistic way - not every conversation needs to be a battle!`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];
    
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify({
        model: providerConfig.model,
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
  const currentProvider = getLLMProvider();
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = import.meta.env[providerConfig.apiKeyEnv];
  
  console.log(`📋 Starting dialog evaluation with ${providerConfig.name}`, {
    provider: currentProvider,
    hasAPIKey: !!API_KEY,
    conversationLength: conversationHistory.length
  });
  
  if (!API_KEY) {
    console.warn(`⚠️ No API key found for ${providerConfig.name}, using fallback evaluation`);
    return generateFallbackDialogEvaluation(conversationHistory, level);
  }
  
  try {
    // Create a more concise system prompt to avoid token limits
    const systemPrompt = `Du bist ein erfahrener Englischlehrer. Bewerte die SPRACHLICHEN FÄHIGKEITEN des Schülers (nicht die Argumentationskraft).

BEWERTUNGSKRITERIEN (1-10):
1. GRAMMATIK: Zeitformen, Satzstruktur, Artikel, Präpositionen
2. VOKABULAR: Wortschatz und Wahl, idiomatische Ausdrücke
3. FLÜSSIGKEIT: Natürlicher Fluss, Kohärenz, Satzvariation
4. ANGEMESSENHEIT: Register, Höflichkeit für den Kontext
5. KONTEXTREAKTION: Relevante Antworten auf die Situation

WICHTIG: Nur die SCHÜLERNACHRICHTEN bewerten, NICHT die des Partners.

ANTWORT ALS JSON:
{
  "grammar": 1-10, 
  "vocabulary": 1-10, 
  "fluency": 1-10, 
  "appropriateness": 1-10, 
  "contextResponse": 1-10, 
  "overallScore": 1-10, 
  "languageLevel": "A1|A2|B1|B2|C1|C2", 
  "detailedFeedback": "Ausführliches Feedback auf Deutsch über die sprachliche Leistung", 
  "errors": [
    {
      "original": "Der exakte fehlerhafte Satz oder Ausdruck des Schülers", 
      "correction": "Die korrigierte Version", 
      "explanation": "Erklärung auf Deutsch, was falsch war"
    }
  ], 
  "strengths": ["Liste positiver Aspekte auf Deutsch"], 
  "improvements": ["Konkrete Verbesserungsvorschläge auf Deutsch"], 
  "tips": ["Praktische Tipps für die Zukunft auf Deutsch"]
}

WICHTIG für errors: 
- Finde KONKRETE sprachliche Fehler in den Schüler-Nachrichten
- Zitiere den EXAKTEN fehlerhaften Ausdruck in "original"
- Gib die KORRIGIERTE Version in "correction"
- Wenn keine Fehler vorhanden sind, gib ein leeres Array [] zurück`;

    const userContent = `Szenario: ${scenario.description}\nZielsprache: ${level}\n\nGespräch:\n${conversationHistory.map(m => `${m.role === 'user' ? 'SCHÜLER' : 'PARTNER'}: ${m.content}`).join('\n')}\n\nBewerte nur die Schüler-Nachrichten auf Sprachkenntnisse.`;

    console.log(`🔍 Sending request to ${providerConfig.name} API...`);
    
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      const errorMessage = `${providerConfig.name} API Error ${response.status}`;
      console.error(`❌ ${errorMessage}:`, errorData);
      
      // Log detailed error info
      console.error(`📋 Request details:`, {
        endpoint: providerConfig.endpoint,
        model: providerConfig.model,
        status: response.status,
        responseText: errorData.substring(0, 500)
      });
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log(`✅ ${providerConfig.name} response received`);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(`Invalid response structure from ${providerConfig.name}`);
    }
    
    const content = data.choices[0].message.content;
    console.log('📝 API Response content:', content.substring(0, 200) + '...');
    
    const evaluation = JSON.parse(content);
    
    // Ensure all required fields exist
    const result = {
      grammar: evaluation.grammar || 5,
      vocabulary: evaluation.vocabulary || 5,
      fluency: evaluation.fluency || 5,
      appropriateness: evaluation.appropriateness || 5,
      contextResponse: evaluation.contextResponse || 5,
      overallScore: evaluation.overallScore || Math.round((evaluation.grammar + evaluation.vocabulary + evaluation.fluency + evaluation.appropriateness + evaluation.contextResponse) / 5),
      languageLevel: evaluation.languageLevel || level,
      detailedFeedback: evaluation.detailedFeedback || 'Gute sprachliche Leistung im Dialog.',
      errors: evaluation.errors || [],
      strengths: evaluation.strengths || [],
      improvements: evaluation.improvements || [],
      tips: evaluation.tips || []
    };
    
    console.log('✅ Dialog evaluation successful:', {
      provider: currentProvider,
      overallScore: result.overallScore,
      grammar: result.grammar,
      vocabulary: result.vocabulary
    });
    
    return result;
  } catch (error) {
    console.error(`❌ ${providerConfig.name} evaluation failed:`, {
      error: error.message,
      provider: currentProvider,
      stack: error.stack
    });
    console.warn(`⚠️ Falling back to local evaluation...`);
    
    // Use fallback evaluation
    return generateFallbackDialogEvaluation(conversationHistory, level);
  }
}

/**
 * Generates a fallback dialog evaluation when API is not available
 */
function generateFallbackDialogEvaluation(conversationHistory, level) {
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  const messageCount = userMessages.length;
  const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / (messageCount || 1);
  
  // Calculate base score based on message length and count
  const lengthScore = Math.min(10, Math.max(5, Math.round(avgLength / 15)));
  const participationScore = Math.min(10, Math.max(5, messageCount));
  const baseScore = Math.round((lengthScore + participationScore) / 2);
  
  // Analyze message characteristics
  let strengthsList = ['Aktive Teilnahme am Dialog', 'Angemessene Reaktionen auf die Situation'];
  let improvementsList = ['Verwende vollständigere Sätze', 'Nutze mehr Variationen in deinen Formulierungen'];
  
  // Check for question marks (shows engagement)
  const questionsCount = userMessages.filter(m => m.content.includes('?')).length;
  if (questionsCount > messageCount / 2) {
    strengthsList.push('Gutes Engagement durch Fragen');
  } else {
    improvementsList.push('Stelle mehr Fragen, um das Gespräch zu vertiefen');
  }
  
  // Check for average message length
  if (avgLength > 50) {
    strengthsList.push('Detaillierte Antworten');
  } else {
    improvementsList.push('Versuche, ausführlichere Antworten zu geben');
  }
  
  return {
    grammar: baseScore,
    vocabulary: baseScore,
    fluency: baseScore,
    appropriateness: baseScore,
    contextResponse: baseScore,
    overallScore: baseScore,
    languageLevel: level,
    detailedFeedback: `Gute sprachliche Leistung! Du hast aktiv am Gespräch teilgenommen und angemessen auf die Situation reagiert. Das System hat deine Leistung bewertet (${messageCount} Nachrichten analysiert).`,
    errors: [],
    strengths: strengthsList,
    improvements: improvementsList,
    tips: [
      'Nutze Konjunktionen wie "because", "although", "however" um deine Gedanken zu verbinden',
      'Verwende höfliche Formulierungen mit "would", "could", "may"',
      'Versuche, komplexere Satzstrukturen zu verwenden'
    ]
  };
}

/**
 * Fallback-Szenarios
 */
function getFallbackScenario(level, topic = 'Alltag') {
  const scenarios = {
    'B2': {
      'Politik': [
        {
          studentRole: "Du bist ein interessierter Bürger",
          partnerRole: "Ich bin ein Stadtratsmitglied",
          description: "Du möchtest mehr über ein neues Stadtentwicklungsprojekt erfahren und deine Ideen einbringen.",
          firstMessage: "Hi! I'm glad you could make it to our community meeting. We're planning a new park in the neighborhood. What are your thoughts? Do you have any suggestions?"
        },
        {
          studentRole: "Du bist bei einer politischen Diskussionsrunde",
          partnerRole: "Ich bin ein anderer Teilnehmer",
          description: "Ihr diskutiert über umweltfreundliche Stadtentwicklung und tauscht Ideen aus.",
          firstMessage: "I think bike lanes are great, but we should also consider electric buses. What's your opinion on the best way to make our city more sustainable?"
        }
      ],
      'Sport': [
        {
          studentRole: "Du möchtest mit Joggen anfangen",
          partnerRole: "Ich bin ein erfahrener Läufer",
          description: "Du triffst einen Läufer im Park und fragst nach Tipps und Ratschlägen für Anfänger.",
          firstMessage: "Hey! I noticed you running here regularly. I'm just starting out - any tips for a beginner? What's a good distance to begin with?"
        },
        {
          studentRole: "Du bist im Fitnessstudio",
          partnerRole: "Ich bin ein freundlicher Trainer",
          description: "Ein Trainer bietet dir an, einen Trainingsplan zu erstellen und fragt nach deinen Zielen.",
          firstMessage: "Hi there! I'm one of the trainers here. I see you're working out - what are your fitness goals? I'd be happy to help you create a plan!"
        }
      ],
      'Literatur': [
        {
          studentRole: "Du bist in einer Buchhandlung",
          partnerRole: "Ich bin der Buchhändler",
          description: "Du suchst ein Geschenk für einen Freund und der Buchhändler hilft dir mit Empfehlungen.",
          firstMessage: "Welcome! Looking for something special today? I love helping people find the perfect book. What kind of stories does your friend enjoy?"
        },
        {
          studentRole: "Du bist in einem Buchclub",
          partnerRole: "Ich bin ein anderes Mitglied",
          description: "Ihr tauscht euch begeistert über das aktuelle Buch aus und diskutiert eure Lieblingsszenen.",
          firstMessage: "Oh my god, that plot twist in chapter 12! What did you think? I couldn't put the book down after that!"
        }
      ],
      'Film, Musik, Kunst': [
        {
          studentRole: "Du bist auf einem Festival",
          partnerRole: "Ich bin ein anderer Festivalbesucher",
          description: "Ihr kommt ins Gespräch über die Bands und tauscht Empfehlungen aus.",
          firstMessage: "That last band was amazing! Have you seen any other good performances today? I'm trying to decide what to see next."
        },
        {
          studentRole: "Du bist in einem Museumsshop",
          partnerRole: "Ich bin ein Mitarbeiter",
          description: "Du suchst ein schönes Kunstposter und der Mitarbeiter gibt dir Empfehlungen.",
          firstMessage: "Hi! These art prints are really popular. Are you looking for something for yourself or as a gift? What style do you prefer?"
        }
      ],
      'Alltag': [
        {
          studentRole: "Du bist neu in der Nachbarschaft",
          partnerRole: "Ich bin dein Nachbar",
          description: "Dein neuer Nachbar begrüßt dich freundlich und gibt dir Tipps für die Umgebung.",
          firstMessage: "Hey! Welcome to the neighborhood! I'm your neighbor from next door. How are you settling in? Need any recommendations for good restaurants or shops around here?"
        },
        {
          studentRole: "Du bist in einem Café",
          partnerRole: "Ich bin der Barista",
          description: "Der Barista ist freundlich und hilft dir, das perfekte Getränk zu finden.",
          firstMessage: "Good morning! First time here? We have some amazing seasonal drinks. What kind of flavors do you usually enjoy?"
        },
        {
          studentRole: "Du planst eine Reise",
          partnerRole: "Ich bin ein Freund mit Reiseerfahrung",
          description: "Ein Freund gibt dir begeistert Tipps für deine geplante Reise nach Schottland.",
          firstMessage: "Scotland! Oh, you're going to love it! I was there last summer. What places are you planning to visit? I have so many recommendations!"
        }
      ],
      'Persönliche Gespräche': [
        {
          studentRole: "Du triffst einen alten Freund",
          partnerRole: "Ich bin dein alter Freund",
          description: "Ihr trefft euch nach langer Zeit wieder und erzählt euch, was ihr so gemacht habt.",
          firstMessage: "Wow, it's been ages! How have you been? I heard you started a new job - how's that going?"
        },
        {
          studentRole: "Du bist mit einem Freund unterwegs",
          partnerRole: "Ich bin dein Freund",
          description: "Ihr plant spontan, was ihr am Wochenende zusammen unternehmen könnt.",
          firstMessage: "Hey, what are you up to this weekend? I was thinking we could do something fun - maybe check out that new escape room that just opened?"
        }
      ]
    },
    'C1': {
      'Politik': [
        {
          studentRole: "Du bist bei einer Think-Tank-Diskussion",
          partnerRole: "Ich bin ein Politikexperte",
          description: "Ihr diskutiert verschiedene Ansätze zur Stadtentwicklung und deren langfristige Auswirkungen.",
          firstMessage: "I've been researching urban development strategies across Europe. What's your perspective on balancing economic growth with sustainable practices? I find the Nordic model particularly interesting."
        }
      ],
      'Sport': [
        {
          studentRole: "Du nimmst an einer Sportkonferenz teil",
          partnerRole: "Ich bin ein Sportwissenschaftler",
          description: "Ihr diskutiert über moderne Trainingsmethoden und den Einsatz von Technologie im Sport.",
          firstMessage: "Your presentation on data-driven training was fascinating. How do you see AI changing the future of athletic performance? I'd love to hear your thoughts on the ethical implications too."
        }
      ],
      'Literatur': [
        {
          studentRole: "Du bist bei einer literarischen Diskussion",
          partnerRole: "Ich bin ein Literaturprofessor",
          description: "Ihr analysiert gemeinsam moderne narrative Techniken in zeitgenössischer Literatur.",
          firstMessage: "I really appreciate your analysis of unreliable narrators in modern fiction. Have you noticed how this technique has evolved since the postmodern era? What patterns do you see emerging?"
        }
      ],
      'Film, Musik, Kunst': [
        {
          studentRole: "Du bist auf einer Kunstausstellungseröffnung",
          partnerRole: "Ich bin ein Kunstkurator",
          description: "Ihr diskutiert über die Bedeutung von digitaler Kunst in der zeitgenössischen Kunstszene.",
          firstMessage: "Your thoughts on the intersection of technology and art are intriguing. How do you think NFTs and digital installations are reshaping our understanding of artistic value and ownership?"
        }
      ],
      'Alltag': [
        {
          studentRole: "Du bist bei einem professionellen Networking-Event",
          partnerRole: "Ich bin ein Branchenkollege",
          description: "Ihr tauscht euch über innovative Ansätze in eurer Branche aus und diskutiert zukünftige Trends.",
          firstMessage: "I really enjoyed your presentation earlier. Your approach to sustainability in business operations is refreshing. How did you convince your stakeholders to invest in such long-term initiatives?"
        }
      ],
      'Persönliche Gespräche': [
        {
          studentRole: "Du triffst einen Mentor",
          partnerRole: "Ich bin dein Mentor",
          description: "Ihr diskutiert über Karriereentwicklung und persönliche Ziele in einer unterstützenden Atmosphäre.",
          firstMessage: "It's great to catch up! I've been thinking about your career trajectory. You've made impressive progress. What are your aspirations for the next phase? I'd love to help you navigate that."
        }
      ]
    },
    'C2': {
      'Politik': [
        {
          studentRole: "Du bist bei einer Think-Tank-Diskussion",
          partnerRole: "Ich bin ein Politikforscher",
          description: "Ihr analysiert komplexe geopolitische Entwicklungen und deren philosophische Implikationen.",
          firstMessage: "Your analysis of emerging democratic models in the digital age raises fascinating questions. How do you reconcile traditional notions of sovereignty with the deterritorialized nature of contemporary governance structures?"
        }
      ],
      'Literatur': [
        {
          studentRole: "Du bist bei einem literarischen Symposium",
          partnerRole: "Ich bin ein Literaturtheoretiker",
          description: "Ihr erkundet zusammen neue Perspektiven auf narrative Strukturen und deren kulturelle Bedeutung.",
          firstMessage: "Your interdisciplinary approach to narrative theory is compelling. How do you see the intersection of cognitive science and literary analysis evolving? The implications for understanding consciousness through fiction are profound."
        }
      ],
      'Alltag': [
        {
          studentRole: "Du bist bei einer Führungskräfte-Konferenz",
          partnerRole: "Ich bin ein CEO",
          description: "Ihr diskutiert über ethische Führung und die Zukunft der Arbeitswelt in einer sich wandelnden Gesellschaft.",
          firstMessage: "I'm intrigued by your perspective on stakeholder capitalism. How do you navigate the tension between shareholder expectations and broader social responsibilities? The philosophical dimensions are as challenging as the practical ones."
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
