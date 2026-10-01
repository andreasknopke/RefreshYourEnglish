import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// LLM Provider Configuration
// Frei konfigurierbare OpenAI-kompatible Schnittstelle (Base URL + API-Key + Modell),
// z. B. Mistral, OpenAI oder ein lokales Modell (Ollama, vLLM, LM Studio).
//
// Umgebungsvariablen:
//   LLM_BASE_URL  z. B. https://api.mistral.ai/v1, https://api.openai.com/v1,
//                 http://localhost:11434/v1 (Ollama), http://localhost:8000/v1 (vLLM)
//   LLM_API_KEY   API-Key des Anbieters (bei lokalen Modellen oft beliebig)
//   LLM_MODEL     Modellname, z. B. mistral-large-latest, gpt-4o-mini, llama3.1
//   LLM_DISABLE_THINKING  Thinking/Reasoning abschalten (Default: true).
//                 Wichtig bei vLLM + Reasoning-Modellen (z. B. Qwen3), die sonst
//                 ihren Default-Reasoning-Level nutzen. Mit 'false' wieder aktivieren.

const DEFAULT_BASE_URL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'mistral-large-latest';

function normalizeBaseUrl(baseUrl) {
  const url = (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  // Toleriert, wenn der komplette Endpoint (inkl. /chat/completions) angegeben wurde.
  return url.replace(/\/chat\/completions$/i, '');
}

const LLM_PROVIDERS = {
  openai: {
    name: process.env.LLM_MODEL || DEFAULT_MODEL,
    apiKeyEnv: 'LLM_API_KEY',
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
    endpoint: `${normalizeBaseUrl(process.env.LLM_BASE_URL)}/chat/completions`,
    getHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  }
};

const DEFAULT_PROVIDER = 'openai';

/**
 * Schaltet Thinking/Reasoning bei OpenAI-kompatiblen Servern (z. B. vLLM mit Qwen) ab.
 *
 * Ohne diese Parameter nutzen Reasoning-Modelle (Qwen3 u. a.) ihren
 * Default-Reasoning-Level, was Antworten deutlich verlangsamt und die
 * JSON-Antworten zerstören kann. Es werden beide Schalter gesendet:
 *   - chat_template_kwargs: { enable_thinking: false, thinking: false }
 *       -> von vLLM an den Chat-Template-Renderer durchgereicht; Variablen, die das
 *          Template nicht kennt, werden von vLLM harmlos gefiltert.
 *   - reasoning_effort: 'none'
 *       -> OpenAI-kompatibler Standardwert; vLLM übersetzt ihn zusätzlich in
 *          enable_thinking = false.
 *
 * Abschaltbar per ENV: LLM_DISABLE_THINKING=false
 */
const DISABLE_THINKING = String(process.env.LLM_DISABLE_THINKING ?? 'true').toLowerCase() !== 'false';

function noThinkingParams() {
  if (!DISABLE_THINKING) {
    return {};
  }
  return {
    chat_template_kwargs: { enable_thinking: false, thinking: false },
    reasoning_effort: 'none'
  };
}

function resolveProvider(requestedProvider) {
  return LLM_PROVIDERS[requestedProvider] ? requestedProvider : DEFAULT_PROVIDER;
}

function normalizeTextValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value == null) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object') {
    const parts = [value.suggestion, value.example, value.note, value.text]
      .filter((part) => typeof part === 'string' && part.trim());

    if (parts.length > 0) {
      return parts.join(' - ');
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  return '';
}

function normalizeListValue(value) {
  if (Array.isArray(value)) {
    return value
      .map(normalizeTextValue)
      .filter((item) => item.trim());
  }

  const normalized = normalizeTextValue(value);
  return normalized.trim() ? [normalized] : [];
}

function normalizeEvaluationResult(parsed) {
  const rawScore = Number(parsed?.score);
  const boundedScore = Number.isFinite(rawScore)
    ? Math.min(10, Math.max(1, Math.round(rawScore)))
    : 7;

  return {
    score: boundedScore,
    feedback: normalizeTextValue(parsed?.feedback) || 'Gute Übersetzung!',
    improvements: normalizeListValue(parsed?.improvements),
    spellingNotes: normalizeListValue(parsed?.spellingNotes)
  };
}

