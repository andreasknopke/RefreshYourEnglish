/**
 * Lädt und parst die Vokabeldatei
 * Format: Englisch ; Deutsch
 */

let cachedVocabulary = null;

export async function loadVocabulary() {
  // Wenn bereits geladen, gib Cache zurück
  if (cachedVocabulary) {
    return cachedVocabulary;
  }

  try {
    const response = await fetch('/vocabulary.txt', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });
    if (!response.ok) {
      throw new Error('Vokabeldatei konnte nicht geladen werden');
    }
    
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    const vocabulary = lines.map((line, index) => {
      const parts = line.split(';').map(part => part.trim());
      
      if (parts.length >= 2) {
        return {
          id: index + 1,
          en: parts[0],
          de: parts[1]
        };
      }
      return null;
    }).filter(item => item !== null);
    
    cachedVocabulary = vocabulary;
    console.log(`✅ ${vocabulary.length} Vokabeln erfolgreich geladen`);
    return vocabulary;
    
  } catch (error) {
    console.error('Fehler beim Laden der Vokabeln:', error);
    // Fallback auf Standard-Vokabeln
    return getDefaultVocabulary();
  }
}

/**
 * Gibt zufällige Vokabeln zurück
 */
export function getRandomVocabulary(count = 1, vocabulary = null) {
  const vocab = vocabulary || cachedVocabulary || getDefaultVocabulary();
  const shuffled = [...vocab].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Fallback Vokabeln falls die Datei nicht geladen werden kann
 */
function getDefaultVocabulary() {
  return [
    { id: 1, en: 'house', de: 'Haus' },
    { id: 2, en: 'car', de: 'Auto' },
    { id: 3, en: 'tree', de: 'Baum' },
    { id: 4, en: 'book', de: 'Buch' },
    { id: 5, en: 'water', de: 'Wasser' },
    { id: 6, en: 'sun', de: 'Sonne' },
    { id: 7, en: 'moon', de: 'Mond' },
    { id: 8, en: 'table', de: 'Tisch' },
    { id: 9, en: 'chair', de: 'Stuhl' },
    { id: 10, en: 'window', de: 'Fenster' },
    { id: 11, en: 'door', de: 'Tür' },
    { id: 12, en: 'flower', de: 'Blume' },
    { id: 13, en: 'cat', de: 'Katze' },
    { id: 14, en: 'dog', de: 'Hund' },
    { id: 15, en: 'bird', de: 'Vogel' },
  ];
}

/**
 * Setzt den Cache zurück (z.B. nach Datei-Update)
 */
export function resetVocabularyCache() {
  cachedVocabulary = null;
}
