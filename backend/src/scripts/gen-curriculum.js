// Erstellt content/packs/it/curriculum/units_a1_b1.json.
// ~30 Curriculum-Units (A1:12, A2:12, B1:6). Jede Unit verdrahtet konkreten
// Content zu Input (Lesen/Hören) · Fokus (Grammatik) · Output (Schreiben/
// Sprechen) · Check (Can-do). Referenzen sind Titel/IDs; der Session Composer
// löst sie auf und fällt auf level-passenden Content zurück, falls eine
// Referenz fehlt.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../../content/packs/it/curriculum/units_a1_b1.json');

// u(level, order, theme, goal, input, fokus, output, check)
function u(level, order, theme, goal, input, fokus, output, check) {
  return {
    id: `it-${level.toLowerCase()}-u${String(order).padStart(2, '0')}`,
    level,
    order,
    theme,
    goal,
    input, // { reading: [title], listening: [title] }
    fokus, // { grammar: [pointId], vocabLevel }
    output, // { writing: [promptId], speaking: [scenarioId] }
    check // { cando: [..] }
  };
}

const units = [
  // ---------------- A1 ----------------
  u('A1', 1, 'Begrüßung & Vorstellung', 'Sich begrüßen und mit Namen vorstellen',
    { reading: ['Il mio amico Marco'], listening: ['Saluti e presentazioni'] },
    { grammar: ['it-essere'], vocabLevel: 'A1' },
    { writing: ['a1-presentarsi'], speaking: ['presentarsi'] },
    { cando: ['Kann jemanden begrüßen', 'Kann meinen Namen nennen', 'Kann fragen, wie es jemandem geht'] }),

  u('A1', 2, 'Im Café', 'Getränke bestellen und bezahlen',
    { reading: ['Al bar'], listening: ['Al bar'] },
    { grammar: ['it-art-determinativi', 'it-art-indeterminativi'], vocabLevel: 'A1' },
    { writing: ['a1-bar-ordinare'], speaking: ['bar-kafe'] },
    { cando: ['Kann einen Kaffee bestellen', 'Kann nach dem Preis fragen', 'Kann höflich mit „per favore“ sprechen'] }),

  u('A1', 3, 'Familie', 'Familienmitglieder beschreiben',
    { reading: ['La mia famiglia'], listening: ['La mia famiglia'] },
    { grammar: ['it-possessivi', 'it-concordanza-agg'], vocabLevel: 'A1' },
    { writing: ['a1-famiglia'], speaking: ['presentarsi'] },
    { cando: ['Kann meine Familie vorstellen', 'Kann Alter und Beruf nennen', 'Kann Possessivartikel verwenden'] }),

  u('A1', 4, 'Zuhause', 'Räume und Gegenstände im Haus benennen',
    { reading: ['A casa'], listening: ['A casa'] },
    { grammar: ['it-plurale-nomi', 'it-preposizioni-semplici'], vocabLevel: 'A1' },
    { writing: ['a1-casa'], speaking: ['direzione-strada'] },
    { cando: ['Kann Räume benennen', 'Kann sagen, wo etwas ist', 'Kann den Plural bilden'] }),

  u('A1', 5, 'Einkaufen', 'Auf dem Markt Obst und Gemüse kaufen',
    { reading: ['Al mercato'], listening: ['Al mercato'] },
    { grammar: ['it-art-indeterminativi', 'it-plurale-nomi'], vocabLevel: 'A1' },
    { writing: ['a1-spesa'], speaking: ['fare-spesa'] },
    { cando: ['Kann Mengen nennen (un chilo di…)', 'Kann nach dem Preis fragen', 'Kann höflich kaufen'] }),

  u('A1', 6, 'Nach dem Weg fragen', 'Einen Weg erfragen und verstehen',
    { reading: ['In città'], listening: ['Chiedere indicazioni'] },
    { grammar: ['it-preposizioni-articolate'], vocabLevel: 'A1' },
    { writing: ['a1-citta'], speaking: ['direzione-strada'] },
    { cando: ['Kann fragen, wo etwas ist', 'Kann Richtungen verstehen', 'Kann Danke sagen'] }),

  u('A1', 7, 'Regelmäßige Verben', 'Über tägliche Routinen sprechen',
    { reading: ['La mia giornata'], listening: ['La mia giornata'] },
    { grammar: ['it-verbi-are', 'it-verbi-ere-ire'], vocabLevel: 'A1' },
    { writing: ['a1-giornata'], speaking: ['hobby-tempo-libero'] },
    { cando: ['Kann -are/-ere/-ire-Verben konjugieren', 'Kann meinen Tagesablauf beschreiben', 'Kann Uhrzeiten nennen'] }),

  u('A1', 8, 'Essen & Restaurant', 'Ein Gericht bestellen',
    { reading: ['Al ristorante'], listening: ['Al ristorante'] },
    { grammar: ['it-avere', 'it-art-determinativi'], vocabLevel: 'A1' },
    { writing: ['a1-cibo-preferito'], speaking: ['ristorante-prenotare'] },
    { cando: ['Kann ein Gericht bestellen', 'Kann Lieblingsessen nennen', 'Kann „vorrei“ verwenden'] }),

  u('A1', 9, 'Hobbys', 'Freizeitaktivitäten beschreiben',
    { reading: ['Il mio tempo libero'], listening: ['Hobby e tempo libero'] },
    { grammar: ['it-verbi-are', 'it-concordanza-agg'], vocabLevel: 'A1' },
    { writing: ['a1-hobby'], speaking: ['hobby-tempo-libero'] },
    { cando: ['Kann sagen, was ich gerne mache', 'Kann „mi piace“ verwenden', 'Kann Hobbys nennen'] }),

  u('A1', 10, 'Wetter & Jahreszeiten', 'Über das Wetter sprechen',
    { reading: ['Il tempo e le stagioni'], listening: ['Il meteo'] },
    { grammar: ['it-essere', 'it-avere'], vocabLevel: 'A1' },
    { writing: ['a1-meteo'], speaking: ['hobby-tempo-libero'] },
    { cando: ['Kann das Wetter beschreiben', 'Kann Jahreszeiten nennen', 'Kann einfache Sätze mit „fa/c’è“ bilden'] }),

  u('A1', 11, 'Zahlen & Einkaufen II', 'Preise, Mengen und Zahlen',
    { reading: ['Fare la spesa'], listening: ['Fare la spesa'] },
    { grammar: ['it-plurale-nomi', 'it-art-determinativi'], vocabLevel: 'A1' },
    { writing: ['a1-numeri-spesa'], speaking: ['fare-spesa'] },
    { cando: ['Kann Zahlen und Preise verstehen', 'Kann Mengen kaufen', 'Kann den Gesamtpreis erfragen'] }),

  u('A1', 12, 'A1-Wiederholung', 'Grundlagen festigen',
    { reading: ['A casa', 'Al bar'], listening: ['Riepilogo A1'] },
    { grammar: ['it-essere', 'it-avere', 'it-art-determinativi', 'it-verbi-are'], vocabLevel: 'A1' },
    { writing: ['a1-riepilogo'], speaking: ['presentarsi'] },
    { cando: ['Kann einfache Alltagssätze bilden', 'Kann Artikel und Grundverben anwenden', 'Kann mich vorstellen und bestellen'] }),

  // ---------------- A2 ----------------
  u('A2', 1, 'Vergangenheit: passato prossimo', 'Über vergangene Ereignisse berichten',
    { reading: ['Un viaggio in Italia'], listening: ['Ieri sera'] },
    { grammar: ['it-passato-avere'], vocabLevel: 'A2' },
    { writing: ['a2-ieri'], speaking: ['hobby-tempo-libero'] },
    { cando: ['Kann das passato prossimo mit avere bilden', 'Kann über gestern erzählen', 'Kann Partizipien bilden'] }),

  u('A2', 2, 'Vergangenheit: essere & Bewegung', 'Bewegung und Zustände in der Vergangenheit',
    { reading: ['Una gita'], listening: ['Una gita fuori porta'] },
    { grammar: ['it-passato-essere'], vocabLevel: 'A2' },
    { writing: ['a2-vacanza-passata'], speaking: ['viaggio-treno'] },
    { cando: ['Kann passato prossimo mit essere bilden', 'Kann Übereinstimmung im Partizip beachten', 'Kann eine Ausfahrt erzählen'] }),

  u('A2', 3, 'Imperfetto', 'Gewohnheiten und Hintergründe in der Vergangenheit',
    { reading: ['Quando ero bambino'], listening: ['Quando ero bambino'] },
    { grammar: ['it-imperfetto'], vocabLevel: 'A2' },
    { writing: ['a2-infanzia'], speaking: ['hobby-tempo-libero'] },
    { cando: ['Kann das imperfetto bilden', 'Kann frühere Gewohnheiten beschreiben', 'Kann Vergangenheit erzählen'] }),

  u('A2', 4, 'passato vs. imperfetto', 'Beide Vergangenheiten korrekt unterscheiden',
    { reading: ['Un giorno speciale'], listening: ['Un giorno speciale'] },
    { grammar: ['it-passato-vs-imperfetto'], vocabLevel: 'A2' },
    { writing: ['a2-storia-passato'], speaking: ['viaggio-treno'] },
    { cando: ['Kann passato prossimo und imperfetto unterscheiden', 'Kann eine kleine Geschichte erzählen', 'Kann Hintergrund vs. Handlung trennen'] }),

  u('A2', 5, 'Direkte Pronomen', 'Objekte durch Pronomen ersetzen',
    { reading: ['Lo shopping'], listening: ['Fare compere'] },
    { grammar: ['it-pronomi-diretti'], vocabLevel: 'A2' },
    { writing: ['a2-acquisti'], speaking: ['fare-spesa'] },
    { cando: ['Kann direkte Objektpronomen verwenden', 'Kann Sätze verkürzen', 'Kann Pronomen korrekt platzieren'] }),

  u('A2', 6, 'Indirekte Pronomen', 'Personen als indirekte Objekte',
    { reading: ['Una telefonata'], listening: ['Una telefonata'] },
    { grammar: ['it-pronomi-indiretti'], vocabLevel: 'A2' },
    { writing: ['a2-telefono'], speaking: ['medico'] },
    { cando: ['Kann indirekte Objektpronomen verwenden', 'Kann „mipiace“ bilden', 'Kann jemandem etwas sagen'] }),

  u('A2', 7, 'ci & ne', 'Mengenangaben und Ortsverweise',
    { reading: ['Dal fruttivendolo'], listening: ['Dal fruttivendolo'] },
    { grammar: ['it-ci-ne'], vocabLevel: 'A2' },
    { writing: ['a2-ne-ci'], speaking: ['fare-spesa'] },
    { cando: ['Kann „ne“ für Mengen nutzen', 'Kann „ci“ für Orte nutzen', 'Kann Sätze natürlich verkürzen'] }),

  u('A2', 8, 'Hotel & Reise', 'Im Hotel einchecken und reisen',
    { reading: ['In albergo'], listening: ['In albergo'] },
    { grammar: ['it-passato-essere', 'it-preposizioni-articolate'], vocabLevel: 'A2' },
    { writing: ['a2-albergo'], speaking: ['hotel-checkin'] },
    { cando: ['Kann ein Zimmer buchen', 'Kann Wünsche äußern', 'Kann Reiseerlebnisse erzählen'] }),

  u('A2', 9, 'Gesundheit', 'Beschwerden beschreiben',
    { reading: ['Dal medico'], listening: ['Dal medico'] },
    { grammar: ['it-avere', 'it-concordanza-agg'], vocabLevel: 'A2' },
    { writing: ['a2-salute'], speaking: ['medico'] },
    { cando: ['Kann Beschwerden nennen', 'Kann „ho male a…“ verwenden', 'Kann Ratschläge verstehen'] }),

  u('A2', 10, 'Konditional: Höflichkeit', 'Höflich bitten und wünschen',
    { reading: ['Una richiesta'], listening: ['Richieste gentili'] },
    { grammar: ['it-condizionale'], vocabLevel: 'A2' },
    { writing: ['a2-cortesia'], speaking: ['ristorante-prenotare'] },
    { cando: ['Kann „vorrei“ verwenden', 'Kann höflich bitten', 'Kann Wünsche äußern'] }),

  u('A2', 11, 'Meinung & Vorlieben', 'Vorlieben begründen',
    { reading: ['Le mie preferenze'], listening: ['Cosa preferisci?'] },
    { grammar: ['it-condizionale', 'it-concordanza-agg'], vocabLevel: 'A2' },
    { writing: ['a2-preferenze'], speaking: ['hobby-tempo-libero'] },
    { cando: ['Kann Vorlieben äußern', 'Kann „preferisco“ verwenden', 'Kann kurz begründen'] }),

  u('A2', 12, 'A2-Wiederholung', 'Vergangenheit und Pronomen festigen',
    { reading: ['Un viaggio in Italia', 'Una giornata tipo'], listening: ['Riepilogo A2'] },
    { grammar: ['it-passato-avere', 'it-imperfetto', 'it-pronomi-diretti'], vocabLevel: 'A2' },
    { writing: ['a2-riepilogo'], speaking: ['viaggio-treno'] },
    { cando: ['Kann in der Vergangenheit erzählen', 'Kann Pronomen sicher verwenden', 'Kann zusammenhängende Texte verstehen'] }),

  // ---------------- B1 ----------------
  u('B1', 1, 'Meinungen äußern', 'Eigene Meinung begründen',
    { reading: ['I social media'], listening: ['Dibattito: social media'] },
    { grammar: ['it-condizionale', 'it-congiuntivo'], vocabLevel: 'B1' },
    { writing: ['b1-opinione'], speaking: ['opinione-dibattito'] },
    { cando: ['Kann Meinung mit „secondo me“ äußern', 'Kann Argumente nennen', 'Kann zustimmen/widersprechen'] }),

  u('B1', 2, 'Konjunktiv: Wünsche & Zweifel', 'Meinungen und Zweifel ausdrücken',
    { reading: ['Penso che…'], listening: ['Penso che sia importante'] },
    { grammar: ['it-congiuntivo'], vocabLevel: 'B1' },
    { writing: ['b1-congiuntivo'], speaking: ['opinione-dibattito'] },
    { cando: ['Kann „penso che + congiuntivo“ bilden', 'Kann Zweifel ausdrücken', 'Kann Nebensätze gestalten'] }),

  u('B1', 3, 'Planen & Vereinbaren', 'Eine Feier organisieren',
    { reading: ['Organizziamo una festa'], listening: ['Organizzare una festa'] },
    { grammar: ['it-condizionale', 'it-futuro'], vocabLevel: 'B1' },
    { writing: ['b1-pianificare'], speaking: ['pianificare-festa'] },
    { cando: ['Kann Vorschläge machen', 'Kann Absprachen treffen', 'Kann Pläne besprechen'] }),

  u('B1', 4, 'Arbeit & Bewerbung', 'Über Erfahrung und Stärken sprechen',
    { reading: ['Un colloquio di lavoro'], listening: ['Colloquio di lavoro'] },
    { grammar: ['it-passato-vs-imperfetto', 'it-condizionale'], vocabLevel: 'B1' },
    { writing: ['b1-lavoro'], speaking: ['lavoro-colloquio'] },
    { cando: ['Kann über Berufserfahrung sprechen', 'Kann Stärken beschreiben', 'Kann formell auftreten'] }),

  u('B1', 5, 'Reise & Planung', 'Zugverbindungen und Reisen planen',
    { reading: ['In stazione'], listening: ['In stazione'] },
    { grammar: ['it-futuro', 'it-condizionale'], vocabLevel: 'B1' },
    { writing: ['b1-viaggio'], speaking: ['viaggio-treno'] },
    { cando: ['Kann eine Reise planen', 'Kann Fahrplaninformationen verstehen', 'Kann in Zukunft sprechen (futuro)'] }),

  u('B1', 6, 'B1-Wiederholung', 'Produktivität und Nuancen festigen',
    { reading: ['Attualità'], listening: ['Riepilogo B1'] },
    { grammar: ['it-congiuntivo', 'it-condizionale', 'it-passato-vs-imperfetto'], vocabLevel: 'B1' },
    { writing: ['b1-riepilogo'], speaking: ['opinione-dibattito'] },
    { cando: ['Kann zusammenhängend argumentieren', 'Kann Konjunktiv und Konditional anwenden', 'Kann an Diskussionen teilnehmen'] })
];

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ lang: 'it', version: '1.0.0', units }, null, 2), 'utf-8');
console.log(`✅ ${units.length} Curriculum-Units geschrieben -> ${OUT}`);