/**
 * GET /api/llm/provider
 * Returns the current LLM configuration (from backend environment).
 * Die Einstellungen im Frontend fragen hier die tatsächlich aktive
 * Backend-Konfiguration ab (LLM_BASE_URL / LLM_API_KEY / LLM_MODEL).
 */
router.get('/provider', (req, res) => {
  const provider = resolveProvider(process.env.LLM_PROVIDER || DEFAULT_PROVIDER);
  const providerConfig = LLM_PROVIDERS[provider];
  const hasApiKey = !!process.env[providerConfig.apiKeyEnv];

  console.log(`📋 LLM Provider Info: ${provider} (API Key: ${hasApiKey ? '✅' : '❌'})`);

  res.json({
    provider,
    name: providerConfig.name,
    baseUrl: normalizeBaseUrl(process.env.LLM_BASE_URL),
    model: providerConfig.model,
    hasApiKey,
    availableProviders: Object.keys(LLM_PROVIDERS)
  });
});

/**
 * POST /api/llm/generate-sentence
 * Generates a translation sentence using the configured LLM
 */
router.post('/generate-sentence', async (req, res) => {
  try {
    const { level = 'B2', topic = 'Alltag', targetVocab = null, provider = null } = req.body;
    
    // Use specified provider or fall back to env variable
    const currentProvider = resolveProvider(provider || process.env.LLM_PROVIDER || DEFAULT_PROVIDER);
    const providerConfig = LLM_PROVIDERS[currentProvider];
    const API_KEY = process.env[providerConfig.apiKeyEnv];
    
    console.log('📝 [LLM] Generating translation sentence', {
      timestamp: new Date().toISOString(),
      provider: currentProvider,
      level,
      topic,
      hasAPIKey: !!API_KEY,
      apiKeyPrefix: API_KEY ? API_KEY.substring(0, 7) + '...' : 'none',
      targetVocab: targetVocab ? `${targetVocab.german}/${targetVocab.english}` : 'none'
    });
    
    if (!API_KEY) {
      console.warn(`⚠️ [LLM] No API key found for ${providerConfig.name}, returning fallback`);
      return res.json({
        source: 'fallback',
        de: 'Ich gehe heute Abend mit meinen Freunden ins Kino.',
        en: 'I am going to the cinema with my friends this evening.',
        targetVocab: targetVocab || null,
        message: `No ${providerConfig.name} API key available - using fallback sentence`
      });
    }
    
    // Build system prompt
    const systemPrompt = `Du bist ein erfahrener Englischlehrer. Generiere einen deutschen Satz zum Übersetzen ins Englische.
Niveau: ${level}
Thema: ${topic}
${targetVocab ? `
ZIEL-VOKABEL:
- Deutsches Wort: '${targetVocab.german}'
- Englisches Wort: '${targetVocab.english}'
` : ''}

KRITISCH - NUR DEUTSCHE WÖRTER IM DEUTSCHEN SATZ:
Der deutsche Satz darf AUSSCHLIESSLICH deutsche Wörter enthalten!
NIEMALS englische Wörter wie '${targetVocab?.english || 'sedulous, demur, etc.'}' im deutschen Satz verwenden!
${targetVocab ? `Der deutsche Satz MUSS das DEUTSCHE Wort '${targetVocab.german}' enthalten, NICHT das englische Wort '${targetVocab.english}'!` : ''}

${targetVocab ? `EXAKTE DEUTSCHE WÖRTER VERWENDEN:
Wenn '${targetVocab.german}' mehrere Bedeutungen enthält (z.B. 'zurückhaltend, bescheiden, respektvoll'), dann:
1. Wähle EXAKT EINES dieser deutschen Wörter für den deutschen Satz
2. Verwende KEINE Synonyme oder ähnlichen Wörter
3. Der deutsche Satz = deutsches Wort, die englische Übersetzung = englisches Wort '${targetVocab.english}'

FALSCH: 'Sie war stets sedulous' (englisches Wort im deutschen Satz!)
RICHTIG: 'Sie war stets fleißig' (deutsches Wort im deutschen Satz!)` : ''}

Antworte im JSON-Format: {"de": "deutscher Satz", "en": "englische Übersetzung"}`;

    const userPrompt = targetVocab
      ? `Erstelle einen deutschen Satz auf ${level}-Niveau mit dem DEUTSCHEN Wort '${targetVocab.german}' (NICHT mit dem englischen Wort '${targetVocab.english}')! Die englische Übersetzung soll dann '${targetVocab.english}' enthalten. Der deutsche Satz muss zu 100% auf DEUTSCH sein!`
      : `Erstelle einen Satz auf ${level}-Niveau zum Thema "${topic}". Der Satz muss zu 100% auf DEUTSCH sein!`;

    console.log(`🔄 [LLM] Sending request to ${providerConfig.name} API...`);
    
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
            content: userPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 150,
        ...noThinkingParams()
      })
    });
    
    console.log(`📊 [LLM] ${providerConfig.name} Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [LLM] ${providerConfig.name} API Error ${response.status}:`, {
        status: response.status,
        responseText: errorText.substring(0, 500),
        endpoint: providerConfig.endpoint,
        model: providerConfig.model
      });
      
      // Return fallback on API error
      return res.json({
        source: 'fallback',
        de: 'Ich gehe heute Abend mit meinen Freunden ins Kino.',
        en: 'I am going to the cinema with my friends this evening.',
        targetVocab: targetVocab || null,
        message: `${providerConfig.name} API error (${response.status}) - using fallback sentence`,
        error: response.status
      });
    }
    
    const data = await response.json();
    console.log(`✅ [LLM] ${providerConfig.name} response received successfully`);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`❌ [LLM] Invalid response structure from ${providerConfig.name}`);
      throw new Error('Invalid API response structure');
    }
    
    let content = data.choices[0].message.content;
    console.log('📝 [LLM] API Response content (first 200 chars):', content.substring(0, 200));
    
    // Remove markdown code blocks if present (```json ... ```)
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    try {
      const parsed = JSON.parse(content);
      const germanSentence = parsed.de || parsed.german || 'Error';
      const englishSentence = parsed.en || parsed.english || 'Error';
      
      console.log(`✨ [LLM] Successfully generated sentence via ${providerConfig.name}:`, {
        german: germanSentence,
        english: englishSentence,
        hasTargetVocab: !!targetVocab
      });
      
      // VALIDIERUNG: Prüfe ob englische Vokabeln im deutschen Satz sind
      if (targetVocab) {
        const englishWords = targetVocab.english.toLowerCase().split(',').map(w => w.trim());
        const germanLower = germanSentence.toLowerCase();
        
        console.log('🔍 [LLM] Validating german sentence:', {
          germanSentence,
          targetEnglishWords: englishWords
        });
        
        // Prüfe ob eines der englischen Wörter im deutschen Satz vorkommt
        const foundEnglishWord = englishWords.find(word => {
          // Entferne "to " am Anfang
          const cleanWord = word.replace(/^to\s+/, '');
          // Prüfe ob das Wort als ganzes Wort vorkommt
          const wordPattern = new RegExp(`\\b${cleanWord}\\w*\\b`, 'i');
          return wordPattern.test(germanLower);
        });
        
        if (foundEnglishWord) {
          console.warn(`⚠️ [LLM] VALIDATION FAILED: English word '${foundEnglishWord}' found in German sentence!`);
          console.log('🔄 [LLM] Retrying with stronger instruction...');
          
          try {
            // RETRY mit stärkerer Anweisung
            const retryResponse = await fetch(providerConfig.endpoint, {
              method: 'POST',
              headers: providerConfig.getHeaders(API_KEY),
              body: JSON.stringify({
                model: providerConfig.model,
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt + `\n\n🚨 KRITISCH: Der vorherige Versuch war FALSCH! Du hast das ENGLISCHE Wort '${foundEnglishWord}' im DEUTSCHEN Satz verwendet! Das ist VERBOTEN!`
                  },
                  {
                    role: 'user',
                    content: userPrompt + `\n\n🚨 ACHTUNG: Verwende NIEMALS das englische Wort '${targetVocab.english}' im deutschen Satz! Nur das DEUTSCHE Wort '${targetVocab.german}' verwenden!`
                  }
                ],
                temperature: 0.8,
                max_tokens: 150,
                ...noThinkingParams()
              })
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              let retryContent = retryData.choices[0].message.content;
              retryContent = retryContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
              
              const retryParsed = JSON.parse(retryContent);
              const retryGerman = retryParsed.de || retryParsed.german;
              const retryEnglish = retryParsed.en || retryParsed.english;
              
              console.log('✅ [LLM] Retry successful:', {
                german: retryGerman,
                english: retryEnglish
              });
              
              return res.json({
                source: 'llm',
                de: retryGerman,
                en: retryEnglish,
                targetVocab: targetVocab || null,
                provider: currentProvider,
                message: `Generated by ${providerConfig.name} (retry after validation)`
              });
            } else {
              console.warn(`⚠️ [LLM] Retry failed with status ${retryResponse.status}, using original sentence`);
            }
          } catch (retryError) {
            console.error('❌ [LLM] Retry failed:', {
              error: retryError.message,
              stack: retryError.stack
            });
            // Verwende den originalen Satz trotz englischem Wort
            console.log('📝 [LLM] Using original sentence despite validation failure');
          }
        }
      }
      
      return res.json({
        source: 'llm',
        de: germanSentence,
        en: englishSentence,
        targetVocab: targetVocab || null,
        provider: currentProvider,
        message: `Generated by ${providerConfig.name}`
      });
    } catch (parseError) {
      console.error(`❌ [LLM] JSON parsing failed:`, {
        error: parseError.message,
        content: content.substring(0, 300)
      });
      throw parseError;
    }
    
  } catch (error) {
    console.error(`❌ [LLM] Sentence generation failed:`, {
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    // Return fallback on any error
    res.json({
      source: 'fallback',
      de: 'Ich gehe heute Abend mit meinen Freunden ins Kino.',
      en: 'I am going to the cinema with my friends this evening.',
      targetVocab: null,
      message: `Error generating sentence - using fallback: ${error.message}`
    });
  }
});

