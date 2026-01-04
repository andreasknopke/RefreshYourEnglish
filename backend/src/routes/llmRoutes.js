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
      'Authorization': `Bearer ${apiKey}`
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
    const systemPrompt = `Du bist ein erfahrener Englischlehrer. Generiere einen einzelnen deutschen Satz zum Übersetzen.
Niveau: ${level}
Thema: ${topic}
${targetVocab ? `Ziel-Vokabel: "${targetVocab.german}" → "${targetVocab.english}"` : ''}

Antworte im JSON-Format: {"de": "deutscher Satz", "en": "englische Übersetzung"}`;

    const userPrompt = targetVocab
      ? `Erstelle einen Satz auf ${level}-Niveau, der "${targetVocab.german}" enthält.`
      : `Erstelle einen Satz auf ${level}-Niveau zum Thema "${topic}".`;

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
  try {
    const { germanSentence, userTranslation, correctTranslation = '', provider = null } = req.body;
    
    const currentProvider = provider || process.env.LLM_PROVIDER || 'openai';
    const providerConfig = LLM_PROVIDERS[currentProvider];
    const API_KEY = process.env[providerConfig.apiKeyEnv];
    
    console.log('📊 [LLM] Evaluating translation', {
      timestamp: new Date().toISOString(),
      provider: currentProvider,
      hasAPIKey: !!API_KEY,
      translationLength: userTranslation.length
    });
    
    if (!API_KEY) {
      console.warn(`⚠️ [LLM] No API key for ${providerConfig.name}, using fallback evaluation`);
      return res.json({
        source: 'fallback',
        score: 7,
        feedback: 'Gute Übersetzung! (Fallback-Bewertung)',
        improvements: [],
        message: `No ${providerConfig.name} API key - using fallback`
      });
    }
    
    console.log(`🔄 [LLM] Requesting evaluation from ${providerConfig.name}...`);
    
    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(API_KEY),
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [
          {
            role: 'system',
            content: `Du bist ein freundlicher Englischlehrer. Bewerte diese Übersetzung.
Antworte im JSON-Format: {"score": 1-10, "feedback": "text", "improvements": []}`
          },
          {
            role: 'user',
            content: `Original: "${germanSentence}"\nÜbersetzung: "${userTranslation}"\nMusterlösung: "${correctTranslation}"\n\nBewerte die Übersetzung.`
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });
    
    console.log(`📊 [LLM] Evaluation response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [LLM] Evaluation failed with status ${response.status}:`, errorText.substring(0, 300));
      
      return res.json({
        source: 'fallback',
        score: 7,
        feedback: 'Gute Übersetzung! (Fallback-Bewertung)',
        improvements: [],
        message: `Evaluation API error (${response.status})`
      });
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log(`✨ [LLM] Evaluation completed via ${providerConfig.name}`);
    
    const parsed = JSON.parse(content);
    return res.json({
      source: 'llm',
      ...parsed,
      provider: currentProvider,
      message: `Evaluated by ${providerConfig.name}`
    });
    
  } catch (error) {
    console.error(`❌ [LLM] Evaluation error:`, {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
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
