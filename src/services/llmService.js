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
 * @param {object} targetVocab - Ziel-Vokabel die verwendet werden soll (optional)
 * @returns {Promise<{de: string, en: string, targetVocab?: object}>}
 */
export async function generateTranslationSentence(level = 'B2', topic = 'Alltag', targetVocab = null) {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  console.log('📝 Generating translation sentence, API Key exists:', !!API_KEY);
  console.log('🎯 Target vocabulary:', targetVocab);
  
  if (!API_KEY) {
    console.warn('⚠️ No OpenAI API key, using fallback sentences');
    return getFallbackSentence(level, topic, targetVocab);
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
            ? `Generiere einen deutschen Satz, der das Wort "${targetVocab.german}" enthält, sodass in der englischen Übersetzung "${targetVocab.english}" verwendet werden muss. Der Satz soll auf ${level}-Niveau sein.`
            : `Generiere einen NEUEN deutschen Satz (${sentenceType}) zum Aspekt "${specificTopic}" EXAKT auf ${level}-Niveau (nicht einfacher, nicht schwieriger!). Beachte die Wortanzahl ${currentLevel.wordCount} und die Komplexität "${currentLevel.complexity}".`
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
        en: parsed.en || parsed.english || 'Error generating',
        targetVocab: targetVocab || null
      };
    } catch {
      throw new Error('Failed to parse OpenAI response');
    }
  } catch (error) {
    console.error('OpenAI sentence generation failed, using fallback:', error);
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
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
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
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!API_KEY) {
    return fallbackSingleClassification(english);
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

SCENARIO STRUCTURE REQUIREMENTS:
- Define WHO the student is (their role: student, customer, employee, citizen, etc.)
- Define WHO you are (the conversation partner: tutor, manager, neighbor, official, etc.)
- Present a PROBLEM or CONFLICT that the student must handle
- The student must DEFEND, NEGOTIATE, EXPLAIN, or PERSUADE

CRITICAL RULES:
1. "studentRole" (in German): Clearly state who the student is and what they need to do
2. "partnerRole" (in German): State who YOU are (the conversation partner)
3. "firstMessage" (in ENGLISH): Your opening statement as the conversation partner that CHALLENGES the student
   - You must speak from YOUR role, NOT the student's role
   - Example: If student is apologizing → You are the tutor saying "I'm disappointed you didn't submit the assignment"
   - NOT: "I'm sorry professor..." (this would be the student speaking)

Respond in JSON format: 
{
  "studentRole": "Rolle des Studenten auf Deutsch",
  "partnerRole": "Rolle des Gesprächspartners auf Deutsch", 
  "description": "Kurze Szenariobeschreibung auf Deutsch",
  "firstMessage": "Your challenging opening as the conversation partner in ENGLISH"
}`
        }, {
          role: 'user',
          content: `Create a challenging conversation scenario at ${level} level about "${topic}". Make sure the firstMessage comes from the conversation partner's perspective, not the student's.`
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
          content: `You are an experienced English language teacher evaluating a student's LANGUAGE SKILLS (not debate skills) in this conversation scenario: "${scenario.description}".

STUDENT'S ROLE: ${scenario.studentRole || 'Not specified'}
PARTNER'S ROLE: ${scenario.partnerRole || 'Your role as conversation partner'}

CRITICAL: This is a LANGUAGE EXERCISE, not a debate competition!

WHAT TO EVALUATE:
✅ Grammar, vocabulary, sentence structure
✅ Linguistic fluency and natural expression
✅ Appropriate register and politeness for the context
✅ Whether responses are contextually appropriate for the scenario

WHAT NOT TO EVALUATE:
❌ Strength of arguments or persuasiveness
❌ Whether the student "won" the debate
❌ Quality of reasoning or logic
❌ Content knowledge

IMPORTANT: Only evaluate the STUDENT's messages. Do NOT evaluate the conversation partner's (assistant's) messages.

CRITICAL ERROR IDENTIFICATION RULES:
⚠️ ONLY mark something as an error if it is OBJECTIVELY WRONG
⚠️ DO NOT mark stylistic preferences as errors
⚠️ DO NOT mark correct grammar as errors just because an alternative exists
⚠️ DO NOT mark punctuation that YOU added (like quotation marks) as student errors
⚠️ DO NOT mark valid alternative phrasings as errors

EXAMPLES OF WHAT IS AN ERROR:
✅ "He go to school" → REAL ERROR (subject-verb agreement)
✅ "I have went" → REAL ERROR (incorrect past participle)
✅ "buisy" instead of "busy" → REAL ERROR (spelling)
✅ "Me and him goes" → REAL ERROR (multiple errors)

EXAMPLES OF WHAT IS NOT AN ERROR:
❌ "shows" in "app that shows me" → CORRECT (3rd person singular)
❌ Quotation marks in dialogue → CORRECT (if properly used)
❌ "I would ask you" vs "I'd ask you" → BOTH CORRECT (style choice)
❌ "but" at start of sentence → CORRECT (acceptable in modern English)

BE CONSERVATIVE: If you're not 100% certain something is wrong, DO NOT mark it as an error.
Empty "errors" array is better than false positives!

EVALUATION CRITERIA:

1. GRAMMAR (1-10): Accuracy of verb tenses, subject-verb agreement, articles, prepositions, sentence structure
2. VOCABULARY (1-10): Range and appropriateness of vocabulary, idiomatic expressions, word choice
3. FLUENCY (1-10): Natural flow, coherence, sentence variety, appropriate linking words
4. APPROPRIATENESS (1-10): Is the language suitable for the context? Correct register (formal/informal)? Polite when needed?
5. CONTEXT RESPONSE (1-10): Does the student respond relevantly to the situation? Uses language that fits the scenario?

DETAILED ANALYSIS:
- Identify ONLY REAL, OBJECTIVE grammatical/spelling errors in STUDENT's messages
- Highlight excellent phrases or expressions the STUDENT used
- Provide actionable LANGUAGE improvement suggestions (NOT argument improvements)
- Assess overall language level (A1, A2, B1, B2, C1, C2)

FEEDBACK EXAMPLES:
✅ GOOD: "Schreibfehler: 'buisy' sollte 'busy' heißen"
✅ GOOD: "Zeitform: Nutze 'has been' statt 'have been' bei 3. Person Singular"
✅ GOOD: "Verwende höflichere Formulierungen wie 'Could you...' statt 'Can you...'"
❌ BAD: "Das Verb 'shows' ist falsch" (wenn es korrekt ist!)
❌ BAD: "Die Anführungszeichen sind falsch platziert" (wenn sie korrekt sind!)
❌ BAD: "Deine Argumente waren nicht überzeugend"

ALL FEEDBACK MUST BE IN GERMAN.

Respond in JSON format:
{
  "grammar": 1-10,
  "vocabulary": 1-10,
  "fluency": 1-10,
  "appropriateness": 1-10,
  "contextResponse": 1-10,
  "overallScore": 1-10,
  "languageLevel": "A1|A2|B1|B2|C1|C2",
  "detailedFeedback": "Comprehensive LANGUAGE feedback in German (3-4 sentences, focus on language skills)",
  "errors": [
    {
      "original": "exact student phrase with REAL error (NOT stylistic issues)",
      "correction": "corrected version",
      "explanation": "explanation in German why this is objectively wrong"
    }
  ],
  "strengths": ["language strength 1 in German", "language strength 2 in German"],
  "improvements": ["language improvement 1 in German (NOT argument improvement)", "language improvement 2 in German"],
  "tips": ["practical language tip 1 in German", "practical language tip 2 in German"]
}`
        }, {
          role: 'user',
          content: `Evaluate this conversation at target level ${level}:\n\nSCENARIO: ${scenario.description}\nSTUDENT ROLE: ${scenario.studentRole || 'Not specified'}\nPARTNER ROLE: ${scenario.partnerRole || 'Not specified'}\n\nCONVERSATION:\n${conversationHistory.map(m => `${m.role === 'user' ? 'STUDENT' : 'PARTNER'}: ${m.content}`).join('\n\n')}\n\nIMPORTANT: Only evaluate the STUDENT's messages (not the PARTNER's messages). Analyze grammar, vocabulary, and effectiveness of the student's responses.`
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
      appropriateness: baseScore,
      contextResponse: baseScore,
      overallScore: baseScore,
      languageLevel: level,
      detailedFeedback: 'Gute sprachliche Leistung! Du hast aktiv am Gespräch teilgenommen und angemessen auf die Situation reagiert. Die KI-Bewertung war nicht verfügbar, daher wurde eine Basis-Bewertung erstellt.',
      errors: [],
      strengths: ['Aktive Teilnahme am Dialog', 'Angemessene Reaktionen auf die Situation'],
      improvements: ['Verwende vollständigere Sätze', 'Versuche, mehr Variationen in deinen Formulierungen zu nutzen'],
      tips: ['Nutze Konjunktionen wie "because", "although", "however"', 'Verwende höfliche Formulierungen mit "would", "could", "may"']
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
          studentRole: "Du bist Mitglied eines Stadtrats",
          partnerRole: "Ich bin ein aufgebrachter Anwohner",
          description: "Ein aufgebrachter Anwohner beschuldigt dich, für ein lokales Parkplatzproblem verantwortlich zu sein. Du musst dich verteidigen und die Situation klären.",
          firstMessage: "Excuse me, I need to talk to you! I've heard that you're part of the committee that approved the new parking regulations. Do you realize how much trouble this has caused for local residents? My elderly mother can't park near her own house anymore! What were you thinking?"
        },
        {
          studentRole: "Du bist Stadtratsmitglied",
          partnerRole: "Ich bin ein wütender Geschäftsinhaber",
          description: "Ein wütender Geschäftsinhaber konfrontiert dich mit seiner drastisch gestiegenen Steuerrechnung. Du musst die Steuererhöhung rechtfertigen.",
          firstMessage: "I just received my new tax bill and it's completely outrageous! How can you justify a 30% increase? This will force me to close my business. I demand an explanation!"
        }
      ],
      'Sport': [
        {
          studentRole: "Du bist ein Läufer, der am Marathon teilnehmen möchte",
          partnerRole: "Ich bin ein Organisator des Marathons",
          description: "Du hast dich für einen Marathonlauf angemeldet, aber dein Name ist nicht auf der Liste. Überzeuge den Organisator, dich noch teilnehmen zu lassen.",
          firstMessage: "I'm sorry, but your name isn't on our list. The registration closed three weeks ago. I'm afraid we can't let you participate without proper registration."
        },
        {
          studentRole: "Du trainierst im Fitnessstudio",
          partnerRole: "Ich bin ein anderes Fitnessstudio-Mitglied",
          description: "Ein anderes Mitglied beschwert sich, dass du zu laut trainierst. Verteidige deine Trainingsweise.",
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
