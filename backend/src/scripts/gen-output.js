// Erstellt content/packs/it/output/prompts.json – 150 Output-Prompts
// (Schreiben ~90, Sprechen ~60) über A1/A2/B1 und Themen. Die Aufgaben-
// Anweisungen stehen auf Deutsch (prompt_de) für deutschsprachige Lernende;
// sie fordern italienische Produktion.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../../content/packs/it/output/prompts.json');

// Aufgaben-Muster je Level & Art. {t} wird durch das Thema ersetzt.
const WRITING = {
  A1: [
    'Beschreibe {t} in 3–4 einfachen Sätzen.',
    'Schreibe 4 Sätze über {t}. Benutze „sono“ oder „ho“.',
    'Was gibt es bei {t}? Schreibe 3–4 Sätze auf Italienisch.',
    'Beschreibe {t} mit einfachen Adjektiven (bello, grande, buono …).',
    'Schreibe einen kurzen Text (3–4 Sätze) über {t}.'
  ],
  A2: [
    'Erzähle, was du gestern bezüglich {t} gemacht hast (passato prossimo).',
    'Beschreibe {t} und begründe kurz, warum es dir wichtig ist.',
    'Schreibe 5–6 Sätze über {t}. Benutze mindestens ein Pronomen (lo, la, mi …).',
    'Berichte über ein Erlebnis mit {t} (passato prossimo + imperfetto).',
    'Vergleiche zwei Aspekte von {t} in 5 Sätzen.'
  ],
  B1: [
    'Argumentiere in 6–8 Sätzen für oder gegen {t}. Benutze „secondo me“ und „penso che“.',
    'Diskutiere Vor- und Nachteile von {t} (Konditional + Konjunktiv).',
    'Schreibe einen kurzen Meinungsbeitrag (6–8 Sätze) über {t}.',
    'Beschreibe, wie sich {t} in den letzten Jahren verändert hat, und begründe.',
    'Schreibe einen formellen Brief/Betreff zum Thema {t}.'
  ]
};

const SPEAKING = {
  A1: [
    'Spiele nach: Stelle dich vor und erwähne {t}.',
    'Sprich 3 Sätze über {t}. Sprich langsam und deutlich.',
    'Bestelle/beschreibe {t} laut in einfachen Sätzen.',
    'Beschreibe {t} laut mit Zahlen und Farben.',
    'Stelle 3 Fragen zu {t} laut.'
  ],
  A2: [
    'Erzähle laut eine kurze Geschichte über {t} (Vergangenheit).',
    'Spiele ein Gespräch über {t} mit einem Partner nach.',
    'Beschreibe {t} laut und begründe deine Vorliebe.',
    'Spiele eine Bestellung/anfrage zum Thema {t} laut nach.',
    'Beschreibe laut ein Bild zu {t} in 5 Sätzen.'
  ],
  B1: [
    'Halte ein 1-Minuten-Statement über {t} und begründe deine Meinung.',
    'Spiele eine Diskussion über {t} nach (stimme zu / widersprich).',
    'Argumentiere laut für eine Position zu {t}.',
    'Beschreibe laut ein Problem mit {t} und schlage eine Lösung vor.',
    'Fasse laut die wichtigsten Punkte zu {t} zusammen.'
  ]
};

const TOPICS = [
  { key: 'alltag', label: 'deinen Alltag' },
  { key: 'familie', label: 'deine Familie' },
  { key: 'reisen', label: 'eine Reise' },
  { key: 'essen', label: 'italienisches Essen' },
  { key: 'arbeit', label: 'deine Arbeit' },
  { key: 'hobby', label: 'deine Hobbys' },
  { key: 'stadt', label: 'deine Stadt' },
  { key: 'wetter', label: 'das Wetter' },
  { key: 'gesundheit', label: 'Gesundheit und Fitness' },
  { key: 'bildung', label: 'Lernen und Schule' }
];

const prompts = [];
let n = 0;

function add(level, kind, topicKey, topicLabel, template) {
  n += 1;
  prompts.push({
    id: `${level.toLowerCase()}-${kind}-${String(n).padStart(3, '0')}-${topicKey}`,
    level,
    kind,
    topic: topicKey,
    prompt_de: template.replace('{t}', topicLabel),
    target: null
  });
}

// Ausgewogene Verteilung: pro Level & Art alle Themen x mehrere Muster
for (const level of ['A1', 'A2', 'B1']) {
  for (const topic of TOPICS) {
    // Schreiben: 3 Muster pro Thema/Level -> 3*10*3 = 90
    const wTemplates = WRITING[level];
    for (let i = 0; i < 3; i++) {
      add(level, 'writing', topic.key, topic.label, wTemplates[i % wTemplates.length]);
    }
    // Sprechen: 2 Muster pro Thema/Level -> 2*10*3 = 60
    const sTemplates = SPEAKING[level];
    for (let i = 0; i < 2; i++) {
      add(level, 'speaking', topic.key, topic.label, sTemplates[i % sTemplates.length]);
    }
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ lang: 'it', version: '1.0.0', prompts }, null, 2), 'utf-8');
const w = prompts.filter((p) => p.kind === 'writing').length;
const s = prompts.filter((p) => p.kind === 'speaking').length;
console.log(`✅ ${prompts.length} Output-Prompts (Schreiben ${w}, Sprechen ${s}) -> ${OUT}`);