/**
 * POST /api/llm/evaluate-translation
 * Evaluates a translation using the configured LLM
 */
router.post('/evaluate-translation', async (req, res) => {
  // Erste Log-Zeile - sollte IMMER erscheinen
  console.log('🔵 [LLM EVALUATE] === REQUEST RECEIVED ===', new Date().toISOString());

  let currentProvider = DEFAULT_PROVIDER;
  let providerConfig = LLM_PROVIDERS[DEFAULT_PROVIDER];
  let API_KEY = process.env[providerConfig.apiKeyEnv];
  
  try {
    const { germanSentence, userTranslation, correctTranslation = '', targetVocab = null, provider = null } = req.body;
    
    console.log('🔵 [LLM EVALUATE] Request body parsed:', {
      hasGerman: !!germanSentence,
      hasUser: !!userTranslation,
      hasCorrect: !!correctTranslation,
      hasTargetVocab: !!targetVocab,
      provider: provider || 'not specified'
    });
    
    currentProvider = resolveProvider(provider || process.env.LLM_PROVIDER || DEFAULT_PROVIDER);
    providerConfig = LLM_PROVIDERS[currentProvider];
    API_KEY = process.env[providerConfig.apiKeyEnv];
    
    if (!API_KEY) {
      console.warn(`⚠️ [LLM] No API key for provider '${currentProvider}'`);
    }
    
    console.log('📊 [LLM] Evaluating translation', {
      timestamp: new Date().toISOString(),
      provider: currentProvider,
      model: providerConfig.model,
      hasAPIKey: !!API_KEY,
      apiKeyPrefix: API_KEY ? API_KEY.substring(0, 7) + '...' : 'none',
      germanSentence: germanSentence.substring(0, 50) + '...',
      translationLength: userTranslation.length,
      correctTranslationLength: correctTranslation?.length || 0,
      hasTargetVocab: !!targetVocab,
      targetVocabInfo: targetVocab ? `${targetVocab.german} → ${targetVocab.english}` : 'none'
    });
    
    if (!API_KEY) {
      const availableProviders = Object.entries(LLM_PROVIDERS)
        .filter(([_, config]) => !!process.env[config.apiKeyEnv])
        .map(([key, _]) => key);
      
      console.warn(`⚠️ [LLM] No API key available for any provider`, {
        requestedProvider: provider || 'not specified',
        attemptedProvider: currentProvider,
        envVarName: providerConfig.apiKeyEnv,
        availableProviders: availableProviders.length > 0 ? availableProviders : 'none',
        allEnvAPIKeys: Object.keys(process.env).filter(k => k.includes('API_KEY'))
      });
      console.log('🔵 [LLM EVALUATE] Returning fallback response - no API keys available');
      return res.json({
        source: 'fallback',
        score: 7,
        feedback: 'Gute Übersetzung! (Fallback-Bewertung - kein API-Key verfügbar)',
        improvements: [],
        message: `No API key available for provider: ${currentProvider}`
      });
    }
    
    console.log(`🔄 [LLM] Requesting evaluation from ${providerConfig.name} API (final provider: ${currentProvider})...`);
    
    // Erstelle zusätzliche Instruktion wenn Zielwort vorhanden
    const targetVocabInstruction = targetVocab 
      ? `\n\nWICHTIG - ZIEL-VOKABEL:
Der Schüler SOLLTE das Wort "${targetVocab.english}" (deutsch: ${targetVocab.german}) verwenden.

✅ AKZEPTIERE ALLE WORTFORMEN:
- Einzahl/Mehrzahl: "student" = "students" ✓
- Zeitformen: "go" = "goes", "went", "going", "gone" ✓
- Steigerungsformen: "big" = "bigger", "biggest" ✓
- Synonyme (wenn mehrere angegeben): "extol, praise" → beide ✓

⚠️ Falls der Schüler IRGENDEINE FORM des Zielworts korrekt verwendet hat:
- Kritisiere es NICHT
- Schlage KEINE Alternativen vor
- Erwähne es POSITIV im Feedback
- Gib mindestens 8/10 Punkte (bei korrekter Grammatik)

Die Musterlösung verwendet ebenfalls dieses Wort - das ist beabsichtigt!`
      : '';
    
    // Bereite Request-Body vor
    const requestBody = {
      model: providerConfig.model,
      messages: [
        {
          role: 'system',
          content: `Du bist ein freundlicher Englischlehrer. Bewerte die Übersetzung des SCHÜLERS.

WICHTIG: Bewerte NUR die Übersetzung des Schülers, NICHT die Musterlösung!
Die Musterlösung dient nur als Vergleich.${targetVocabInstruction}

Antworte im JSON-Format: {"score": 1-10, "feedback": "text", "improvements": []}`
        },
        {
          role: 'user',
          content: `Deutscher Satz: "${germanSentence}"

ÜBERSETZUNG DES SCHÜLERS (zu bewerten): "${userTranslation}"

Musterlösung (nur als Referenz): "${correctTranslation}"${targetVocab ? `\n\nZiel-Vokabel: ${targetVocab.english} (${targetVocab.german})` : ''}

Bitte bewerte NUR die ÜBERSETZUNG DES SCHÜLERS (nicht die Musterlösung). Vergleiche sie mit der Musterlösung und dem deutschen Original.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
      ...noThinkingParams()
    };

    const requestHeaders = providerConfig.getHeaders(API_KEY);
    
    console.log(`📤 [LLM] Sending request to ${currentProvider}:`, {
      endpoint: providerConfig.endpoint,
      model: providerConfig.model,
      headers: Object.keys(requestHeaders),
      bodySize: JSON.stringify(requestBody).length,
      messagesCount: requestBody.messages.length
    });

    let response;
    try {
      response = await fetch(providerConfig.endpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });
    } catch (fetchError) {
      console.error(`❌ [LLM] Fetch error for ${currentProvider}:`, {
        error: fetchError.message,
        errorType: fetchError.constructor.name,
        endpoint: providerConfig.endpoint
      });
      throw fetchError;
    }
    
    console.log(`📊 [LLM] Response received from ${currentProvider}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      },
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [LLM] ${currentProvider} API returned error:`, {
        status: response.status,
        statusText: response.statusText,
        provider: currentProvider,
        model: providerConfig.model,
        endpoint: providerConfig.endpoint,
        errorPreview: errorText.substring(0, 300),
        fullError: errorText,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      return res.json({
        source: 'fallback',
        score: 7,
        feedback: `Gute Übersetzung! (Fallback - ${currentProvider} API Fehler ${response.status})`,
        improvements: [],
        message: `${currentProvider} API error (${response.status}): ${errorText.substring(0, 100)}`
      });
    }
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const responseText = await response.text();
      console.error(`❌ [LLM] Failed to parse JSON from ${currentProvider}:`, {
        error: jsonError.message,
        responsePreview: responseText.substring(0, 500)
      });
      throw new Error(`JSON parse error from ${currentProvider}: ${jsonError.message}`);
    }
    
    console.log(`📥 [LLM] Parsed response from ${currentProvider}:`, {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      contentLength: data.choices?.[0]?.message?.content?.length
    });
    
    const content = data.choices[0].message.content;
    
    console.log(`✨ [LLM] Evaluation completed via ${providerConfig.name}`, {
      contentLength: content.length,
      contentPreview: content.substring(0, 100)
    });
    
    // Remove markdown code blocks if present (e.g. ```json ... ```)
    // Mistral adds code blocks around JSON responses
    const cleanedContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error(`❌ [LLM] Failed to parse content as JSON from ${currentProvider}:`, {
        error: parseError.message,
        rawContent: content.substring(0, 500),
        cleanedContent: cleanedContent.substring(0, 500)
      });
      throw new Error(`Content JSON parse error from ${currentProvider}: ${parseError.message}`);
    }
    
    const normalizedEvaluation = normalizeEvaluationResult(parsed);

    console.log('🔵 [LLM EVALUATE] Sending successful response to frontend:', {
      provider: currentProvider,
      score: normalizedEvaluation.score,
      feedbackLength: normalizedEvaluation.feedback?.length
    });
    
    return res.json({
      source: 'llm',
      ...normalizedEvaluation,
      provider: currentProvider,
      message: `Evaluated by ${providerConfig.name}`
    });
    
  } catch (error) {
    console.error(`❌ [LLM] Evaluation error:`, {
      error: error.message,
      errorStack: error.stack,
      provider: currentProvider,
      endpoint: providerConfig.endpoint,
      hasApiKey: !!API_KEY,
      timestamp: new Date().toISOString()
    });
    
    console.log('🔵 [LLM EVALUATE] Sending fallback error response');
    
    res.json({
      source: 'fallback',
      score: 7,
      feedback: 'Gute Übersetzung! (Fallback-Bewertung)',
      improvements: [],
      message: `Error during evaluation: ${error.message}`
    });
  }
});

/**
 * Hilfstexte für Fallbacks (Dialog), wenn kein API-Key verfügbar ist.
 */
function dialogFallbackScenario(level = 'B2', topic = 'Alltag') {
  return {
    studentRole: 'Du bist mit einem Freund unterwegs',
    partnerRole: 'Ich bin dein Freund',
    description: `Ihr unterhaltet euch über "${topic}".`,
    firstMessage: 'Hey! Nice to see you. How have you been lately?'
  };
}

function dialogFallbackResponse() {
  const responses = [
    "That's interesting. Could you tell me more about that?",
    'I see. What do you think about this?',
    'Thank you for sharing. How does that make you feel?',
    'Interesting perspective. What else can you tell me?'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
}

/**
 * POST /api/llm/dialog/scenario
 * Generiert ein Dialog-Szenario mit dem konfigurierten LLM.
 */
router.post('/dialog/scenario', async (req, res) => {
  const { level = 'B2', topic = 'Alltag', provider = null } = req.body;

  const currentProvider = resolveProvider(provider || process.env.LLM_PROVIDER || DEFAULT_PROVIDER);
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = process.env[providerConfig.apiKeyEnv];

  console.log('🗣️ [LLM DIALOG] Generating scenario', { provider: currentProvider, level, topic, hasAPIKey: !!API_KEY });

  if (!API_KEY) {
    return res.json({
      source: 'fallback',
      ...dialogFallbackScenario(level, topic),
      message: `No API key available - using fallback scenario`
    });
  }

  const levelInstructions = {
    B2: 'Create an engaging conversation scenario. Mix positive situations (making plans, sharing experiences, asking for advice) with occasional challenges. Keep it natural and enjoyable - not every conversation needs conflict.',
    C1: 'Create an interesting conversation with depth. Include scenarios like discussing ideas, sharing opinions, planning projects, or exploring topics. Make it intellectually stimulating but not necessarily confrontational.',
    C2: 'Create a sophisticated conversation on complex topics, professional discussions, or nuanced subjects. Focus on depth and complexity rather than conflict.'
  };

  const systemPrompt = `You are an English teacher creating VARIED and ENGAGING conversation scenarios for German learners.

${levelInstructions[level] || levelInstructions.B2}

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

KEY PRINCIPLE: Always speak from YOUR partnerRole perspective, not from the student's!

VARY THE TONE: friendly, enthusiastic, curious, helpful, professional, casual - not always confrontational!

Respond in JSON format:
{
  "studentRole": "Rolle des Studenten auf Deutsch",
  "partnerRole": "Rolle des Gesprächspartners auf Deutsch",
  "description": "Kurze Szenariobeschreibung auf Deutsch",
  "firstMessage": "Your engaging opening as the CONVERSATION PARTNER in ENGLISH"
}`;

  try {
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Create an engaging conversation scenario at ${level} level about "${topic}". Make it interesting and varied - it doesn't need to be a conflict or complaint. Positive and collaborative scenarios are encouraged!`
          }
        ],
        temperature: 0.9,
        max_tokens: 250,
        ...noThinkingParams()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [LLM DIALOG] Scenario API error ${response.status}:`, errorText.substring(0, 300));
      return res.json({
        source: 'fallback',
        ...dialogFallbackScenario(level, topic),
        message: `API error (${response.status}) - using fallback scenario`
      });
    }

    const data = await response.json();
    const content = stripCodeFences(data.choices?.[0]?.message?.content);
    const parsed = JSON.parse(content);

    return res.json({
      source: 'llm',
      studentRole: parsed.studentRole || parsed.role || '',
      partnerRole: parsed.partnerRole || '',
      description: parsed.description || '',
      firstMessage: parsed.firstMessage || parsed.situation || '',
      provider: currentProvider,
      message: `Generated by ${providerConfig.name}`
    });
  } catch (error) {
    console.error('❌ [LLM DIALOG] Scenario generation failed:', error.message);
    return res.json({
      source: 'fallback',
      ...dialogFallbackScenario(level, topic),
      message: `Error generating scenario: ${error.message}`
    });
  }
});

/**
 * POST /api/llm/dialog/response
 * Generiert eine Dialog-Antwort auf Basis der Gesprächshistorie.
 */
router.post('/dialog/response', async (req, res) => {
  const { scenario = {}, conversationHistory = [], level = 'B2', provider = null } = req.body;

  const currentProvider = resolveProvider(provider || process.env.LLM_PROVIDER || DEFAULT_PROVIDER);
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = process.env[providerConfig.apiKeyEnv];

  console.log('🗣️ [LLM DIALOG] Generating response', {
    provider: currentProvider,
    level,
    hasAPIKey: !!API_KEY,
    conversationLength: conversationHistory.length
  });

  if (!API_KEY) {
    return res.json({
      source: 'fallback',
      response: dialogFallbackResponse(),
      message: 'No API key available - using fallback response'
    });
  }

  const systemPrompt = `You are a conversation partner in this scenario: ${scenario.description || ''}

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

Your goal: Have a natural, engaging conversation that helps the student practice English in a realistic way - not every conversation needs to be a battle!`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
  ];

  try {
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify({
        model: providerConfig.model,
        messages,
        temperature: 0.8,
        max_tokens: 150,
        ...noThinkingParams()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [LLM DIALOG] Response API error ${response.status}:`, errorText.substring(0, 300));
      return res.json({
        source: 'fallback',
        response: dialogFallbackResponse(),
        message: `API error (${response.status}) - using fallback response`
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.json({
        source: 'fallback',
        response: dialogFallbackResponse(),
        message: 'Empty API response - using fallback response'
      });
    }

    return res.json({
      source: 'llm',
      response: content,
      provider: currentProvider,
      message: `Generated by ${providerConfig.name}`
    });
  } catch (error) {
    console.error('❌ [LLM DIALOG] Response generation failed:', error.message);
    return res.json({
      source: 'fallback',
      response: dialogFallbackResponse(),
      message: `Error generating response: ${error.message}`
    });
  }
});

