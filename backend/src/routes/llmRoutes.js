import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// LLM Provider Configuration
const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    apiKeyEnv: 'OPENAI_API_KEY',
    model: 'gpt-3.5-turbo',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    getHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  },
  mistral: {
    name: 'Mistral Large',
    apiKeyEnv: 'MISTRAL_API_KEY',
    model: 'mistral-large-latest',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    getHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    })
  }
};

/**
 * GET /api/llm/provider
 * Returns the current LLM provider
 */
router.get('/provider', (req, res) => {
  const provider = process.env.LLM_PROVIDER || 'openai';
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
    const currentProvider = provider || process.env.LLM_PROVIDER || 'openai';
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
      console.log(`✨ [LLM] Successfully generated sentence via ${providerConfig.name}:`, {
        german: parsed.de || parsed.german,
        english: parsed.en || parsed.english,
        hasTargetVocab: !!targetVocab
      });
      
      return res.json({
        source: 'llm',
        de: parsed.de || parsed.german || 'Error',
        en: parsed.en || parsed.english || 'Error',
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
  
  try {
    const { germanSentence, userTranslation, correctTranslation = '', targetVocab = null, provider = null } = req.body;
    
    console.log('🔵 [LLM EVALUATE] Request body parsed:', {
      hasGerman: !!germanSentence,
      hasUser: !!userTranslation,
      hasCorrect: !!correctTranslation,
      hasTargetVocab: !!targetVocab,
      provider: provider || 'not specified'
    });
    
    let currentProvider = provider || process.env.LLM_PROVIDER || 'openai';
    let providerConfig = LLM_PROVIDERS[currentProvider];
    let API_KEY = process.env[providerConfig.apiKeyEnv];
    
    // Automatischer Fallback: Wenn der gewählte Provider keinen API-Key hat, versuche andere
    if (!API_KEY) {
      console.warn(`⚠️ [LLM] No API key for requested provider '${currentProvider}', checking alternatives...`);
      
      // Versuche alle Provider
      for (const [providerKey, config] of Object.entries(LLM_PROVIDERS)) {
        const alternativeKey = process.env[config.apiKeyEnv];
        if (alternativeKey) {
          console.log(`✅ [LLM] Found API key for alternative provider '${providerKey}', using it instead`);
          currentProvider = providerKey;
          providerConfig = config;
          API_KEY = alternativeKey;
          break;
        }
      }
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
        message: `No API keys available. Requested: ${provider || 'default'}, Checked: ${Object.keys(LLM_PROVIDERS).join(', ')}`
      });
    }
    
    console.log(`🔄 [LLM] Requesting evaluation from ${providerConfig.name} API (final provider: ${currentProvider})...`);
    
    // Erstelle zusätzliche Instruktion wenn Zielwort vorhanden
    const targetVocabInstruction = targetVocab 
      ? `\n\nWICHTIG: Der Schüler sollte das Wort "${targetVocab.english}" (${targetVocab.german}) verwenden. 
Falls der Schüler dieses Wort korrekt verwendet hat, kritisiere es NICHT und schlage KEINE Alternativen vor.
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
    
    console.log('🔵 [LLM EVALUATE] Sending successful response to frontend:', {
      provider: currentProvider,
      score: parsed.score,
      feedbackLength: parsed.feedback?.length
    });
    
    return res.json({
      source: 'llm',
      ...parsed,
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
