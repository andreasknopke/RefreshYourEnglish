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
 * Returns the current LLM provider
 */
router.get('/provider', (req, res) => {
  const provider = resolveProvider(process.env.LLM_PROVIDER || DEFAULT_PROVIDER);
  const providerConfig = LLM_PROVIDERS[provider];
  const hasApiKey = !!process.env[providerConfig.apiKeyEnv];
  
  console.log(`📋 LLM Provider Info: ${provider} (API Key: ${hasApiKey ? '✅' : '❌'})`);
  
  res.json({
    provider,
    name: providerConfig.name,
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
        max_tokens: 150
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
                max_tokens: 150
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
      max_tokens: 300
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

export default router;