/**
 * POST /api/llm/dialog/evaluate
 * Bewertet die Dialog-Performance des Schülers.
 */
router.post('/dialog/evaluate', async (req, res) => {
  const { scenario = {}, conversationHistory = [], level = 'B2', provider = null } = req.body;

  const currentProvider = resolveProvider(provider || process.env.LLM_PROVIDER || DEFAULT_PROVIDER);
  const providerConfig = LLM_PROVIDERS[currentProvider];
  const API_KEY = process.env[providerConfig.apiKeyEnv];

  console.log('🗣️ [LLM DIALOG] Evaluating performance', {
    provider: currentProvider,
    level,
    hasAPIKey: !!API_KEY,
    conversationLength: conversationHistory.length
  });

  const fallbackEvaluation = () => {
    const userMessages = conversationHistory.filter((m) => m.role === 'user');
    const messageCount = userMessages.length;
    const avgLength =
      userMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / (messageCount || 1);
    const lengthScore = Math.min(10, Math.max(5, Math.round(avgLength / 15)));
    const participationScore = Math.min(10, Math.max(5, messageCount));
    const baseScore = Math.round((lengthScore + participationScore) / 2);
    return {
      grammar: baseScore,
      vocabulary: baseScore,
      fluency: baseScore,
      appropriateness: baseScore,
      contextResponse: baseScore,
      overallScore: baseScore,
      languageLevel: level,
      detailedFeedback: 'Gute sprachliche Leistung im Dialog.',
      errors: [],
      strengths: ['Aktive Teilnahme am Dialog', 'Angemessene Reaktionen auf die Situation'],
      improvements: ['Verwende vollständigere Sätze', 'Nutze mehr Variationen in deinen Formulierungen'],
      tips: ['Stelle offene Fragen', "Nutze Phrasen wie 'Could you...' oder 'Would you mind...'"]
    };
  };

  if (!API_KEY) {
    return res.json({ source: 'fallback', ...fallbackEvaluation(), message: 'No API key available' });
  }

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
    { "original": "...", "correction": "...", "explanation": "..." }
  ],
  "strengths": ["..."],
  "improvements": ["..."],
  "tips": ["..."]
}`;

  const userContent = `Szenario: ${scenario.description}\nZielsprache: ${level}\n\nGespräch:\n${conversationHistory
    .map((m) => `${m.role === 'user' ? 'SCHÜLER' : 'PARTNER'}: ${m.content}`)
    .join('\n')}\n\nBewerte nur die Schüler-Nachrichten auf Sprachkenntnisse.`;

  try {
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.3,
        max_tokens: 500,
        ...noThinkingParams()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [LLM DIALOG] Evaluate API error ${response.status}:`, errorText.substring(0, 300));
      return res.json({ source: 'fallback', ...fallbackEvaluation(), message: `API error (${response.status})` });
    }

    const data = await response.json();
    const content = stripCodeFences(data.choices?.[0]?.message?.content);
    const evaluation = JSON.parse(content);

    const result = {
      grammar: evaluation.grammar || 5,
      vocabulary: evaluation.vocabulary || 5,
      fluency: evaluation.fluency || 5,
      appropriateness: evaluation.appropriateness || 5,
      contextResponse: evaluation.contextResponse || 5,
      overallScore:
        evaluation.overallScore ||
        Math.round(
          (evaluation.grammar +
            evaluation.vocabulary +
            evaluation.fluency +
            evaluation.appropriateness +
            evaluation.contextResponse) /
            5
        ),
      languageLevel: evaluation.languageLevel || level,
      detailedFeedback: evaluation.detailedFeedback || 'Gute sprachliche Leistung im Dialog.',
      errors: evaluation.errors || [],
      strengths: evaluation.strengths || [],
      improvements: evaluation.improvements || [],
      tips: evaluation.tips || []
    };

    return res.json({ source: 'llm', ...result, provider: currentProvider, message: `Evaluated by ${providerConfig.name}` });
  } catch (error) {
    console.error('❌ [LLM DIALOG] Evaluation failed:', error.message);
    return res.json({ source: 'fallback', ...fallbackEvaluation(), message: `Error evaluating dialog: ${error.message}` });
  }
});

export default router;
