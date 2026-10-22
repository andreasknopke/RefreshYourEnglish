/**
 * Generator: content/packs/en/grammar/en_cefr.json
 *
 * Englisch-Grammatik-Syllabus A1–B2 im selben Format wie der Italienisch-Pack
 * (Punkte mit concept/errorTag, 8 Übungen je Punkt: mc/fill). errorTags:
 * agreement (Subjekt-Verb-Kongruenz), tense, preposition, word_order, lexis,
 * spelling. Kein gender (Englisch hat kein grammatisches Genus).
 *
 * Nutzung: node src/scripts/gen-grammar-en.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../../content/packs/en/grammar/en_cefr.json');

const points = [
  // ---------------- A1 ----------------
  {
    id: 'en-to-be', level: 'A1', title: 'Verb „to be“',
    concept: 'agreement', errorTag: 'agreement',
    explanation: '„to be“ wird je nach Person konjugiert: I am, you/we/they are, he/she/it is. Verneinung: is not / are not / am not.',
    examples: ['I am a student.', 'She is happy.', 'They are at home.'],
    exercises: [
      { type: 'mc', s: 'She ___ my sister.', o: ['is', 'are', 'am', 'be'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'They ___ teachers.', o: ['are', 'is', 'am', 'be'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'I ___ tired.', o: ['am', 'is', 'are', 'be'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'He ___ (be) at work.', ans: ['is'], tag: 'agreement' },
      { type: 'mc', s: 'We ___ not hungry.', o: ['are', 'is', 'am', 'be'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'It ___ (be) cold today.', ans: ['is'], tag: 'agreement' },
      { type: 'mc', s: '___ you ready?', o: ['Are', 'Is', 'Am', 'Be'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Plural von „he is“:', o: ['they are', 'they is', 'they am', 'they be'], a: 0, tag: 'agreement' }
    ]
  },
  {
    id: 'en-present-simple', level: 'A1', title: 'Präsens (Present Simple)',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'Present Simple für Gewohnheiten. 3. Person Singular bekommt -s/-es: he works, she goes. Verneinung/Frage mit do/does.',
    examples: ['I work every day.', 'She works here.', 'He does not like tea.'],
    exercises: [
      { type: 'mc', s: 'He ___ to school.', o: ['goes', 'go', 'going', 'gone'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'She ___ coffee.', o: ['drinks', 'drink', 'drinking', 'drank'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'My brother ___ (work) in a bank.', ans: ['works'], tag: 'agreement' },
      { type: 'mc', s: '___ he like music?', o: ['Does', 'Do', 'Is', 'Are'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'They ___ play tennis.', o: ['do not', 'does not', 'is not', 'not'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'The train ___ (leave) at nine.', ans: ['leaves'], tag: 'agreement' },
      { type: 'mc', s: '3. Person Singular von „have“:', o: ['has', 'have', 'having', 'had'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'I ___ get up at seven.', o: ['always', 'always am', 'am always', 'to always'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'en-articles', level: 'A1', title: 'Artikel (a, an, the)',
    concept: 'gender', errorTag: 'lexis',
    explanation: '„a“ vor Konsonantenklang, „an“ vor Vokalklang, „the“ für Bekanntes/Einzigartiges. Kein Artikel bei Plural/abstrakt allgemein.',
    examples: ['a book, an apple, the sun.', 'I like music. (kein Artikel)'],
    exercises: [
      { type: 'mc', s: '___ hour', o: ['an', 'a', 'the', '-'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '___ university', o: ['a', 'an', 'the', '-'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'The moon is big. „the“ weil:', o: ['einzigartig', 'unzählig', 'Plural', 'Adjektiv'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Ich habe ___ Auto. = I have ___ car.', ans: ['a'], tag: 'lexis' },
      { type: 'mc', s: '___ honest man', o: ['an', 'a', 'the', '-'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Ich trinke Milch. = I drink ___ milk.', o: ['-', 'a', 'an', 'the'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Sie liest ___ Buch. = She reads ___ book.', ans: ['a'], tag: 'lexis' },
      { type: 'mc', s: '„an“ steht vor:', o: ['Vokalklang', 'Konsonant', 'Plural', 'Zahl'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'en-plurals', level: 'A1', title: 'Pluralbildung',
    concept: 'agreement', errorTag: 'spelling',
    explanation: 'Regulär -s/-es (cats, boxes). Unregelmäßig: man→men, child→children, foot→feet, tooth→teeth. -y nach Konsonant → -ies.',
    examples: ['one cat, two cats.', 'one child, three children.', 'one city, two cities.'],
    exercises: [
      { type: 'mc', s: 'Plural von „child“:', o: ['children', 'childs', 'childrens', 'childes'], a: 0, tag: 'spelling' },
      { type: 'mc', s: 'Plural von „box“:', o: ['boxes', 'boxs', 'boxies', 'box'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'Plural von „city“ = ___', ans: ['cities'], tag: 'spelling' },
      { type: 'mc', s: 'Plural von „man“:', o: ['men', 'mans', 'mens', 'man'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'Plural von „tooth“ = ___', ans: ['teeth'], tag: 'spelling' },
      { type: 'mc', s: 'Plural von „bus“:', o: ['buses', 'buss', 'busies', 'bus'], a: 0, tag: 'spelling' },
      { type: 'mc', s: 'Plural von „woman“:', o: ['women', 'womans', 'womens', 'woman'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'Plural von „baby“ = ___', ans: ['babies'], tag: 'spelling' }
    ]
  },
  {
    id: 'en-there-is', level: 'A1', title: 'there is / there are',
    concept: 'agreement', errorTag: 'agreement',
    explanation: '„there is“ + Singular/unzählig, „there are“ + Plural. Verneinung: there is not / there are not; mit any in Frage/Verneinung.',
    examples: ['There is a cat.', 'There are two dogs.', 'There is some water.'],
    exercises: [
      { type: 'mc', s: '___ a book on the table.', o: ['There is', 'There are', 'It is', 'They are'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '___ three chairs.', o: ['There are', 'There is', 'It is', 'There have'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Is there ___ milk?', o: ['any', 'some', 'many', 'a'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Es gibt einen Hund. = ___ is a dog.', ans: ['there'], tag: 'agreement' },
      { type: 'mc', s: 'There are not ___ people.', o: ['many', 'much', 'a', 'an'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '___ some water in the glass.', o: ['There is', 'There are', 'It is', 'They are'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'Es gibt zwei Autos. = There ___ two cars.', ans: ['are'], tag: 'agreement' },
      { type: 'mc', s: '„there is“ passt zu:', o: ['unzählig', 'Plural', 'Verben', 'Adjektive'], a: 0, tag: 'agreement' }
    ]
  },
  {
    id: 'en-possessives', level: 'A1', title: 'Possessive (’s, my, your)',
    concept: 'agreement', errorTag: 'lexis',
    explanation: '’s bei Personen (Tom’s car), of bei Dingen (the door of the room). Possessivpronomen: my, your, his, her, its, our, their.',
    examples: ['This is Tom’s book.', 'Her name is Anna.', 'Its tail is long.'],
    exercises: [
      { type: 'mc', s: 'Das Auto meines Vaters = my ___ car.', o: ['father’s', 'father', 'fathers', 'father of'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Maria und ___ Hund', o: ['her', 'his', 'its', 'their'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Der Name des Hundes = the name ___ the dog.', ans: ['of'], tag: 'preposition' },
      { type: 'mc', s: 'Das ist ___ (unser) Haus.', o: ['our', 'us', 'we', 'ours'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Die Katze putzt ___ (sein/ihr, Tier) Fell.', o: ['its', 'it’s', 'his', 'her'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Dein Buch = ___ book.', ans: ['your'], tag: 'lexis' },
      { type: 'mc', s: 'Toms und Annas Kinder = Tom and ___ children', o: ['Anna’s', 'Anna', 'Annas of', 'of Anna'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„its“ schreibt sich ohne Apostroph, weil:', o: ['Possessivpronomen', 'Verb', 'Plural', 'Abkürzung'], a: 0, tag: 'spelling' }
    ]
  },

  // ---------------- A2 ----------------
  {
    id: 'en-past-simple', level: 'A2', title: 'Vergangenheit (Past Simple)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Regulär -ed (worked). Unregelmäßig: go→went, see→saw, have→had, do→did. Verneinung/Frage mit did + Infinitiv.',
    examples: ['I worked yesterday.', 'She went home.', 'Did you see it?'],
    exercises: [
      { type: 'mc', s: 'Yesterday I ___ to the cinema.', o: ['went', 'go', 'gone', 'going'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'She ___ a letter last night.', o: ['wrote', 'write', 'written', 'writes'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'We ___ (have) a party.', ans: ['had'], tag: 'tense' },
      { type: 'mc', s: '___ you see the film?', o: ['Did', 'Do', 'Does', 'Were'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'He ___ (not come).', o: ['did not come', 'did not came', 'does not came', 'do not come'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'They ___ (buy) a car.', ans: ['bought'], tag: 'tense' },
      { type: 'mc', s: 'Past von „see“:', o: ['saw', 'seed', 'seen', 'seeing'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Nach „did“ steht das', o: ['Infinitiv', 'Past', 'Partizip', '-ing'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'en-present-perfect', level: 'A2', title: 'Present Perfect',
    concept: 'tense', errorTag: 'tense',
    explanation: 'have/has + past participle für Erfahrung/Ergebnis mit Gegenwart. Signalwörter: ever, never, already, yet, just, since, for.',
    examples: ['I have visited Rome.', 'She has just left.', 'We have known him for years.'],
    exercises: [
      { type: 'mc', s: 'I ___ never been to Spain.', o: ['have', 'has', 'had', 'am'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'She ___ finished her homework.', o: ['has', 'have', 'had', 'is'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'We ___ (see) that film.', ans: ['have seen'], tag: 'tense' },
      { type: 'mc', s: '___ you ever eaten sushi?', o: ['Have', 'Has', 'Did', 'Had'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Present Perfect von „go“:', o: ['have gone', 'have went', 'has went', 'had went'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'He ___ (live) here since 2010.', ans: ['has lived'], tag: 'tense' },
      { type: 'mc', s: '„yet“ steht meist in', o: ['Fragen/Verneinung', 'Aussagesätzen', 'Befehlen', 'Ausrufen'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '„for“ +', o: ['Zeitraum', 'Zeitpunkt', 'Ort', 'Person'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'en-comparatives', level: 'A2', title: 'Komparativ & Superlativ',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Kurz: -er/-est (taller, tallest). Lang: more/most (more expensive). Unregelmäßig: good→better→best, bad→worse→worst.',
    examples: ['taller than', 'the tallest', 'more expensive than', 'the best'],
    exercises: [
      { type: 'mc', s: 'tall → Komparativ:', o: ['taller', 'more tall', 'most tall', 'tallest'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'good → Superlativ:', o: ['best', 'goodest', 'most good', 'better'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'expensive → Komparativ = ___ expensive', ans: ['more'], tag: 'lexis' },
      { type: 'mc', s: 'bad → Komparativ:', o: ['worse', 'badder', 'more bad', 'worst'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Er ist größer ___ ich.', o: ['than', 'then', 'that', 'as'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'the ___ (gut) student', ans: ['best'], tag: 'lexis' },
      { type: 'mc', s: 'far → Superlativ:', o: ['farthest', 'farst', 'most far', 'further'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„as … as“ drückt', o: ['Gleichheit', 'Steigerung', 'Unterschied', 'Folge'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'en-modals-can', level: 'A2', title: 'Modalverben (can, must, should)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'can (Können/Erlaubnis), must (Pflicht), should (Empfehlung), have to (müssen). Nach Modalverb steht der Infinitiv ohne to.',
    examples: ['I can swim.', 'You must stop.', 'She should rest.'],
    exercises: [
      { type: 'mc', s: 'Du ___ rauchen (Verbot).', o: ['must not', 'must to not', 'don’t must', 'not must'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'She ___ speak French.', o: ['can', 'cans', 'can to', 'is can'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Empfehlung: You ___ (sollten) rest.', ans: ['should'], tag: 'tense' },
      { type: 'mc', s: 'Nach „can“ steht:', o: ['Infinitiv ohne to', 'Infinitiv mit to', '-ing', 'Past'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '„have to“ bedeutet', o: ['müssen', 'können', 'dürfen', 'wollen'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Er ___ (kann nicht) kommen.', ans: ['cannot', 'can not', 'can’t'], tag: 'tense' },
      { type: 'mc', s: 'Frage mit „can“:', o: ['Can you swim?', 'Do you can?', 'Can you to swim?', 'You can?'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '„must“ im Past (Pflicht) =', o: ['had to', 'musted', 'must', 'have to'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'en-prepositions-time', level: 'A2', title: 'Präpositionen (in, on, at)',
    concept: 'preposition', errorTag: 'preposition',
    explanation: 'Zeit: at (Uhrzeit), on (Tag/Tag+Datum), in (Monat/Jahr/Jahreszeit). Ort: at (Punkt), on (Fläche), in (umschlossen).',
    examples: ['at 5 o’clock', 'on Monday', 'in July', 'in the morning'],
    exercises: [
      { type: 'mc', s: '___ Monday', o: ['On', 'In', 'At', 'To'], a: 0, tag: 'preposition' },
      { type: 'mc', s: '___ 2020', o: ['In', 'On', 'At', 'By'], a: 0, tag: 'preposition' },
      { type: 'mc', s: '___ nine o’clock', o: ['At', 'In', 'On', 'To'], a: 0, tag: 'preposition' },
      { type: 'fill', s: 'im Sommer = ___ summer', ans: ['in'], tag: 'preposition' },
      { type: 'mc', s: '___ my birthday', o: ['On', 'In', 'At', 'To'], a: 0, tag: 'preposition' },
      { type: 'fill', s: 'um 7 Uhr = ___ seven o’clock', ans: ['at'], tag: 'preposition' },
      { type: 'mc', s: '___ the morning', o: ['In', 'On', 'At', 'To'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'am Montag = ___ Monday', o: ['on', 'in', 'at', 'by'], a: 0, tag: 'preposition' }
    ]
  },
  {
    id: 'en-future-will', level: 'A2', title: 'Zukunft (will / going to)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'will + Infinitiv für spontane Entscheidungen/Vorhersagen. be going to für Pläne/absehbare Ereignisse.',
    examples: ['I will help you.', 'She is going to study.', 'It will rain.'],
    exercises: [
      { type: 'mc', s: 'Ich werde kommen. = I ___ come.', o: ['will', 'am will', 'will to', 'going'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Er plant zu reisen. = He ___ travel.', o: ['is going to', 'will going', 'is will', 'going'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Spontane Entscheidung: I ___ (will) open the window.', ans: ['will'], tag: 'tense' },
      { type: 'mc', s: 'Verneinung von „will“:', o: ['will not / won’t', 'will no', 'not will', 'don’t will'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„going to“ braucht', o: ['be + going to', 'will', 'have', 'do'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Es wird regnen. = It ___ rain.', ans: ['will'], tag: 'tense' },
      { type: 'mc', s: 'Vorhersage ohne Plan nutzt', o: ['will', 'going to', 'present', 'past'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Feste Pläne nutzen eher', o: ['going to', 'will', 'would', 'shall'], a: 0, tag: 'tense' }
    ]
  },

  // ---------------- B1 ----------------
  {
    id: 'en-conditional-1-2', level: 'B1', title: 'Konditionalsätze Typ 1 & 2',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Typ 1 (real): If + Present, will + Inf. Typ 2 (unreal): If + Past Simple, would + Inf. Komma, wenn if-Satz vorn.',
    examples: ['If it rains, I will stay.', 'If I were rich, I would travel.'],
    exercises: [
      { type: 'mc', s: 'If it rains, I ___ at home.', o: ['will stay', 'would stay', 'stayed', 'stay'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'If I ___ rich, I would travel.', o: ['were', 'am', 'will be', 'be'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Typ 2: If he ___ (know), he would help.', ans: ['knew'], tag: 'tense' },
      { type: 'mc', s: 'Typ 1 if-Satz steht im', o: ['Present', 'Past', 'Future', 'Perfect'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'If I ___ you, I would go.', o: ['were', 'am', 'was being', 'will be'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Typ 1: If you study, you ___ (pass).', ans: ['will pass'], tag: 'tense' },
      { type: 'mc', s: 'Im if-Satz steht kein', o: ['will', 'Present', 'Verb', 'Subjekt'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Typ 2 drückt', o: ['Unwirkliches', 'Vergangenes', 'Befehle', 'Fragen'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'en-passive', level: 'B1', title: 'Passiv (Passive Voice)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'be + past participle. Tempus steckt in „be“: is made, was built, has been done. Täter mit „by“.',
    examples: ['The book is read by many.', 'The house was built in 1900.'],
    exercises: [
      { type: 'mc', s: 'The letter ___ yesterday.', o: ['was sent', 'sent', 'is send', 'has send'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Passiv von „They make cars“:', o: ['Cars are made', 'Cars make', 'Cars is made', 'Cars made'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Present Perfect Passiv: The work ___ (do).', ans: ['has been done'], tag: 'tense' },
      { type: 'mc', s: 'Passiv braucht', o: ['be + past participle', 'have + inf', 'be + -ing', 'will + inf'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'The bridge ___ in 1850.', o: ['was built', 'built', 'is build', 'has build'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Täter: written ___ Shakespeare', ans: ['by'], tag: 'preposition' },
      { type: 'mc', s: 'Future Passiv:', o: ['will be done', 'will do', 'will doing', 'will have'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Passiv betont', o: ['die Handlung/Leidende', 'den Täter', 'die Zeit', 'den Ort'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'en-relative-clauses', level: 'B1', title: 'Relativsätze (who, which, that)',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'who (Personen), which (Sachen), that (beide, im definierten Relativsatz). Non-defining mit Komma, „that“ nicht erlaubt.',
    examples: ['The man who called.', 'The book which I read.', 'Paris, which is beautiful, …'],
    exercises: [
      { type: 'mc', s: 'The woman ___ lives next door.', o: ['who', 'which', 'what', 'whose'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'The car ___ I bought.', o: ['which', 'who', 'what', 'where'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Non-defining: mein Bruder, ___ in Rom lebt', o: ['who', 'that', 'what', 'which'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'Der Mann, dessen Auto … = the man ___ car …', ans: ['whose'], tag: 'word_order' },
      { type: 'mc', s: 'Im non-defining Satz ist „that“', o: ['nicht erlaubt', 'Pflicht', 'egal', 'besser'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'The city ___ I was born', o: ['where', 'which', 'who', 'when'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'Das Buch, das ich lese = the book ___ I read', ans: ['that', 'which'], tag: 'word_order' },
      { type: 'mc', s: '„which“ bezieht sich auf', o: ['Sachen/Tiere', 'Personen', 'Orte', 'Zeiten'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'en-reported-speech', level: 'B1', title: 'Indirekte Rede',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Zeitformen „backshiften“: Present→Past, Past→Past Perfect, will→would. Pronomen und Zeitwörter anpassen.',
    examples: ['“I am tired” → He said he was tired.', '“I will go” → She said she would go.'],
    exercises: [
      { type: 'mc', s: '“I am happy” → He said he ___ happy.', o: ['was', 'is', 'were', 'has been'], a: 0, tag: 'tense' },
      { type: 'mc', s: '“I will call” → She said she ___ call.', o: ['would', 'will', 'was', 'had'], a: 0, tag: 'tense' },
      { type: 'fill', s: '“I saw it” → He said he ___ it.', ans: ['had seen'], tag: 'tense' },
      { type: 'mc', s: 'Present Simple wird zu', o: ['Past Simple', 'Past Perfect', 'Future', 'bleibt'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„tomorrow“ wird zu', o: ['the next day', 'yesterday', 'now', 'today'], a: 0, tag: 'word_order' },
      { type: 'fill', s: '“I have done it” → She said she ___ it.', ans: ['had done'], tag: 'tense' },
      { type: 'mc', s: '„will“ wird zu', o: ['would', 'will', 'had', 'was'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Indirekte Fragen nutzen', o: ['Aussagesatz-Wortstellung', 'Frage-Wortstellung', 'do', 'Satzzeichen ?'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'en-gerund-infinitive', level: 'B1', title: 'Gerund vs. Infinitiv',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Nach manchen Verben -ing (enjoy doing), nach anderen to (want to do). Nach Präpositionen immer -ing.',
    examples: ['I enjoy reading.', 'She wants to leave.', 'He is good at drawing.'],
    exercises: [
      { type: 'mc', s: 'I enjoy ___ books.', o: ['reading', 'to read', 'read', 'to reading'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'She wants ___ home.', o: ['to go', 'going', 'go', 'goes'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Nach Präposition: good at ___ (draw)', ans: ['drawing'], tag: 'lexis' },
      { type: 'mc', s: 'I decided ___ early.', o: ['to get up', 'getting up', 'get up', 'got up'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'I avoid ___ late.', o: ['arriving', 'to arrive', 'arrive', 'arrived'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'He promised ___ (call).', ans: ['to call'], tag: 'lexis' },
      { type: 'mc', s: '„enjoy“ verlangt', o: ['-ing', 'to + inf', 'Past', 'Modal'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„want“ verlangt', o: ['to + inf', '-ing', 'Past', 'Modal'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'en-present-perfect-vs-past', level: 'B1', title: 'Present Perfect vs. Past Simple',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Past Simple = abgeschlossene Zeit (yesterday, in 2010). Present Perfect = offene Zeit/Erfahrung (ever, never, this week).',
    examples: ['I went there in 2010.', 'I have been there twice.'],
    exercises: [
      { type: 'mc', s: 'I ___ him yesterday.', o: ['saw', 'have seen', 'have saw', 'see'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'I ___ him twice.', o: ['have seen', 'saw', 'see', 'had saw'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'mit „last week“: I ___ (visit) her.', ans: ['visited'], tag: 'tense' },
      { type: 'mc', s: '„ever“ passt zu', o: ['Present Perfect', 'Past Simple', 'Future', 'Past Perfect'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„in 2010“ passt zu', o: ['Past Simple', 'Present Perfect', 'Future', 'Progressive'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Erfahrung: She ___ (be) to Japan.', ans: ['has been'], tag: 'tense' },
      { type: 'mc', s: 'Abgeschlossene Zeitangabe nutzt', o: ['Past Simple', 'Present Perfect', 'will', 'would'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„just“ passt zu', o: ['Present Perfect', 'Past Simple', 'Future', 'would'], a: 0, tag: 'tense' }
    ]
  },

  // ---------------- B2 ----------------
  {
    id: 'en-conditional-3', level: 'B2', title: 'Konditionalsatz Typ 3 & gemischt',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Typ 3 (unreal vergangen): If + Past Perfect, would have + p.p. Gemischt: If + Past Perfect, would + Inf (heutige Folge).',
    examples: ['If I had studied, I would have passed.', 'If I had gone, I would be happy now.'],
    exercises: [
      { type: 'mc', s: 'If I ___ harder, I would have passed.', o: ['had studied', 'studied', 'would study', 'study'], a: 0, tag: 'tense' },
      { type: 'mc', s: '… I ___ passed.', o: ['would have', 'would', 'will have', 'had'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Typ 3: If she ___ (know), she would have come.', ans: ['had known'], tag: 'tense' },
      { type: 'mc', s: 'Gemischt (heutige Folge): If I had gone, I ___ happy now.', o: ['would be', 'would have been', 'will be', 'was'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Typ 3 if-Satz nutzt', o: ['Past Perfect', 'Past Simple', 'Present', 'would have'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'If they ___ (leave) earlier, they would have arrived.', ans: ['had left'], tag: 'tense' },
      { type: 'mc', s: 'Typ 3 drückt', o: ['unwirkliche Vergangenheit', 'Gegenwart', 'Zukunft', 'Befehle'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Hauptsatz Typ 3:', o: ['would have + p.p.', 'would + inf', 'will + inf', 'had + inf'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'en-past-perfect', level: 'B2', title: 'Past Perfect',
    concept: 'tense', errorTag: 'tense',
    explanation: 'had + past participle für Vorzeitigkeit in der Vergangenheit. Oft mit when, after, before, by the time.',
    examples: ['When I arrived, the train had left.', 'She had finished before noon.'],
    exercises: [
      { type: 'mc', s: 'When I arrived, the film ___.', o: ['had started', 'started', 'has started', 'starts'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'She ___ the letter before he called.', o: ['had written', 'wrote', 'has written', 'writes'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'By the time we came, they ___ (eat).', ans: ['had eaten'], tag: 'tense' },
      { type: 'mc', s: 'Past Perfect drückt', o: ['Vorzeitigkeit', 'Gleichzeitigkeit', 'Zukunft', 'Dauer'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Bildung:', o: ['had + p.p.', 'have + p.p.', 'was + -ing', 'will + have'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'After he ___ (finish), he left.', ans: ['had finished'], tag: 'tense' },
      { type: 'mc', s: 'Signalwort für Past Perfect:', o: ['by the time', 'now', 'tomorrow', 'always'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Past Perfect steht in der', o: ['Vergangenheit', 'Gegenwart', 'Zukunft', 'Bedingung'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'en-would-used-to', level: 'B2', title: 'used to / would (Gewohnheit)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'used to + Inf für vergangene Gewohnheiten/Zustände. would + Inf für vergangene Handlungen (nicht Zustände).',
    examples: ['I used to smoke.', 'We would play outside.', 'She used to live here.'],
    exercises: [
      { type: 'mc', s: 'Früher rauchte ich. = I ___ smoke.', o: ['used to', 'use to', 'am used to', 'would to'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Früher spielten wir oft. = We ___ play.', o: ['would', 'would to', 'used', 'use to'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Früher wohnte er hier. = He ___ live here.', ans: ['used to'], tag: 'tense' },
      { type: 'mc', s: '„would“ für vergangene Gewohnheit geht NICHT bei', o: ['Zuständen', 'Handlungen', 'Verben', 'Fragen'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Verneinung:', o: ['didn’t use to', 'didn’t used to', 'used not to', 'no used to'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Früher hasste ich Spinat. = I ___ hate spinach.', ans: ['used to'], tag: 'tense' },
      { type: 'mc', s: '„be used to“ + -ing bedeutet', o: ['gewohnt sein', 'früher', 'werden', 'wollen'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„used to“ bezieht sich auf', o: ['Vergangenheit', 'Gegenwart', 'Zukunft', 'Bedingung'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'en-subjunctive', level: 'B2', title: 'Konjunktiv (subjunctive)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Nach suggest/insist/recommend + that: Infinitiv ohne -s (I suggest he go). „If I were …“ (irreal). „It’s essential that she be …“.',
    examples: ['I suggest he study.', 'If I were you …', 'It’s vital that she be present.'],
    exercises: [
      { type: 'mc', s: 'I suggest that he ___ more.', o: ['study', 'studies', 'studied', 'will study'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'If I ___ you, I would go.', o: ['were', 'was', 'am', 'would be'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'It’s essential that she ___ (be) here.', ans: ['be'], tag: 'tense' },
      { type: 'mc', s: 'I insist that she ___ the truth.', o: ['tell', 'tells', 'told', 'will tell'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Der subjunctive nutzt', o: ['Infinitiv ohne -s', '3. Pers. -s', 'Past', '-ing'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'I recommend that he ___ (rest).', ans: ['rest'], tag: 'tense' },
      { type: 'mc', s: '„If I ___ rich“ (gehoben):', o: ['were', 'was', 'am', 'will be'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Subjunctive nach', o: ['suggest/insist/that', 'and/but', 'the/a', 'very'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'en-connectors', level: 'B2', title: 'Textkonnektoren (however, although)',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Konzessiv: although, however, despite + -ing/Nomen. Kausal: because, since, due to. Final: so that, in order to.',
    examples: ['Although it rained, we went out.', 'Despite the rain, …', 'He studies hard so that he passes.'],
    exercises: [
      { type: 'mc', s: '___ it rained, we went out.', o: ['Although', 'Despite', 'Because', 'So that'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '___ the rain, we went out.', o: ['Despite', 'Although', 'Because', 'However'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Zweck:', o: ['so that', 'although', 'despite', 'however'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Konzessiv mit Nomen: ___ the cost, …', ans: ['despite', 'in spite of'], tag: 'lexis' },
      { type: 'mc', s: '„however“ drückt', o: ['Gegensatz', 'Grund', 'Zweck', 'Folge'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Grund: ___ it was late, we left.', ans: ['because', 'since', 'as'], tag: 'lexis' },
      { type: 'mc', s: '„despite“ +', o: ['Nomen/-ing', 'Satz', 'Infinitiv', 'Modal'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '„in order to“ +', o: ['Infinitiv', 'Satz', 'Nomen', '-ing'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'en-phrasal-verbs', level: 'B2', title: 'Phrasal Verbs',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Verb + Partikel mit eigener Bedeutung: give up (aufgeben), look after (aufpassen), put off (verschieben), find out (herausfinden).',
    examples: ['I gave up smoking.', 'She looks after the kids.', 'We put off the meeting.'],
    exercises: [
      { type: 'mc', s: 'aufgeben =', o: ['give up', 'give in', 'give out', 'give away'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'aufpassen auf =', o: ['look after', 'look for', 'look up', 'look into'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'herausfinden =', o: ['find out', 'find up', 'find on', 'find off'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'verschieben = put ___', ans: ['off'], tag: 'lexis' },
      { type: 'mc', s: 'nachschlagen =', o: ['look up', 'look after', 'look off', 'look away'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'vorkommen/erscheinen =', o: ['turn up', 'turn down', 'turn off', 'turn in'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'ablehnen = turn ___', ans: ['down'], tag: 'lexis' },
      { type: 'mc', s: 'Phrasal Verbs sind', o: ['idiomatisch', 'wörtlich', 'veraltet', 'dialektal'], a: 0, tag: 'lexis' }
    ]
  }
];

// Konsistenzprüfung
for (const p of points) {
  if (p.exercises.length !== 8) throw new Error(`${p.id}: ${p.exercises.length} Übungen (erwartet 8)`);
  for (const e of p.exercises) {
    if (e.type === 'mc' && (e.a < 0 || e.a >= e.o.length)) throw new Error(`${p.id}: mc-Antwort außerhalb Optionen`);
    if (e.type === 'fill' && (!Array.isArray(e.ans) || e.ans.length === 0)) throw new Error(`${p.id}: fill ohne Antwort`);
  }
}

const doc = {
  lang: 'en',
  version: '1.0.0',
  source: 'CEFR Can-do + Lehrplan A1–B2 (Englisch)',
  points
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
console.log(`✅ ${points.length} Punkte, ${points.reduce((n, p) => n + p.exercises.length, 0)} Übungen → ${OUT}`);
