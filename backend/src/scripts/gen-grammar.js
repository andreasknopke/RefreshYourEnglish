// Erstellt content/packs/it/grammar/it_cefr.json aus kompakten Definitionen.
// 20 Grammatikpunkte (A1–B1), je 8 Übungen (mc/fill) mit errorTag.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { shuffleMcExercise } from './shuffleUtil.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../../content/packs/it/grammar/it_cefr.json');

// mc: { s: satz mit ___ , o: [optionen], a: index der richtigen, tag, why? }
// fill: { s: satz mit ___, ans: [akzeptierte antworten], tag, why? }
const points = [
  {
    id: 'it-art-determinativi', level: 'A1', title: 'Artikel bestimmt (il, lo, la, i, gli, le)',
    concept: 'gender', errorTag: 'gender',
    explanation: 'Der bestimmte Artikel richtet sich nach Genus und dem Anfangsbuchstaben des Nomens: il (m, Konsonant), lo (m, s+Konsonant/z/gn/ps/y/x), la (f, Konsonant), i (m-Pl), gli (m-Pl von lo), le (f-Pl).',
    examples: ['il libro – das Buch', 'lo studente – der Student', 'la casa – das Haus', 'gli amici – die Freunde'],
    exercises: [
      { type: 'mc', s: '___ libro è interessante.', o: ['Il', 'Lo', 'La', "L'"], a: 0, tag: 'gender' },
      { type: 'mc', s: '___ studente studia molto.', o: ['Il', 'Lo', 'La', 'I'], a: 1, tag: 'gender' },
      { type: 'mc', s: '___ casa è grande.', o: ['Il', 'Lo', 'La', 'Le'], a: 2, tag: 'gender' },
      { type: 'mc', s: '___ amici sono simpatici.', o: ['I', 'Gli', 'Le', 'Lo'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '___ amiche sono simpatiche.', o: ['I', 'Gli', 'Le', 'La'], a: 2, tag: 'agreement' },
      { type: 'mc', s: '___ zaino è nuovo.', o: ['Il', 'Lo', 'La', 'I'], a: 1, tag: 'gender' },
      { type: 'fill', s: '___ occhio (m, Singular) → ___ occhio', ans: ["L'"], tag: 'gender', why: "Vokal → l'" },
      { type: 'fill', s: 'Plural von "lo studente" ist ___ studenti.', ans: ['gli'], tag: 'agreement' }
    ]
  },
  {
    id: 'it-art-indeterminativi', level: 'A1', title: 'Artikel unbestimmt (un, uno, una, un’)',
    concept: 'gender', errorTag: 'gender',
    explanation: 'un (m, Konsonant), uno (m, s+Konsonant/z/gn/ps), una (f, Konsonant), un’ (f, Vokal). Der Plural fehlt; stattdessen „dei/delle“.',
    examples: ['un cane', 'uno studente', 'una donna', "un'amica"],
    exercises: [
      { type: 'mc', s: 'Ho ___ cane.', o: ['un', 'uno', 'una', "un'"], a: 0, tag: 'gender' },
      { type: 'mc', s: 'È ___ professore.', o: ['un', 'uno', 'una', 'gli'], a: 0, tag: 'gender' },
      { type: 'mc', s: 'È ___ studente.', o: ['un', 'uno', 'una', 'lo'], a: 1, tag: 'gender' },
      { type: 'mc', s: 'È ___ amica.', o: ['un', 'uno', 'una', "un'"], a: 3, tag: 'gender' },
      { type: 'mc', s: 'È ___ donna.', o: ['un', 'uno', 'una', "un'"], a: 2, tag: 'gender' },
      { type: 'fill', s: '___ zaino (m)', ans: ['uno'], tag: 'gender' },
      { type: 'fill', s: '___ amica (f, Vokal)', ans: ["un'"], tag: 'gender' },
      { type: 'mc', s: 'Cerco ___ università (f).', o: ['un', 'uno', 'una', "un'"], a: 3, tag: 'gender' }
    ]
  },
  {
    id: 'it-concordanza-agg', level: 'A1', title: 'Angleichung Adjektiv–Nomen',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'Adjektive richten sich in Genus und Numerus nach dem Nomen: -o (m.Sg), -a (f.Sg), -i (m.Pl), -e (f.Pl).',
    examples: ['il ragazzo alto', 'la ragazza alta', 'i ragazzi alti', 'le ragazze alte'],
    exercises: [
      { type: 'mc', s: 'La macchina è ___ (veloce).', o: ['veloce', 'veloci', 'veloca'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'I bambini sono ___ (alto).', o: ['alto', 'alta', 'alti', 'alte'], a: 2, tag: 'agreement' },
      { type: 'mc', s: 'Le case sono ___ (bello).', o: ['bello', 'bella', 'belli', 'belle'], a: 3, tag: 'agreement' },
      { type: 'mc', s: 'Il vino è ___ (buono).', o: ['buono', 'buona', 'buoni', 'buone'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'La pizza è ___ (buono)', ans: ['buona'], tag: 'agreement' },
      { type: 'fill', s: 'Gli amici sono ___ (simpatico)', ans: ['simpatici'], tag: 'agreement' },
      { type: 'fill', s: 'Le ragazze sono ___ (bravo)', ans: ['brave'], tag: 'agreement' },
      { type: 'mc', s: 'Un uomo ___ (onesto).', o: ['onesto', 'onesta', 'onesti', 'oneste'], a: 0, tag: 'agreement' }
    ]
  },
  {
    id: 'it-essere', level: 'A1', title: 'sein – essere (Präsens)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'io sono, tu sei, lui/lei è, noi siamo, voi siete, loro sono.',
    examples: ['Io sono italiano.', 'Loro sono studenti.'],
    exercises: [
      { type: 'mc', s: 'Io ___ Marco.', o: ['sono', 'sei', 'è', 'siamo'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Tu ___ alto.', o: ['sono', 'sei', 'è', 'siete'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'Lei ___ dottoressa.', o: ['sono', 'sei', 'è', 'siamo'], a: 2, tag: 'tense' },
      { type: 'mc', s: 'Noi ___ amici.', o: ['siamo', 'siete', 'sono', 'è'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Voi ___ pronti?', o: ['siamo', 'siete', 'sono', 'sei'], a: 1, tag: 'tense' },
      { type: 'fill', s: 'Loro ___ stanchi.', ans: ['sono'], tag: 'tense' },
      { type: 'fill', s: 'Tu ___ mia sorella?', ans: ['sei'], tag: 'tense' },
      { type: 'fill', s: 'Noi ___ a casa.', ans: ['siamo'], tag: 'tense' }
    ]
  },
  {
    id: 'it-avere', level: 'A1', title: 'haben – avere (Präsens)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'io ho, tu hai, lui/lei ha, noi abbiamo, voi avete, loro hanno.',
    examples: ['Ho un cane.', 'Hanno fame.'],
    exercises: [
      { type: 'mc', s: 'Io ___ un gatto.', o: ['ho', 'hai', 'ha', 'abbiamo'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Tu ___ ragione.', o: ['ho', 'hai', 'ha', 'avete'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'Lui ___ fame.', o: ['ho', 'hai', 'ha', 'hanno'], a: 2, tag: 'tense' },
      { type: 'mc', s: 'Noi ___ sete.', o: ['abbiamo', 'avete', 'hanno', 'ha'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Voi ___ tempo?', o: ['abbiamo', 'avete', 'hanno', 'hai'], a: 1, tag: 'tense' },
      { type: 'fill', s: 'Loro ___ sonno.', ans: ['hanno'], tag: 'tense' },
      { type: 'fill', s: 'Io ___ vent’anni.', ans: ['ho'], tag: 'tense' },
      { type: 'fill', s: 'Lei ___ un’idea.', ans: ['ha'], tag: 'tense' }
    ]
  },
  {
    id: 'it-plurale-nomi', level: 'A1', title: 'Plural der Nomen',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'Maskulin auf -o → -i (libro→libri). Feminin auf -a → -e (casa→case). Maskulin auf -a (Fremdwörter) → -i (cinema→cinema). Adjektive passen sich an.',
    examples: ['libro → libri', 'casa → case', 'amico → amici'],
    exercises: [
      { type: 'mc', s: 'Plural von „libro“:', o: ['libri', 'libre', 'libro', 'libera'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Plural von „casa“:', o: ['casi', 'case', 'casa', 'caso'], a: 1, tag: 'agreement' },
      { type: 'mc', s: 'Plural von „amico“:', o: ['amici', 'amiche', 'amigo', 'amice'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Plural von „amica“:', o: ['amici', 'amiche', 'amicas', 'amine'], a: 1, tag: 'agreement' },
      { type: 'fill', s: 'ragazzo → ___', ans: ['ragazzi'], tag: 'agreement' },
      { type: 'fill', s: 'donna → ___', ans: ['donne'], tag: 'agreement' },
      { type: 'fill', s: 'professore → ___', ans: ['professori'], tag: 'agreement' },
      { type: 'mc', s: 'Le ___ (ragazza) ridono.', o: ['ragazza', 'ragazze', 'ragazzi', 'ragazzo'], a: 1, tag: 'agreement' }
    ]
  },
  {
    id: 'it-verbi-are', level: 'A1', title: 'Regelmäßige Verben auf -are',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Stamm + -o, -i, -a, -iamo, -ate, -ano. Beispiel parlare: parlo, parli, parla, parliamo, parlate, parlano.',
    examples: ['parlo italiano', 'mangiamo la pasta'],
    exercises: [
      { type: 'mc', s: 'Io ___ (parlare) italiano.', o: ['parlo', 'parli', 'parla', 'parliamo'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Tu ___ (mangiare) la pizza.', o: ['mangio', 'mangi', 'mangia', 'mangiate'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'Lui ___ (abitare) a Roma.', o: ['abito', 'abiti', 'abita', 'abitano'], a: 2, tag: 'tense' },
      { type: 'mc', s: 'Noi ___ (cantare) bene.', o: ['cantiamo', 'cantate', 'cantano', 'canto'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Voi ___ (parlare) troppo.', o: ['cantiamo', 'parlate', 'parlano', 'parli'], a: 1, tag: 'tense' },
      { type: 'fill', s: 'Loro ___ (mangiare) il gelato.', ans: ['mangiano'], tag: 'tense' },
      { type: 'fill', s: 'Tu ___ (parlare) inglese?', ans: ['parli'], tag: 'tense' },
      { type: 'fill', s: 'Io ___ (abitare) a Milano.', ans: ['abito'], tag: 'tense' }
    ]
  },
  {
    id: 'it-verbi-ere-ire', level: 'A1', title: 'Regelmäßige Verben auf -ere / -ire',
    concept: 'tense', errorTag: 'tense',
    explanation: '-ere: -o,-i,-e,-iamo,-ete,-ono (vendo). -ire: -o,-i,-e,-iamo,-ite,-ono (parto); manche mit -isc- (capisco).',
    examples: ['vendo una casa', 'capisco la lezione'],
    exercises: [
      { type: 'mc', s: 'Io ___ (vendere) l’auto.', o: ['vendo', 'vendi', 'vende', 'vendiamo'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Tu ___ (scrivere) una lettera.', o: ['scrivo', 'scrivi', 'scrive', 'scrivete'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'Lei ___ (leggere) il giornale.', o: ['leggo', 'leggi', 'legge', 'leggono'], a: 2, tag: 'tense' },
      { type: 'mc', s: 'Io ___ (capire) tutto.', o: ['capo', 'capi', 'capisce', 'capisco'], a: 3, tag: 'tense' },
      { type: 'mc', s: 'Noi ___ (partire) domani.', o: ['partiamo', 'partite', 'partono', 'parto'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Loro ___ (scrivere) libri.', ans: ['scrivono'], tag: 'tense' },
      { type: 'fill', s: 'Tu ___ (capire)?', ans: ['capisci'], tag: 'tense' },
      { type: 'fill', s: 'Voi ___ (vendere) casa?', ans: ['vendete'], tag: 'tense' }
    ]
  },
  {
    id: 'it-preposizioni-semplici', level: 'A1', title: 'Einfache Präpositionen',
    concept: 'preposition', errorTag: 'preposition',
    explanation: 'a (Ort/Ziel), di (Besitz/herkunft), da (von/zu Person), in (in Ländern/Städten), con (mit), su (auf), per (für).',
    examples: ['vado a Roma', 'il libro di Anna', 'vengo da Milano'],
    exercises: [
      { type: 'mc', s: 'Vado ___ Roma.', o: ['a', 'in', 'di', 'da'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Il libro ___ Anna.', o: ['a', 'di', 'da', 'per'], a: 1, tag: 'preposition' },
      { type: 'mc', s: 'Vengo ___ Milano.', o: ['a', 'di', 'da', 'in'], a: 2, tag: 'preposition' },
      { type: 'mc', s: 'Abito ___ Italia.', o: ['a', 'di', 'da', 'in'], a: 3, tag: 'preposition' },
      { type: 'mc', s: 'Parlo ___ Marco.', o: ['a', 'con', 'di', 'su'], a: 1, tag: 'preposition' },
      { type: 'fill', s: 'Questo regalo è ___ te (für).', ans: ['per'], tag: 'preposition' },
      { type: 'fill', s: 'Il gatto è ___ tavolo (auf).', ans: ['sul', 'su'], tag: 'preposition' },
      { type: 'mc', s: 'Vado ___ cinema (Ort).', o: ['a', 'in', 'di', 'con'], a: 0, tag: 'preposition' }
    ]
  },
  {
    id: 'it-preposizioni-articolate', level: 'A1', title: 'Verschmelzte Präpositionen',
    concept: 'preposition', errorTag: 'preposition',
    explanation: 'Präposition + Artikel verschmelzen: a+il=al, di+il=del, da+il=dal, in+il=nel, su+il=sul; a+la=alla, in+la=nella usw.',
    examples: ['vado al bar', 'il colore del cielo', 'sono nella stanza'],
    exercises: [
      { type: 'mc', s: 'Vado ___ bar (a+il).', o: ['al', 'a il', 'del', 'nel'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Il colore ___ cielo (di+il).', o: ['al', 'del', 'dal', 'nel'], a: 1, tag: 'preposition' },
      { type: 'mc', s: 'Vengo ___ mercato (da+il).', o: ['al', 'del', 'dal', 'nel'], a: 2, tag: 'preposition' },
      { type: 'mc', s: 'Il gatto è ___ giardino (in+il).', o: ['al', 'del', 'dal', 'nel'], a: 3, tag: 'preposition' },
      { type: 'mc', s: 'Parlo ___ professoressa (a+la).', o: ['alla', 'dalla', 'della', 'nella'], a: 0, tag: 'preposition' },
      { type: 'fill', s: 'Sono ___ stanza (in+la).', ans: ['nella'], tag: 'preposition' },
      { type: 'fill', s: 'Il libro ___ studente (di+lo).', ans: ['dello'], tag: 'preposition' },
      { type: 'mc', s: 'Torno ___ scuola (da+la).', o: ['alla', 'dalla', 'nella', 'sulla'], a: 1, tag: 'preposition' }
    ]
  },
  {
    id: 'it-possessivi', level: 'A1', title: 'Possessivadjektive',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'mio/tuo/suo/nostr/vostro/loro richten sich nach dem Besitz (Genus+Numerus), nicht nach dem Besitzer. Mit Artikel: il mio libro, la mia casa.',
    examples: ['il mio libro', 'la sua casa (seine/ihre)', 'i nostri amici'],
    exercises: [
      { type: 'mc', s: 'Questa è ___ casa (meine).', o: ['mio', 'mia', 'miei', 'mie'], a: 1, tag: 'agreement' },
      { type: 'mc', s: 'Dov’è ___ fratello (dein)?', o: ['tuo', 'tua', 'tuoi', 'tue'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Sono ___ amici (unsere).', o: ['nostro', 'nostra', 'nostri', 'nostre'], a: 2, tag: 'agreement' },
      { type: 'mc', s: 'È ___ sorella (seine).', o: ['suo', 'sua', 'suoi', 'sue'], a: 1, tag: 'agreement' },
      { type: 'fill', s: 'Le ___ borse (eure, f.Pl).', ans: ['vostre'], tag: 'agreement' },
      { type: 'fill', s: 'Il ___ cane (ihr, Pl-Besitzer „loro“).', ans: ['loro'], tag: 'agreement' },
      { type: 'mc', s: 'I ___ libri (meine).', o: ['mio', 'mia', 'miei', 'mie'], a: 2, tag: 'agreement' },
      { type: 'fill', s: 'La ___ idea (deine, f).', ans: ['tua'], tag: 'agreement' }
    ]
  },
  {
    id: 'it-passato-avere', level: 'A2', title: 'Passato prossimo mit avere',
    concept: 'tense', errorTag: 'tense',
    explanation: 'avere (Präs.) + Partizip Perfekt. Regelmäßig: -ato (parlare→parlato), -uto (vendere→venduto), -ito (partire→partito). Partizip bleibt unverändert.',
    examples: ['Ho mangiato una mela.', 'Hai visto il film?'],
    exercises: [
      { type: 'mc', s: 'Io ___ mangiato (mangiare).', o: ['ho', 'hai', 'sono', 'ha'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Tu ___ visto il film?', o: ['hai', 'ho', 'sei', 'ha'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Lui ___ parlato con Anna.', o: ['ha', 'ho', 'è', 'hai'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Noi ___ finito i compiti.', o: ['abbiamo', 'siamo', 'avete', 'hanno'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Partizip von „vendere“: ___', ans: ['venduto'], tag: 'tense' },
      { type: 'fill', s: 'Partizip von „scrivere“: ___', ans: ['scritto'], tag: 'spelling' },
      { type: 'fill', s: 'Loro ___ preso il treno.', ans: ['hanno'], tag: 'tense' },
      { type: 'mc', s: 'Voi ___ letto il libro?', o: ['avete', 'abbiamo', 'siete', 'hanno'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'it-passato-essere', level: 'A2', title: 'Passato prossimo mit essere (+ Angleichung)',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'Bei Bewegungsverben/Zustandsverben (andare, venire, arrivare, nascere, cadere...) steht essere. Das Partizip gleicht sich dem Subjekt an: Maria è arrivata.',
    examples: ['Sono andato/a a casa.', 'Maria è arrivata.', 'Loro sono partiti.'],
    exercises: [
      { type: 'mc', s: 'Maria ___ arrivata (arrivare).', o: ['ha', 'è', 'sono', 'hai'], a: 1, tag: 'agreement' },
      { type: 'mc', s: 'Io ___ andato a Roma (m).', o: ['ho', 'sono', 'hai', 'sei'], a: 1, tag: 'agreement' },
      { type: 'mc', s: 'Le ragazze ___ uscite.', o: ['hanno', 'sono', 'è', 'avete'], a: 1, tag: 'agreement' },
      { type: 'mc', s: 'Lui ___ nato a Napoli.', o: ['ha', 'è', 'sono', 'hai'], a: 1, tag: 'agreement' },
      { type: 'fill', s: 'Noi ___ partiti (partire).', ans: ['siamo'], tag: 'agreement' },
      { type: 'fill', s: 'Anna è ___ (uscire, f).', ans: ['uscita'], tag: 'agreement' },
      { type: 'fill', s: 'I bambini ___ caduti (cadere).', ans: ['sono'], tag: 'agreement' },
      { type: 'mc', s: 'Tu ___ venuta? (f)', o: ['hai', 'sei', 'è', 'ha'], a: 1, tag: 'agreement' }
    ]
  },
  {
    id: 'it-imperfetto', level: 'A2', title: 'Imperfetto (Vergangenheit, andauernd)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Für Gewohnheiten/Hintergrund in der Vergangenheit. -are: -avo,-avi,-ava,-avamo,-avate,-avano. -ere: -evo..., -ire: -ivo...',
    examples: ['Da bambino giocavo in giardino.', 'Leggevo ogni sera.'],
    exercises: [
      { type: 'mc', s: 'Da piccolo ___ (giocare) molto.', o: ['giocavo', 'giocai', 'gioco', 'giocava'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Noi ___ (mangiare) sempre la pasta.', o: ['mangiavamo', 'mangiammo', 'mangiamo', 'mangeremo'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Lei ___ (leggere) ogni sera.', o: ['leggeva', 'lesse', 'legge', 'leggerà'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Voi ___ (dormire) troppo.', o: ['dormivate', 'dormiste', 'dormite', 'dormirete'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Io ___ (essere) bambino.', ans: ['ero'], tag: 'tense' },
      { type: 'fill', s: 'Loro ___ (fare) i compiti.', ans: ['facevano'], tag: 'tense' },
      { type: 'fill', s: 'Tu ___ (bere) il caffè.', ans: ['bevevi'], tag: 'tense' },
      { type: 'mc', s: 'Ieri ___ (avere) fame.', o: ['avevo', 'ebbi', 'ho', 'avrò'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'it-passato-vs-imperfetto', level: 'A2', title: 'Passato prossimo vs. Imperfetto',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Passato prossimo = abgeschlossene Einzelhandlung; Imperfetto = Hintergrund/Gewohnheit. „Mentre leggevo (Imp), è arrivato (PP) Marco.“',
    examples: ['Ieri ho mangiato la pizza.', 'Mentre dormivo, ha telefonato.'],
    exercises: [
      { type: 'mc', s: 'Ieri ___ (andare) al cinema.', o: ['sono andato', 'andavo', 'andato', 'vado'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Da ragazzo ___ (correre) ogni giorno.', o: ['ho corso', 'correvo', 'corro', 'corrò'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'Mentre ___ (leggere), ha chiamato.', o: ['ho letto', 'leggevo', 'leggo', 'leggerò'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'Alle 8 ___ (svegliarsi).', o: ['mi sono svegliato', 'mi svegliavo', 'mi sveglio', 'mi sveglierò'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Un giorno ___ (trovare) un portafoglio.', ans: ['ho trovato'], tag: 'tense' },
      { type: 'fill', s: 'Sempre ___ (bere) tè a colazione.', ans: ['bevevo'], tag: 'tense' },
      { type: 'mc', s: 'Quando ___ (essere) giovane, abitavo qui.', o: ['ero', 'sono stato', 'sarò', 'sono'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Ieri ___ (finire) il lavoro alle 6.', ans: ['ho finito'], tag: 'tense' }
    ]
  },
  {
    id: 'it-pronomi-diretti', level: 'A2', title: 'Direkte Objektpronomen',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'mi, ti, lo/la, ci, vi, li/le stehen vor dem konjugierten Verb. lo/la vor Vokal → l’. Partizip gleicht sich an (l’ho vista).',
    examples: ['La vedo ogni giorno.', 'Li ho comprati ieri.'],
    exercises: [
      { type: 'mc', s: '___ vedo ogni giorno (Maria).', o: ['La', 'Lo', 'Le', 'Li'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ compro al mercato (i libri).', o: ['Li', 'Le', 'Lo', 'La'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Anna? ___ chiamo stasera.', o: ['la', 'lo', 'le', 'li'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Il libro? ___ ho letto (l’).', o: ['lo', 'l’', 'la', 'li'], a: 1, tag: 'word_order' },
      { type: 'fill', s: 'Le amiche? ___ invito (le).', ans: ['le'], tag: 'word_order' },
      { type: 'fill', s: 'Marco? ___ aspetto (lo).', ans: ['lo'], tag: 'word_order' },
      { type: 'mc', s: 'La torta ___ ho mangiata (sie).', o: ['l’', 'la', 'lo', 'le'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'I bambini ___ porto al parco (li).', ans: ['li'], tag: 'word_order' }
    ]
  },
  {
    id: 'it-pronomi-indiretti', level: 'A2', title: 'Indirekte Objektpronomen',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'mi, ti, gli/le, ci, vi, gli (ihnen) vor dem Verb. „Do il libro a Marco“ → „Gli do il libro.“',
    examples: ['Mi piace il caffè.', 'Le scrivo una mail.'],
    exercises: [
      { type: 'mc', s: '___ do il libro (a Marco).', o: ['Gli', 'Le', 'Lo', 'La'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ scrivo a Maria (ihr).', o: ['Gli', 'Le', 'La', 'Li'], a: 1, tag: 'word_order' },
      { type: 'mc', s: '___ piace la musica (mir).', o: ['Mi', 'Ti', 'Ci', 'Vi'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ telefoniamo stasera (uns).', o: ['Ci', 'Vi', 'Mi', 'Ti'], a: 0, tag: 'word_order' },
      { type: 'fill', s: '___ dici la verità (dir).', ans: ['Mi'], tag: 'word_order' },
      { type: 'fill', s: '___ mandate i saluti (euch).', ans: ['Vi'], tag: 'word_order' },
      { type: 'mc', s: 'Ai bambini ___ compro un regalo (ihnen).', o: ['gli', 'le', 'li', 'lo'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'A te ___ piace? (dir)', ans: ['ti'], tag: 'word_order' }
    ]
  },
  {
    id: 'it-ci-ne', level: 'A2', title: 'Pronomen „ci“ und „ne“',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'ci = Ort (dort) oder „ci+Verb“ (ci penso). ne = Menge/„davon“ (Ne ho tre). ne steht vor dem Verb, Partizip gleicht sich an der Menge an.',
    examples: ['Vado a Roma e ci resto due giorni.', 'Quante mele? Ne ho tre.'],
    exercises: [
      { type: 'mc', s: 'Vado a Roma e ___ resto due giorni.', o: ['ci', 'ne', 'la', 'vi'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Quante mele hai? ___ ho tre.', o: ['ci', 'ne', 'le', 'li'], a: 1, tag: 'lexis' },
      { type: 'mc', s: '___ penso sempre (ci penso).', o: ['ci', 'ne', 'lo', 'mi'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Vuoi del caffè? Sì, ___ voglio.', o: ['ci', 'ne', 'lo', 'mi'], a: 1, tag: 'lexis' },
      { type: 'fill', s: 'Quante mele hai? ___ ho tre.', ans: ['ne', 'Ne'], tag: 'lexis' },
      { type: 'mc', s: 'Delle domande? ___ ho molte.', o: ['ci', 'ne', 'le', 'la'], a: 1, tag: 'lexis' },
      { type: 'mc', s: 'Non ___ capisco niente (es).', o: ['ne', 'ci', 'lo', 'la'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'A Roma? Ci ___ vado spesso (bleiben/stare).', ans: ['vado', 'resto', 'stò'], tag: 'lexis' }
    ]
  },
  {
    id: 'it-condizionale', level: 'A2', title: 'Condizionale presente',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Für Höflichkeit/Wünsche. -are/-ere: Infinitivstamm + -ei/-esti/-ebbe/-emmo/-este/-ebbero. irreg. vorrei, vorrei, potrebbe.',
    examples: ['Vorrei un caffè.', 'Potresti aiutarmi?'],
    exercises: [
      { type: 'mc', s: '___ un caffè, per favore (volere).', o: ['Vorrei', 'Voglio', 'Volevo', 'Vorrò'], a: 0, tag: 'tense' },
      { type: 'mc', s: '___ aiutarmi? (potere)', o: ['Puoi', 'Potresti', 'Potevi', 'Potrai'], a: 1, tag: 'tense' },
      { type: 'mc', s: '___ la bistecca (volere).', o: ['Voglio', 'Vorrei', 'Volevo', 'Vorrò'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'Noi ___ venire (potere).', o: ['possiamo', 'potremmo', 'potevamo', 'potremo'], a: 1, tag: 'tense' },
      { type: 'fill', s: 'Io ___ abitare a Roma (volere).', ans: ['vorrei'], tag: 'tense' },
      { type: 'fill', s: 'Che cosa ___ tu? (fare)', ans: ['faresti'], tag: 'tense' },
      { type: 'mc', s: '___ sapere la risposta (sapere).', o: ['So', 'Saprei', 'Sapevo', 'Saprò'], a: 1, tag: 'tense' },
      { type: 'fill', s: 'Loro ___ volentieri (venire).', ans: ['verrebbero'], tag: 'tense' }
    ]
  },
  {
    id: 'it-congiuntivo', level: 'B1', title: 'Congiuntivo presente',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Nach Meinungen/Wünschen/„che“: penso che sia, spero che venga, è importante che tu studi. Regelmäßig: -i,-i,-i,-iamo,-iate,-ino.',
    examples: ['Penso che sia giusto.', 'Spero che tu stia bene.'],
    exercises: [
      { type: 'mc', s: 'Penso che lui ___ (essere) onesto.', o: ['è', 'sia', 'sarà', 'fosse'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'Spero che tu ___ (stare) bene.', o: ['stai', 'stia', 'starai', 'stavi'], a: 1, tag: 'tense' },
      { type: 'mc', s: 'È importante che voi ___ (studiare).', o: ['studiate', 'studi', 'studierete', 'studiavate'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Credo che loro ___ (avere) ragione.', o: ['hanno', 'abbiano', 'avevano', 'avranno'], a: 1, tag: 'tense' },
      { type: 'fill', s: 'Voglio che Maria ___ (venire).', ans: ['venga'], tag: 'tense' },
      { type: 'fill', s: 'Benché ___ (fare) freddo, esco.', ans: ['faccia'], tag: 'tense' },
      { type: 'mc', s: 'Penso che ___ (sapere) la verità.', o: ['sa', 'sappia', 'sapeva', 'saprà'], a: 1, tag: 'tense' },
      { type: 'fill', s: 'Spero che voi ___ (potere) venire.', ans: ['possiate'], tag: 'tense' }
    ]
  },

  // ---- A1 Erweiterungen ----
  {
    id: 'it-pronomi-soggetto', level: 'A1', title: 'Personalpronomen Subjekt',
    concept: 'agreement', errorTag: 'word_order',
    explanation: 'io, tu, lui/lei/Lei, noi, voi, loro/loro. Im Italienischen wird das Subjektpronomen oft weggelassen, weil die Verbendung es zeigt.',
    examples: ['Io sono Marco.', '(Tu) Sei italiano?', 'Loro sono amici.'],
    exercises: [
      { type: 'mc', s: '___ sono studente. (ich)', o: ['Io', 'Tu', 'Egli', 'Noi'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ sei gentile. (du)', o: ['Io', 'Tu', 'Lei', 'Voi'], a: 1, tag: 'word_order' },
      { type: 'mc', s: '___ è Maria. (sie)', o: ['Lui', 'Lei', 'Noi', 'Loro'], a: 1, tag: 'word_order' },
      { type: 'mc', s: '___ siamo italiani. (wir)', o: ['Noi', 'Voi', 'Loro', 'Tu'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ siete stanchi? (ihr)', o: ['Noi', 'Voi', 'Loro', 'Io'], a: 1, tag: 'word_order' },
      { type: 'mc', s: '___ sono partiti. (sie, Pl.)', o: ['Loro', 'Lei', 'Noi', 'Egli'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'Höflich „Sie“ (Singular) = ___', ans: ['Lei'], tag: 'word_order' },
      { type: 'mc', s: 'Welches Pronomen fehlt? ___ ho fame. (ich)', o: ['Io', 'Mi', 'Ne', 'Ci'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-negazione', level: 'A1', title: 'Verneinung mit „non“',
    concept: 'spelling', errorTag: 'spelling',
    explanation: '„non“ steht direkt vor dem Verb. Doppelte Verneinung (non ... mai/nessuno/nulla) ist im Italienischen Pflicht.',
    examples: ['Non parlo italiano.', 'Non ho mai visto Roma.', 'Non c’è nessuno.'],
    exercises: [
      { type: 'mc', s: 'Io ___ parlo tedesco.', o: ['non', 'no', 'ne', 'mai'], a: 0, tag: 'spelling' },
      { type: 'mc', s: 'Lui ___ mangia carne.', o: ['no', 'non', 'ne', 'niente'], a: 1, tag: 'spelling' },
      { type: 'mc', s: 'Non ho ___ tempo. (keine)', o: ['nessun', 'nessuna', 'nessuno', 'niente'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'Ich verstehe nichts: Non capisco ___ (nichts)', ans: ['niente', 'nulla'], tag: 'spelling' },
      { type: 'mc', s: 'Non vedo ___ (niemand).', o: ['nessuno', 'niente', 'nulla', 'mai'], a: 0, tag: 'spelling' },
      { type: 'mc', s: 'Wir gehen nie aus: ___ usciamo mai.', o: ['Non', 'No', 'Ne', 'Neanche'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'Er raucht nicht: Lui ___ fuma.', ans: ['non'], tag: 'spelling' },
      { type: 'mc', s: 'Position von „non“:', o: ['vor dem Verb', 'nach dem Verb', 'am Satzanfang immer', 'am Satzende'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-interrogativi', level: 'A1', title: 'W-Fragen (chi, che, dove, quando…)',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'chi (wer), che/che cosa (was), dove (wo), quando (wann), perché (warum), come (wie), quanto (wie viel).',
    examples: ['Come ti chiami?', 'Dove abiti?', 'Perché studi italiano?'],
    exercises: [
      { type: 'mc', s: '___ ti chiami?', o: ['Come', 'Che', 'Chi', 'Dove'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ abiti?', o: ['Dove', 'Quando', 'Perché', 'Chi'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ studi italiano? (warum)', o: ['Perché', 'Quando', 'Come', 'Che'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ è quella donna? (wer)', o: ['Chi', 'Che', 'Cosa', 'Quale'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '___ costa? (wie viel)', o: ['Quanto', 'Quanti', 'Quante', 'Quanta'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'Wann kommst du? = ___ vieni?', ans: ['Quando'], tag: 'word_order' },
      { type: 'fill', s: 'Was machst du? = Che ___ fai?', ans: ['cosa'], tag: 'word_order' },
      { type: 'mc', s: '___ sei venuto? (wie)', o: ['Come', 'Quanto', 'Chi', 'Dove'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-c-e-ci-sono', level: 'A1', title: 'es gibt: c’è / ci sono',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'c’è für Singular (es gibt einen/eine), ci sono für Plural (es gibt mehrere).',
    examples: ['C’è un bar qui.', 'Ci sono due caffè.', 'C’è latte?'],
    exercises: [
      { type: 'mc', s: '___ un problema.', o: ['C’è', 'Ci sono', 'C’', 'Ci è'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '___ molti studenti.', o: ['Ci sono', 'C’è', 'C’', 'È'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '___ una tavola.', o: ['C’è', 'Ci sono', 'Sono', 'È'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'Es gibt drei Bücher: ___ sono tre libri.', ans: ['Ci'], tag: 'agreement' },
      { type: 'mc', s: '___ acqua? (Singular)', o: ['C’è', 'Ci sono', 'Sono', 'Ha'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '___ due fratelli.', o: ['Ci sono', 'C’è', 'C’', 'Ha'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'Es gibt einen Hund: ___ è un cane.', ans: ['C’', 'C’'], tag: 'agreement' },
      { type: 'mc', s: 'Pluralform von „es gibt“:', o: ['ci sono', 'c’è', 'vi è', 'ne sono'], a: 0, tag: 'agreement' }
    ]
  },
  {
    id: 'it-dimostrativi', level: 'A1', title: 'Demonstrativpronomen (questo, quello)',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'questo/questa/questi/queste (dies-), quello/quella/quei/gli… (jene-). Richten sich nach Genus und Numerus.',
    examples: ['Questo libro è mio.', 'Questa casa è grande.', 'Quei ragazzi sono amici.'],
    exercises: [
      { type: 'mc', s: '___ libro è interessante. (m.Sg)', o: ['Questo', 'Questa', 'Questi', 'Queste'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '___ casa è bella. (f.Sg)', o: ['Questo', 'Questa', 'Questi', 'Queste'], a: 1, tag: 'agreement' },
      { type: 'mc', s: '___ libri sono nuovi. (m.Pl)', o: ['Questo', 'Questa', 'Questi', 'Queste'], a: 2, tag: 'agreement' },
      { type: 'mc', s: '___ amiche sono simpatiche. (f.Pl)', o: ['Questo', 'Questa', 'Questi', 'Queste'], a: 3, tag: 'agreement' },
      { type: 'fill', s: 'jene Frau (f.Sg) = ___ donna', ans: ['quella'], tag: 'agreement' },
      { type: 'mc', s: 'jene Kinder (m.Pl): ___ bambini', o: ['quei', 'quello', 'quella', 'quel'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'dieses (m.Sg vor Konsonant) = ___ libro', ans: ['questo'], tag: 'agreement' },
      { type: 'mc', s: 'Form für „quel“ vor „z“:', o: ['quello', 'quel', 'quei', 'gli'], a: 0, tag: 'agreement' }
    ]
  },
  {
    id: 'it-avverbi-frequenza', level: 'A1', title: 'Häufigkeitsadverbien',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'sempre (immer), spesso (oft), a volte/qualche volta (manchmal), raramente (selten), mai (nie). Meist nach dem konjugierten Verb.',
    examples: ['Mangio sempre la pasta.', 'Vado spesso al cinema.', 'Non mangio mai carne.'],
    exercises: [
      { type: 'mc', s: 'Ich gehe immer spazieren: Vado ___ a piedi.', o: ['sempre', 'mai', 'raramente', 'spesso'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'nie: Non studio ___.', o: ['mai', 'sempre', 'spesso', 'volentieri'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'oft: ___ leggo.', o: ['Spesso', 'Mai', 'Raramente', 'Poco'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'selten: ___ esco.', o: ['Raramente', 'Sempre', 'Spesso', 'Mai'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'manchmal: ___ volta vado al mare (a ___ volta)', ans: ['volte'], tag: 'word_order' },
      { type: 'mc', s: 'Position: „sempre“ steht meist', o: ['nach dem Verb', 'vor dem Subjekt', 'am Satzende', 'nach dem Objekt'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'gern: mangio ___ (volentieri)', ans: ['volentieri'], tag: 'word_order' },
      { type: 'mc', s: 'Gegenteil von „sempre“:', o: ['mai', 'spesso', 'sempre', 'bene'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-verbi-riflessivi', level: 'A1', title: 'Reflexive Verben (chiamarsi, alzarsi)',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'Reflexivpronomen: mi, ti, si, ci, vi, si + Verb. z.B. chiamarsi, alzarsi, lavarsi, addormentarsi.',
    examples: ['Mi chiamo Anna.', 'Ti alzi presto.', 'Si lava le mani.'],
    exercises: [
      { type: 'mc', s: '___ chiamo Luca. (ich)', o: ['Mi', 'Ti', 'Si', 'Ci'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Come ___ chiami? (du)', o: ['ti', 'mi', 'si', 'vi'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Lei ___ chiama Maria.', o: ['si', 'mi', 'ti', 'ci'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Noi ___ svegliamo alle 7.', o: ['ci', 'si', 'vi', 'mi'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Voi ___ lavate le mani.', o: ['vi', 'ci', 'si', 'ti'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'Er schläft ein: Lui ___ addormenta.', ans: ['si'], tag: 'agreement' },
      { type: 'fill', s: 'Ich wasche mich: Io ___ lavo.', ans: ['mi'], tag: 'agreement' },
      { type: 'mc', s: 'Loro ___ incontrano.', o: ['si', 'li', 'ne', 'ci'], a: 0, tag: 'agreement' }
    ]
  },
  {
    id: 'it-numerali', level: 'A1', title: 'Zahlen und Datum',
    concept: 'spelling', errorTag: 'spelling',
    explanation: 'Cardinalzahlen sind unveränderlich (tranne uno). „il“ + Datum, „a“ + Monat/Jahr. Monate sind klein (gennaio…).',
    examples: ['Sono il 5 maggio.', 'Siamo nel 2026.', 'Ho vent’anni.'],
    exercises: [
      { type: 'mc', s: 'Heute ist der 3. Juni: Oggi è ___ 3 giugno.', o: ['il', 'a', 'in', 'del'], a: 0, tag: 'spelling' },
      { type: 'mc', s: 'im Jahr 2026: ___ 2026', o: ['nel', 'il', 'a', 'di'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'zwanzig = ___', ans: ['venti'], tag: 'spelling' },
      { type: 'mc', s: 'Monate schreibt man', o: ['klein', 'groß', 'kursiv', 'mit Punkt'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'hundert = ___', ans: ['cento'], tag: 'spelling' },
      { type: 'mc', s: 'Ich bin am 1. Mai geboren: Sono nato ___ 1 maggio.', o: ['il', 'a', 'in', 'di'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'tausend = ___', ans: ['mille'], tag: 'spelling' },
      { type: 'mc', s: 'Plural von „mille“:', o: ['mila', 'mille', 'milli', 'millesimo'], a: 0, tag: 'spelling' }
    ]
  },

  // ---- A2 Erweiterungen ----
  {
    id: 'it-futuro-semplice', level: 'A2', title: 'Futuro semplice',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Futur der regelmäßigen Verben: -erò, -erai, -erà, -eremo, -erete, -eranno (parlare→parlerò). Unregelmäßige Stämme: avr-, sar-, far-,andr-, vorr-, potr-, dovr-, vedr-.',
    examples: ['Domani parlerò con Luca.', 'Sarò a casa alle 8.', 'Andremo al mare.'],
    exercises: [
      { type: 'mc', s: 'Domani ___ (parlare) con Anna.', o: ['parlerò', 'parlo', 'parlavo', 'parlato'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Noi ___ (essere) pronti.', o: ['saremo', 'siamo', 'eravamo', 'siamo stati'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Loro ___ (andare) a Roma.', o: ['andranno', 'vanno', 'andavano', 'andati'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'io avere (Futur) = io ___', ans: ['avrò', 'avro'], tag: 'tense' },
      { type: 'mc', s: 'Tu ___ (fare) bene.', o: ['farai', 'fai', 'facevi', 'fatto'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'io potere (Futur) = io ___', ans: ['potrò', 'potro'], tag: 'tense' },
      { type: 'mc', s: 'Voi ___ (vedere) il film.', o: ['vedrete', 'vedete', 'vedevate', 'visto'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'io volere (Futur) = io ___', ans: ['vorrò', 'vorro'], tag: 'tense' }
    ]
  },
  {
    id: 'it-trapassato-prossimo', level: 'A2', title: 'Trapassato prossimo',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Vorvergangenheit: imperfetto von essere/avere + participio passato. Drückt ein früheres Ereignis relativ zu einem anderen aus.',
    examples: ['Quando sono arrivato, aveva già mangiato.', 'Non avevo mai visto il mare.'],
    exercises: [
      { type: 'mc', s: 'Quando sono arrivato, loro ___ (partire).', o: ['erano partiti', 'sono partiti', 'partivano', 'partirono'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Non ___ (avere) mai visto Roma.', o: ['avevo', 'ho', 'ebbi', 'avrò'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Er war schon gegangen: Lui ___ già andato.', ans: ['era'], tag: 'tense' },
      { type: 'mc', s: 'Dopo che ___ (finire), siamo usciti.', o: ['avevamo finito', 'abbiamo finito', 'finivamo', 'finimmo'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'io + avere + visto = io ___ visto', ans: ['avevo'], tag: 'tense' },
      { type: 'mc', s: 'Weil sie müde ___ (essere), sono andati a letto.', o: ['erano', 'sono', 'furono', 'saranno'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'sie (Pl.) hatten gegessen: loro ___ mangiato', ans: ['avevano'], tag: 'tense' },
      { type: 'mc', s: 'Hilfsverb des Trapassato:', o: ['imperfetto di essere/avere', 'passato remoto', 'presente', 'condizionale'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'it-comparativi', level: 'A2', title: 'Komparativ (più … di/che)',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'più … di (als) beim Vergleich von Substantiven/Zahlen; più … che bei Adjektiven oder „che“ vor „di“+Pronomen. irreg.: migliore, peggiore, maggiore, minore.',
    examples: ['Marco è più alto di Luca.', 'È più intelligente che onesto.', 'Questo è migliore.'],
    exercises: [
      { type: 'mc', s: 'La casa è più grande ___ la macchina.', o: ['di', 'che', 'da', 'a'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'È più stanco ___ felice.', o: ['che', 'di', 'da', 'per'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'besser = ___ (irreg. Komparativ)', ans: ['migliore'], tag: 'lexis' },
      { type: 'fill', s: 'schlechter = ___ (irreg.)', ans: ['peggiore'], tag: 'lexis' },
      { type: 'mc', s: 'Er ist größer als ich: È più alto ___ me.', o: ['di', 'che', 'da', 'del'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'mehr … als (Zahl): più studenti ___ professori', o: ['che', 'di', 'da', 'a'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'größer/mehr (irreg.) = ___', ans: ['maggiore'], tag: 'lexis' },
      { type: 'mc', s: 'kleiner/weniger (irreg.):', o: ['minore', 'piccolo', 'meno', 'peggiore'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-superlativo', level: 'A2', title: 'Superlativ (il più / -issimo)',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'Relativ: il più/la meno + Adjektiv. Absolut: Adjektiv-Stamm + -issimo (fortissimo). irreg.: ottimo, pessimo, massimo, minimo.',
    examples: ['È il più alto della classe.', 'Un caffè ottimo.', 'Sono stanchissimo.'],
    exercises: [
      { type: 'mc', s: 'Er ist der Größte: È ___ più alto.', o: ['il', 'lo', 'la', 'i'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Sie ist die Klügste: È ___ più intelligente.', o: ['la', 'il', 'le', 'lo'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'sehr stark = forte → for___', ans: ['tissimo'], tag: 'agreement' },
      { type: 'fill', s: 'sehr gut (irreg.) = ___', ans: ['ottimo'], tag: 'lexis' },
      { type: 'fill', s: 'sehr schlecht (irreg.) = ___', ans: ['pessimo'], tag: 'lexis' },
      { type: 'mc', s: 'das Maximum (irreg.):', o: ['massimo', 'più grande', 'ottimo', 'maggiorissimo'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Sie ist am müdesten: È la ___ stanca.', o: ['più', 'molto', 'assai', 'meno'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'sehr klein (irreg.) = ___', ans: ['minimo'], tag: 'lexis' }
    ]
  },
  {
    id: 'it-pronomi-relativi-che-cui', level: 'A2', title: 'Relativpronomen che / cui',
    concept: 'word_order', errorTag: 'word_order',
    explanation: '„che“ = Subjekt oder direktes Objekt (der/die/das). „cui“ = nach Präposition (mit dem, in dem, für den) oder Besitz (il cui).',
    examples: ['L’uomo che parla è mio padre.', 'La donna con cui esco.', 'Il libro di cui parlo.'],
    exercises: [
      { type: 'mc', s: 'Il ragazzo ___ studia è bravo.', o: ['che', 'cui', 'chi', 'quale'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'La persona con ___ lavoro.', o: ['cui', 'che', 'chi', 'la'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Il film ___ ho visto.', o: ['che', 'cui', 'chi', 'dove'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'der Mann, mit dem… = l’uomo ___ cui…', ans: ['con'], tag: 'word_order' },
      { type: 'mc', s: '„cui“ benutzt man vor allem', o: ['nach Präpositionen', 'als Subjekt', 'nur für Personen', 'nur für Dinge'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'La casa ___ abito è grande.', o: ['in cui', 'che', 'cui', 'dove'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'das Buch, über das… = il libro ___ cui parlo', ans: ['di'], tag: 'word_order' },
      { type: 'mc', s: '„che“ kann sein:', o: ['Subjekt oder direktes Objekt', 'nur Objekt', 'nur Subjekt', 'nur nach Präposition'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-imperativo', level: 'A2', title: 'Imperativ (tu, Lei, noi, voi)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'tu: Infinitiv-Stamm (parla!, mangia!). Lei (höflich): Congiuntivo (parli!, mangi!). noi: -iamo. voi: wie Präsens ohne -e (parlate!). Verneint: „non“ + Infinitiv.',
    examples: ['Parla più piano!', 'Mi dica la verità.', 'Non parlare!'],
    exercises: [
      { type: 'mc', s: 'Sprich! (tu) = ___!', o: ['Parla', 'Parli', 'Parlate', 'Parlano'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Sprechen Sie! (Lei) = ___!', o: ['Parli', 'Parla', 'Parlate', 'Parla tu'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Essen Sie! (Lei, mangiare) = ___!', o: ['Mangi', 'Mangia', 'Mangiate', 'Mangio'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Komm! (tu, venire) = ___!', ans: ['Vieni'], tag: 'tense' },
      { type: 'mc', s: 'Nicht sprechen! (tu) = ___ parlare!', o: ['non', 'non parlare', 'no', 'ne'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Sei so gut! (Lei, essere) = ___ gentile!', ans: ['Sia'], tag: 'tense' },
      { type: 'mc', s: 'Kommt! (voi, venire)', o: ['Venite', 'Venga', 'Vieni', 'Vengano'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Geh! (tu, andare) = ___!', ans: ['Vai', 'Va’'], tag: 'tense' }
    ]
  },
  {
    id: 'it-verbi-modali', level: 'A2', title: 'Modalverben (dovere, potere, volere)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'dovere (müssen/sollen), potere (können), volere (wollen) + Infinitiv. Häufige Formen: devo, puoi, vuole, possiamo, dovete.',
    examples: ['Devo studiare.', 'Puoi aiutarmi?', 'Vogliamo partire.'],
    exercises: [
      { type: 'mc', s: 'Ich muss gehen: Io ___ andare.', o: ['devo', 'devi', 'deve', 'dobbiamo'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Kannst du? ___ tu aiutarmi?', o: ['Puoi', 'Può', 'Possiamo', 'Potete'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Er will kommen: Lui ___ venire.', o: ['vuole', 'voglio', 'vuoi', 'vogliono'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'wir können = noi ___', ans: ['possiamo'], tag: 'tense' },
      { type: 'fill', s: 'ihr müsst = voi ___', ans: ['dovete'], tag: 'tense' },
      { type: 'mc', s: 'Nach Modalverb folgt das Verb im', o: ['Infinitiv', 'Konjunktiv', 'Futur', 'Partizip'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Sie (Lei) möchte: ___ un caffè.', o: ['Vuole', 'Voglio', 'Vuoi', 'Vogliono'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'ich kann = io ___', ans: ['posso'], tag: 'tense' }
    ]
  },
  {
    id: 'it-si-passivante', level: 'A2', title: 'si passivante / si impersonale',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'si + Verb ersetzt das Passiv, wenn kein Agens genannt wird. „si vende“ (es wird verkauft), „si vive bene“ (man lebt gut). Verb richtet sich nach dem Objekt.',
    examples: ['Si vendono case.', 'Qui si mangia bene.', 'Si parla italiano.'],
    exercises: [
      { type: 'mc', s: 'Hier wird gut gegessen: Qui ___ mangia bene.', o: ['si', 'ci', 'ne', 'vi'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Es werden Häuser verkauft: ___ vendono case.', o: ['Si', 'Ci', 'Ne', 'Le'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'Man spricht Italienisch: ___ parla italiano.', o: ['Si', 'Ci', 'Ne', 'Lo'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'Es werden Bücher gelesen: Si ___ libri (leggere, Pl.)', ans: ['leggono'], tag: 'agreement' },
      { type: 'mc', s: 'Bei Plural-Objekt steht das Verb im', o: ['Plural', 'Singular', 'Konjunktiv', 'Futur'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '„Si vendono“ – „vendono“ weil', o: ['„case“ Plural ist', 'es Futur ist', 'es Konjunktiv ist', 'Fehler'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'Man lebt hier gut: Qui ___ vive bene.', ans: ['si'], tag: 'agreement' },
      { type: 'mc', s: 'si passivante ersetzt meist', o: ['das Passiv', 'das Futur', 'den Konjunktiv', 'den Imperativ'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-pronomi-combinati', level: 'A2', title: 'Kombinierte Pronomen (glielo)',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'Indirektes + direktes Pronomen verschmelzen: mi+lo→melo, ti+lo→telo, gli+lo→glielo, ci+lo→celo, vi+lo→velo. Direktes Pronomen wird zu lo/la/li/le.',
    examples: ['Lo dai a Marco → Glielo dai.', 'La scrivo a te → Te la scrivo.'],
    exercises: [
      { type: 'mc', s: 'Gib es ihm! = ___ dai!', o: ['Glielo', 'Lo gli', 'Gli lo', 'Lelo'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Ich schreibe sie dir: ___ scrivo.', o: ['Te la', 'Ti la', 'La ti', 'Gliela'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'mi + lo = ___', ans: ['melo'], tag: 'word_order' },
      { type: 'fill', s: 'ci + lo = ___', ans: ['celo'], tag: 'word_order' },
      { type: 'mc', s: 'Er kauft sie uns: ___ compra.', o: ['Ce le', 'Ci le', 'Le ci', 'Cele'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Bei Kombination wird das direkte Pronomen zu', o: ['lo/la/li/le', 'mi/ti/si', 'ne', 'ci'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'vi + lo = ___', ans: ['velo'], tag: 'word_order' },
      { type: 'mc', s: 'Position der Pronomen-Kombination:', o: ['vor dem Verb', 'nach dem Verb', 'am Satzende', 'vor dem Subjekt'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-partitivo-ne', level: 'A2', title: 'Partitivpronomen „ne“',
    concept: 'lexis', errorTag: 'lexis',
    explanation: '„ne“ ersetzt „di + Zahl/Menge“ (davon, davon welche). Steht vor dem konjugierten Verb, bei Zahlen bleibt das Verb ohne Angleichung.',
    examples: ['Quante mele vuoi? Ne voglio tre.', 'Hai fratelli? Sì, ne ho due.'],
    exercises: [
      { type: 'mc', s: 'Ich habe zwei (davon): ___ ho due.', o: ['Ne', 'Li', 'Ci', 'Lo'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Möchtest du welche? ___ vuoi?', o: ['Ne', 'Li', 'Lo', 'Ci'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Ich brauche viel: Io ___ ho bisogno (brauchen = aver bisogno)', ans: ['ne'], tag: 'lexis' },
      { type: 'mc', s: '„ne“ ersetzt', o: ['di + Menge/Zahl', 'das Subjekt', 'nur Personen', 'den Ort'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Hast du Brüder? Ja, ___ ho due.', o: ['ne', 'li', 'ci', 'gli'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Ich spreche davon: Io ___ parlo.', ans: ['ne'], tag: 'lexis' },
      { type: 'mc', s: 'Position von „ne“:', o: ['vor dem konjugierten Verb', 'nach dem Verb', 'am Satzende', 'vor dem Subjekt'], a: 0, tag: 'word_order' },
      { type: 'mc', s: '„Ne voglio tre“ – „voglio“ bleibt', o: ['ohne Angleichung', 'im Plural', 'im Konjunktiv', 'im Futur'], a: 0, tag: 'agreement' }
    ]
  },
  {
    id: 'it-avverbi-modi', level: 'A2', title: 'Art-Adverbien und -mente',
    concept: 'spelling', errorTag: 'spelling',
    explanation: 'Adverbien auf -mente entstehen aus der femininen Adjektivform + -mente (lento→lentamente, veloce→velocemente). Unregelmäßig: bene, male, spesso, forte.',
    examples: ['Parla lentamente.', 'Guida velocemente.', 'Canta bene.'],
    exercises: [
      { type: 'fill', s: 'langsam (lento) → lento___', ans: ['mente'], tag: 'spelling' },
      { type: 'fill', s: 'gut (irreg.) = ___', ans: ['bene'], tag: 'lexis' },
      { type: 'fill', s: 'schlecht (irreg.) = ___', ans: ['male'], tag: 'lexis' },
      { type: 'mc', s: 'schnell = ___', o: ['velocemente', 'veloce', 'velocità', 'veloci'], a: 0, tag: 'spelling' },
      { type: 'mc', s: 'Bildung von -mente-Adverbien:', o: ['feminine Adjektivform + mente', 'maskuline Form + mente', 'Infinitiv + mente', 'Plural + mente'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'deutlich (chiaro) → chiara___', ans: ['mente'], tag: 'spelling' },
      { type: 'mc', s: 'stark/laut (irreg. Adverb):', o: ['forte', 'fortemente', 'forti', 'forza'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„bene“ ist das Adverb von', o: ['buono', 'bello', 'buona', 'benissimo'], a: 0, tag: 'lexis' }
    ]
  },

  // ---- B1 Erweiterungen ----
  {
    id: 'it-congiuntivo-passato', level: 'B1', title: 'Congiuntivo passato',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Congiuntivo presente von essere/avere + participio passato. Drückt Vorzeitigkeit im Konjunktiv aus (nach Hauptsatz in Gegenwart/Zukunft).',
    examples: ['Credo che abbia finito.', 'Non penso che siano venuti.'],
    exercises: [
      { type: 'mc', s: 'Ich glaube, er hat es getan: Credo che lo ___ fatto.', o: ['abbia', 'ha', 'avesse', 'ebbe'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Ich glaube nicht, dass sie gekommen sind: Non credo che ___ venuti.', o: ['siano', 'sono', 'erano', 'furono'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Er hat gearbeitet (Konj. Verg.): che lui ___ lavorato', ans: ['abbia'], tag: 'tense' },
      { type: 'mc', s: 'Wir denken, sie haben gegessen: Pensiamo che ___ mangiato.', o: ['abbiano', 'hanno', 'avevano', 'ebbero'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'dass sie (Pl.) gegangen sind: che loro ___ andati', ans: ['siano'], tag: 'tense' },
      { type: 'mc', s: 'Bildung des Cong. passato:', o: ['cong. presente essere/avere + part.', 'imperfetto + part.', 'passato remoto', 'futur'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Spero che tu ___ (venire).', o: ['sia venuto', 'sei venuto', 'eri venuto', 'fosti venuto'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'dass ich es gesehen habe: che io l’___ visto', ans: ['abbia'], tag: 'tense' }
    ]
  },
  {
    id: 'it-congiuntivo-imperfetto', level: 'B1', title: 'Congiuntivo imperfetto',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Gleichzeitigkeit/Nachzeitigkeit, wenn der Hauptsatz in der Vergangenheit steht. Endungen: -ssi, -ssi, -sse, -ssimo, -ste, -ssero.',
    examples: ['Volevo che tu venissi.', 'Pensavo che fosse vero.'],
    exercises: [
      { type: 'mc', s: 'Ich wollte, dass du kommst: Volevo che tu ___ (venire).', o: ['venissi', 'venga', 'veniste', 'venite'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Ich dachte, es sei wahr: Pensavo che ___ (essere) vero.', o: ['fosse', 'sia', 'era', 'fu'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Er wollte, dass sie (Pl.) kämen: voleva che loro ___ (venire)', ans: ['venissero'], tag: 'tense' },
      { type: 'mc', s: 'Endung 1. Pers. Sg. Cong. imperfetto:', o: ['-ssi', '-re', '-vo', '-va'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Sie glaubte, ich wisse es: credeva che io lo ___ (sapere)', ans: ['sapessi'], tag: 'tense' },
      { type: 'mc', s: 'Wir wollten, ihr bliebt: Volevamo che voi ___ (restare).', o: ['restaste', 'restiate', 'restavate', 'restassi'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Cong. imperfetto nutzt man, wenn der Hauptsatz', o: ['in der Vergangenheit steht', 'in der Gegenwart steht', 'im Futur steht', 'ein Befehl ist'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'er wäre (cong. imperf. essere) = che lui ___', ans: ['fosse'], tag: 'tense' }
    ]
  },
  {
    id: 'it-periodo-ipotetico', level: 'B1', title: 'Konditionalsätze (Periodo ipotetico)',
    concept: 'tense', errorTag: 'tense',
    explanation: '1. Typ (real): se + Indikativ, Indikativ/Futur. 2. Typ (möglich): se + Congiuntivo, Condizionale presente. 3. Typ (unwirklich): se + Congiuntivo imperfetto, Condizionale passato.',
    examples: ['Se piove, resto a casa.', 'Se avessi tempo, viaggerei.', 'Se avessi saputo, sarei venuto.'],
    exercises: [
      { type: 'mc', s: 'Wenn ich Zeit hätte, würde ich reisen: Se ___ tempo, viaggerei.', o: ['avessi', 'ho', 'avrò', 'avrei'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Wenn es regnet, bleibe ich: Se piove, ___ a casa.', o: ['resto', 'resterei', 'restassi', 'restavo'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Wenn ich es gewusst hätte, wäre ich gekommen: Se lo ___, sarei venuto.', o: ['avessi saputo', 'ho saputo', 'seppi', 'sapevo'], a: 0, tag: 'tense' },
      { type: 'fill', s: '2. Typ: se + ___ (Modus)', ans: ['congiuntivo'], tag: 'tense' },
      { type: 'mc', s: 'Wenn du kämest, wäre ich glücklich: Se tu ___, sarei felice.', o: ['venissi', 'vieni', 'verrai', 'verresti'], a: 0, tag: 'tense' },
      { type: 'fill', s: '3. Typ Hauptsatz: Condizionale ___', ans: ['passato'], tag: 'tense' },
      { type: 'mc', s: 'Wenn ich reich wäre, würde ich kaufen: Se fossi ricco, ___ una casa.', o: ['comprerei', 'compro', 'comprassi', 'comprerò'], a: 0, tag: 'tense' },
      { type: 'fill', s: '1. Typ (real) braucht im Wenn-Satz den ___', ans: ['indicativo', 'indicativ'], tag: 'tense' }
    ]
  },
  {
    id: 'it-discorso-indiretto', level: 'B1', title: 'Indirekte Rede',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Bei „dire/chiedere che…“ richtet sich das Tempus nach dem einleitenden Verb. Präsens→Präsens; Vergangenheit→Konjunktiv/condizionale. Pronomen und Zeitangaben anpassen.',
    examples: ['Dice che viene. → Ha detto che veniva.', 'Chiede dove abiti. → Ha chiesto dove abitassi.'],
    exercises: [
      { type: 'mc', s: 'Er sagt, er kommt: Dice che ___ (venire).', o: ['viene', 'venisse', 'verrebbe', 'veniva'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Er sagte, er käme: Ha detto che ___ (venire).', o: ['veniva', 'viene', 'verrà', 'venne'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Sie fragt, wo du wohnst: Chiede dove ___ (abitare).', o: ['abiti', 'abitassi', 'abitavi', 'abiterai'], a: 0, tag: 'tense' },
      { type: 'fill', s: '„oggi“ wird in der indirekten Rede oft zu ___', ans: ['quel giorno'], tag: 'word_order' },
      { type: 'mc', s: 'Nach „ha chiesto se…“ folgt oft', o: ['Konjunktiv/Indikativ Vergangenheit', 'Futur', 'Imperativ', 'Infinitiv'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Er fragte, ob ich komme: Ha chiesto se ___ (venire)', ans: ['venissi', 'venivo'], tag: 'tense' },
      { type: 'mc', s: '„domani“ in der Vergangenheit wird zu', o: ['il giorno dopo', 'domani', 'ieri', 'adesso'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Einleitende Verben der indirekten Rede:', o: ['dire, chiedere, pensare', 'essere, avere', 'andare, venire', 'mangiare, bere'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-passivo', level: 'B1', title: 'Passiv (essere + participio)',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'Passiv mit essere + participio passato (Angleichung!) + „da“ für den Handelnden. „venire“ nur bei einfachen Zeiten, „andare“ + Infinitiv für Notwendigkeit.',
    examples: ['La lettera è scritta da Marco.', 'Il film è stato visto da tutti.', 'La casa va venduta.'],
    exercises: [
      { type: 'mc', s: 'Der Brief wird geschrieben: La lettera ___ scritta.', o: ['è', 'ha', 'viene', 'va'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'von (Handelnder) =', o: ['da', 'di', 'a', 'per'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Das Haus wurde verkauft: La casa ___ venduta.', o: ['è stata', 'ha stato', 'è', 'venne'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'Das Haus muss verkauft werden: La casa ___ venduta (andare+inf.)', ans: ['va'], tag: 'tense' },
      { type: 'mc', s: 'Partizip im Passiv richtet sich nach', o: ['dem Subjekt (Genus/Numerus)', 'dem Objekt', 'dem Agens', 'dem Verb'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '„venire“ im Passiv nutzt man', o: ['bei einfachen Zeiten', 'nur im Perfekt', 'nie', 'nur im Plural'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Die Bücher sind gelesen: I libri sono ___ (leggere)', ans: ['letti'], tag: 'agreement' },
      { type: 'mc', s: 'Das Essen wurde von Anna gekocht: da Anna', o: ['da', 'di', 'a', 'per'], a: 0, tag: 'preposition' }
    ]
  },
  {
    id: 'it-gerundio', level: 'B1', title: 'Gerundio (und perifrasi stare + gerundio)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Gerund: -ando (parlare→parlando), -endo (credere→credendo), -endo (partire→partendo). irreg.: facendo, dicendo, bevendo, ridendo. „stare + gerundio“ = Verlauf in diesem Moment.',
    examples: ['Sta piovendo.', 'Sto leggendo un libro.', 'Parlando si impara.'],
    exercises: [
      { type: 'mc', s: 'Er liest gerade: Sta ___ (leggere).', o: ['leggendo', 'legge', 'letto', 'leggeva'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'sprechend (parlare) = parl___', ans: ['ando'], tag: 'tense' },
      { type: 'fill', s: 'tuend (credere) = cred___', ans: ['endo'], tag: 'tense' },
      { type: 'mc', s: 'machend (irreg.) =', o: ['facendo', 'farendo', 'fatto', 'faceva'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„stare + gerundio“ drückt aus', o: ['Verlauf in diesem Moment', 'Vergangenheit', 'Zukunft', 'Wunsch'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'trinkend (irreg., bere) = b___', ans: ['bevendo'], tag: 'tense' },
      { type: 'mc', s: 'Sie geht gerade: Sta ___ (andare).', o: ['andando', 'va', 'andato', 'andava'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'sagend (irreg., dire) = d___', ans: ['dicendo'], tag: 'tense' }
    ]
  },
  {
    id: 'it-participio-passato', level: 'B1', title: 'Participio passato (regelm./unregelm.)',
    concept: 'spelling', errorTag: 'spelling',
    explanation: 'Regelmäßig: -ato, -uto, -ito. Viele Unregelmäßige: fare→fatto, dire→detto, scrivere→scritto, leggere→letto, vedere→visto, prendere→preso, andare→andato.',
    examples: ['Ho mangiato una pizza.', 'Ho scritto una lettera.', 'Ho visto quel film.'],
    exercises: [
      { type: 'fill', s: 'machen (fare) → ___', ans: ['fatto'], tag: 'spelling' },
      { type: 'fill', s: 'schreiben (scrivere) → ___', ans: ['scritto'], tag: 'spelling' },
      { type: 'fill', s: 'sehen (vedere) → ___', ans: ['visto'], tag: 'spelling' },
      { type: 'mc', s: 'lesen (leggere) →', o: ['letto', 'legguto', 'leggo', 'leggeva'], a: 0, tag: 'spelling' },
      { type: 'mc', s: 'regelmäßige Endung -ere-Verben:', o: ['-uto', '-ato', '-ito', '-uto/-ito gemischt'], a: 0, tag: 'spelling' },
      { type: 'fill', s: 'nehmen (prendere) → ___', ans: ['preso'], tag: 'spelling' },
      { type: 'fill', s: 'gehen (andare) → ___', ans: ['andato'], tag: 'spelling' },
      { type: 'mc', s: 'sagen (dire) →', o: ['detto', 'dito', 'diceva', 'dire'], a: 0, tag: 'spelling' }
    ]
  },
  {
    id: 'it-futuro-anteriore', level: 'B1', title: 'Futuro anteriore',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Futur II: futuro von essere/avere + participio passato. Drückt Vorzeitigkeit in der Zukunft aus, oft mit „quando/dopo che“.',
    examples: ['Quando avrò finito, uscirò.', 'Dopo che saremo arrivati, chiameremo.'],
    exercises: [
      { type: 'mc', s: 'Wenn ich fertig bin, gehe ich: Quando ___ finito, uscirò.', o: ['avrò', 'ho', 'avevo', 'ebbi'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Nachdem wir angekommen sind: Dopo che ___ arrivati, …', o: ['saremo', 'siamo', 'eravamo', 'fummo'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Wenn er gegessen haben wird: quando lui ___ mangiato', ans: ['avrà'], tag: 'tense' },
      { type: 'mc', s: 'Futuro anteriore drückt', o: ['Vorzeitigkeit in der Zukunft', 'Vergangenheit', 'Gegenwart', 'Wunsch'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Wenn sie (Pl.) gegangen sein werden: quando loro ___ andati', ans: ['saranno'], tag: 'tense' },
      { type: 'mc', s: 'Bildung:', o: ['futuro essere/avere + part.', 'imperfetto + part.', 'cong. + part.', 'cond. + inf.'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Quando ___ (finire) il lavoro, ti chiamo.', o: ['avrò finito', 'ho finito', 'finirò', 'finivo'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'oft mit „___ che“ (nachdem)', ans: ['dopo'], tag: 'word_order' }
    ]
  },
  {
    id: 'it-condizionale-passato', level: 'B1', title: 'Condizionale passato',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Condizionale presente von essere/avere + participio passato. Drückt Abgeschlossenes unter einer Bedingung oder höfliche Vergangenheit aus.',
    examples: ['Sarei venuto, ma ero occupato.', 'Avrei voluto partire.'],
    exercises: [
      { type: 'mc', s: 'Ich wäre gekommen: Io ___ venuto.', o: ['sarei', 'sono', 'ero', 'verrei'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Er hätte gekauft: Lui ___ comprato.', o: ['avrebbe', 'ha', 'aveva', 'ebbe'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'wir hätten gegessen: noi ___ mangiato', ans: ['avremmo'], tag: 'tense' },
      { type: 'mc', s: 'Bildung:', o: ['cond. presente essere/avere + part.', 'cong. + part.', 'futuro + part.', 'imperfetto + part.'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'sie wäre gekommen: lei ___ venuta', ans: ['sarebbe'], tag: 'tense' },
      { type: 'mc', s: 'Ich hätte es gesagt: ___ detto.', o: ['Avrei', 'Ho', 'Avevo', 'Dirò'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Condizionale passato nutzt man oft', o: ['in Bedingungssätzen 3. Typ', 'im Präsens', 'im Imperativ', 'für Gewohnheiten'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'ihr hättet gesehen: voi ___ visto', ans: ['avreste'], tag: 'tense' }
    ]
  },
  {
    id: 'it-perifrasi-verbali', level: 'B1', title: 'Verbperiphrasen (stare per, stare per, andare a)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'stare per + Infinitiv (im Begriff sein), stare + gerundio (Verlauf), andare + a + Infinitiv (Zukunftsabsicht), finire di + Inf (beenden), cominciare a + Inf (beginnen).',
    examples: ['Sto per uscire.', 'Vado a dormire.', 'Ha finito di lavorare.'],
    exercises: [
      { type: 'mc', s: 'Ich bin im Begriff zu gehen: Sto ___ andare.', o: ['per', 'a', 'di', 'da'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Ich gehe schlafen: Vado ___ dormire.', o: ['a', 'per', 'di', 'da'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Er hat aufgehört zu arbeiten: Ha finito ___ lavorare.', o: ['di', 'a', 'per', 'da'], a: 0, tag: 'preposition' },
      { type: 'fill', s: 'Ich beginne zu lesen: Comincio ___ leggere.', ans: ['a'], tag: 'preposition' },
      { type: 'mc', s: '„stare per + inf.“ bedeutet', o: ['im Begriff sein', 'gerade dabei gewesen', 'vorhaben', 'beenden'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Ich bin am Lesen (Verlauf): Sto ___ (leggere)', ans: ['leggendo'], tag: 'tense' },
      { type: 'mc', s: '„andare + a + inf.“ drückt aus', o: ['Zukunftsabsicht', 'Vergangenheit', 'Passiv', 'Wunsch'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Hör auf zu reden! = Smetti ___ parlare!', ans: ['di'], tag: 'preposition' }
    ]
  },
  {
    id: 'it-connettivi-causali', level: 'B1', title: 'Konnektoren: Kausal (perché, poiché, dato che)',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Begründungen: perché, poiché, dato che, visto che, a causa di + Nom. „poiché“ oft satzeinleitend, gehobener als „perché“.',
    examples: ['Non esco perché piove.', 'Poiché ero stanco, sono andato a letto.', 'Dato che sei qui, resta.'],
    exercises: [
      { type: 'mc', s: 'Ich bleibe zu Hause, ___ sono stanco.', o: ['perché', 'affinché', 'benché', 'se'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '___ piove, non esco. (Da)', o: ['Poiché', 'Affinché', 'Benché', 'Purché'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Da du hier bist: ___ sei qui, resta.', o: ['Dato che', 'Affinché', 'Benché', 'Purché'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'wegen (mit Nomen) = a ___ di', ans: ['causa'], tag: 'lexis' },
      { type: 'mc', s: '„poiché“ ist', o: ['gehobener als perché', 'umgangssprachlicher', 'ein Konjunktiv', 'ein Pronomen'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Da es kalt war: ___ che faceva freddo, …', o: ['Visto', 'Affinché', 'Benché', 'Purché'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'weil (Standard) = ___', ans: ['perché'], tag: 'lexis' },
      { type: 'mc', s: 'Kausal-Konnektoren beantworten die Frage', o: ['warum?', 'wann?', 'wo?', 'wie?'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-connettivi-concessivi', level: 'B1', title: 'Konnektoren: Konzessiv (benché, nonostante)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Einräumung: benché + Congiuntivo, nonostante (+ che) + Congiuntivo, sebbene + Congiuntivo, anche se + Indikativ, per quanto + Congiuntivo.',
    examples: ['Esco benché piova.', 'Nonostante sia tardi, studio.', 'Anche se piove, esco.'],
    exercises: [
      { type: 'mc', s: 'Ich gehe raus, obwohl es regnet: Esco benché ___ (piovere).', o: ['piova', 'piove', 'piovesse', 'pioverà'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Obwohl es spät ist: ___ sia tardi, studio.', o: ['Nonostante', 'Perché', 'Affinché', 'Purché'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„anche se“ verlangt', o: ['Indikativ', 'Konjunktiv', 'Konditional', 'Infinitiv'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'obwohl (mit Konjunktiv) = ___', ans: ['benché', 'sebbene'], tag: 'tense' },
      { type: 'mc', s: 'Obwohl er müde war: Benché ___ (essere) stanco, …', o: ['fosse', 'era', 'è', 'sarà'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Konzessive Konnektoren drücken aus', o: ['Einräumung (obwohl)', 'Grund', 'Ziel', 'Bedingung'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'obwohl (auch möglich) = sebbene + ___', ans: ['congiuntivo'], tag: 'tense' },
      { type: 'mc', s: '„nonostante“ steht oft mit', o: ['Konjunktiv', 'Indikativ', 'Futur', 'Imperativ'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'it-connettivi-finali', level: 'B1', title: 'Konnektoren: Final (affinché, perché)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Absicht/Ziel: affinché + Congiuntivo, perché + Congiuntivo (damit), „per“ + Infinitiv (um … zu). „purché“ = vorausgesetzt, dass.',
    examples: ['Studio affinché/ perché passi l’esame.', 'Parlo piano per non disturbare.'],
    exercises: [
      { type: 'mc', s: 'Ich lerne, damit du bestehst: Studio affinché tu ___ (passare).', o: ['passi', 'passa', 'passerai', 'passavi'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Ich spreche leise, um nicht zu stören: Parlo piano ___ non disturbare.', o: ['per', 'perché', 'affinché', 'da'], a: 0, tag: 'preposition' },
      { type: 'mc', s: '„affinché“ verlangt', o: ['Konjunktiv', 'Indikativ', 'Futur', 'Infinitiv'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'damit (mit Konjunktiv) = ___', ans: ['affinché'], tag: 'tense' },
      { type: 'mc', s: '„per + Infinitiv“ entspricht dt.', o: ['um … zu', 'weil', 'obwohl', 'wenn'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'vorausgesetzt, dass =', o: ['purché', 'affinché', 'benché', 'poiché'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Ich arbeite, um zu leben: Lavoro ___ vivere.', ans: ['per'], tag: 'preposition' },
      { type: 'mc', s: 'Finale Konnektoren beantworten die Frage', o: ['wozu?', 'warum?', 'wann?', 'wie?'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-espressioni-impersonali', level: 'B1', title: 'Unpersönliche Ausdrücke (bisogna, è necessario)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'basta/bisogna + Infinitiv, è necessario/possibile/importante + Infinitiv o che + Congiuntivo. „ci vuole/ci vogliono“ (man braucht).',
    examples: ['Bisogna studiare.', 'È importante che tu venga.', 'Ci vuole pazienza.'],
    exercises: [
      { type: 'mc', s: 'Man muss gehen: ___ andare.', o: ['Bisogna', 'Bisogna che', 'Bisognare', 'Bisogna di'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Es ist wichtig, dass du kommst: È importante che tu ___ (venire).', o: ['venga', 'vieni', 'verrai', 'venissi'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Man braucht Geduld: ___ vuole pazienza.', o: ['Ci', 'Ne', 'Si', 'Vi'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Es genügt: ___ basta', ans: ['basta'], tag: 'lexis' },
      { type: 'mc', s: '„è necessario che“ verlangt', o: ['Konjunktiv', 'Indikativ', 'Futur', 'Infinitiv'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„ci vogliono“ (Plural) weil', o: ['das Objekt Plural ist', 'es Futur ist', 'es Konjunktiv ist', 'Fehler'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'Es ist möglich: È ___ (möglich)', ans: ['possibile'], tag: 'lexis' },
      { type: 'mc', s: '„bisogna“ steht mit', o: ['Infinitiv', 'Konjunktiv', 'Futur', 'Partizip'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'it-preposizioni-verb', level: 'B1', title: 'Verben mit fester Präposition',
    concept: 'preposition', errorTag: 'preposition',
    explanation: 'Viele Verben verlangen eine feste Präposition: pensare a, aspettare di, riuscire a, decidere di, finire di, giocare a, sposarsi con, ridere di.',
    examples: ['Penso a te.', 'Riesco a finire.', 'Aspetto di sentire.'],
    exercises: [
      { type: 'mc', s: 'Ich denke an dich: Penso ___ te.', o: ['a', 'di', 'per', 'su'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Ich schaffe es zu enden: Riesco ___ finire.', o: ['a', 'di', 'per', 'da'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Ich warte darauf zu hören: Aspetto ___ sentire.', o: ['di', 'a', 'per', 'da'], a: 0, tag: 'preposition' },
      { type: 'fill', s: 'Ich spiele Fußball: Gioco ___ calcio.', ans: ['a'], tag: 'preposition' },
      { type: 'mc', s: 'Sie hat sich verheiratet mit: Si è sposata ___ Marco.', o: ['con', 'a', 'di', 'per'], a: 0, tag: 'preposition' },
      { type: 'fill', s: 'Ich entscheide zu gehen: Decido ___ partire.', ans: ['di'], tag: 'preposition' },
      { type: 'mc', s: 'Er lacht über dich: Ride ___ te.', o: ['di', 'a', 'su', 'per'], a: 0, tag: 'preposition' },
      { type: 'fill', s: 'Ich denke daran: ci ___ penso (a)', ans: ['a'], tag: 'preposition' }
    ]
  },
  {
    id: 'it-register', level: 'B1', title: 'Register: formell vs. informell',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'du (tu) vs. Sie (Lei + 3. Pers.). Höfliche Formen: „gradire“, „potrebbe“, „Le“ statt „ti“. Umgangssprache: „magari“, „boh“, „un attimo“.',
    examples: ['Mi può aiutare? (formell)', 'Puoi aiutarmi? (informell)', 'Gradirebbe un caffè?'],
    exercises: [
      { type: 'mc', s: 'Formell „Können Sie mir helfen?“:', o: ['Mi può aiutare?', 'Puoi aiutarmi?', 'Mi puoi aiutare?', 'Aiutami'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Höfliches „Sie“ nutzt das Verb in der', o: ['3. Person Singular', '2. Person Singular', '1. Person', 'Plural'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'formell „Ihnen“ (Pronomen) = ___', ans: ['Le'], tag: 'lexis' },
      { type: 'mc', s: '„gradire“ ist', o: ['höflicher als „volere“', 'umgangssprachlich', 'ein Substantiv', 'ein Adjektiv'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Informell „vielleicht/gerne“:', o: ['magari', 'gradirebbe', 'eccessivamente', 'desidera'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'formell „wünschen“ = ___ (statt volere)', ans: ['desiderare', 'gradire'], tag: 'lexis' },
      { type: 'mc', s: 'Zu einem Vorgesetzten nutzt man', o: ['Lei', 'tu', 'voi', 'noi'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Unter Freunden nutzt man', o: ['tu', 'Lei', 'voi', 'loro'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-correlativi', level: 'B1', title: 'Korrelative Konnektoren (sia…che, né…né)',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'sia … che/e (sowohl … als auch), né … né (weder … noch), non solo … ma anche (nicht nur … sondern auch), o … o (entweder … oder).',
    examples: ['Mi piacciono sia il caffè che il tè.', 'Non voglio né caffè né tè.', 'O vieni, o resti.'],
    exercises: [
      { type: 'mc', s: 'sowohl Kaffee als auch Tee: ___ il caffè ___ il tè', o: ['sia…che', 'né…né', 'o…o', 'non solo…ma'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'weder … noch: Non voglio ___ caffè ___ tè.', o: ['né…né', 'sia…che', 'o…o', 'e…e'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'nicht nur … sondern auch: ___ solo studi, ___ lavori.', o: ['Non…ma anche', 'Sia…che', 'Né…né', 'O…o'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'entweder … oder = ___ vieni, ___ resti', ans: ['o'], tag: 'word_order' },
      { type: 'mc', s: '„sia … che“ verbindet', o: ['zwei gleiche Elemente', 'Satz und Wort', 'nur Verben', 'nur Sätze'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'weder … noch (2. Teil) = Non mangio carne ___ pesce', ans: ['né'], tag: 'word_order' },
      { type: 'mc', s: '„non solo … ma anche“ drückt aus', o: ['Steigerung', 'Gegensatz', 'Grund', 'Ziel'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'sowohl … als auch (2. Teil) = sia il caffè ___ il tè', ans: ['che', 'e'], tag: 'word_order' }
    ]
  },

  // ---- B2 ----
  {
    id: 'it-congiuntivo-trapassato', level: 'B2', title: 'Congiuntivo trapassato',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Congiuntivo imperfetto von essere/avere + participio passato. Drückt Vorzeitigkeit im Konjunktiv der Vergangenheit aus (3. Typ Konditional, indirekte Rede).',
    examples: ['Se avessi studiato, avrei superato.', 'Pensavo che fosse già partito.'],
    exercises: [
      { type: 'mc', s: 'Wenn ich studiert hätte: Se ___ studiato, …', o: ['avessi', 'ho', 'avevo', 'ebbi'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Ich dachte, er sei schon gegangen: Pensavo che ___ già partito.', o: ['fosse', 'è', 'era', 'sarà'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Wenn sie (Pl.) gekommen wären: se loro ___ venuti', ans: ['fossero'], tag: 'tense' },
      { type: 'mc', s: 'Bildung:', o: ['cong. imperfetto essere/avere + part.', 'cong. presente + part.', 'imperfetto + part.', 'futuro + part.'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Wenn du es gewusst hättest: se tu lo ___ saputo', ans: ['avessi'], tag: 'tense' },
      { type: 'mc', s: 'Er glaubte, sie hätten es gesagt: credeva che lo ___ detto.', o: ['avessero', 'hanno', 'avevano', 'ebbero'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Konditional 3. Typ Wenn-Satz nutzt', o: ['cong. trapassato', 'cong. presente', 'indicativo', 'futuro'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Wenn ich dort gewesen wäre: se io ___ stato lì', ans: ['fossi'], tag: 'tense' }
    ]
  },
  {
    id: 'it-periodo-ipotetico-misto', level: 'B2', title: 'Konditionalsätze gemischt (periodo misto)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Gemischte Typen kombinieren Vergangenheit und Gegenwart: Se avessi studiato (damals), ora sarei dottore (heute). Zeitbezug der beiden Satzteile unabhängig.',
    examples: ['Se avessi studiato, ora lavorerei.', 'Se fossi ricco, ieri avrei comprato la casa.'],
    exercises: [
      { type: 'mc', s: 'Wenn ich damals studiert hätte, wäre ich jetzt Arzt: Se ___ studiato, ora sarei medico.', o: ['avessi', 'ho', 'avrei', 'avevo'], a: 0, tag: 'tense' },
      { type: 'mc', s: '… ora ___ medico.', o: ['sarei', 'sono', 'ero', 'sarò'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Wenn ich reich wäre, hätte ich gestern gekauft: Se fossi ricco, ieri ___ la casa.', o: ['avrei comprato', 'compro', 'comprerei', 'comprai'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Gemischter Typ: Wenn-Satz Vergangenheit, Hauptsatz ___', ans: ['presente', 'oggi'], tag: 'tense' },
      { type: 'mc', s: 'Se ___ (sapere) ieri, ora sarei tranquillo.', o: ['avessi saputo', 'so', 'sapevo', 'saprei'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Bei gemischten Typen sind die Zeiten', o: ['unabhängig', 'immer gleich', 'immer Futur', 'immer Konjunktiv'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Wenn er käme (jetzt), hätte er gestern angerufen: Se venisse, ieri ___ telefonato', ans: ['avrebbe'], tag: 'tense' },
      { type: 'mc', s: '„ora“ signalisiert im Hauptsatz', o: ['Gegenwart', 'Vergangenheit', 'Zukunft', 'Bedingung'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-nominalizzazione', level: 'B2', title: 'Nominalisierung / Nominalstil',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Verben/Adjektive zu Substantiven: decidere → la decisione, possibile → la possibilità, sviluppare → lo sviluppo. Typisch für formelle/schriftliche Texte.',
    examples: ['La decisione è presa.', 'In caso di pioggia.', 'Lo sviluppo economico.'],
    exercises: [
      { type: 'fill', s: 'decidere → la ___', ans: ['decisione'], tag: 'lexis' },
      { type: 'fill', s: 'possibile → la ___', ans: ['possibilità'], tag: 'lexis' },
      { type: 'fill', s: 'sviluppare → lo ___', ans: ['sviluppo'], tag: 'lexis' },
      { type: 'mc', s: 'Nominalstil ist typisch für', o: ['formelle Schriftsprache', 'Umgangssprache', 'Dialog', 'Lieder'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'in ___ di pioggia (im Falle von)', ans: ['caso'], tag: 'lexis' },
      { type: 'mc', s: '„la costruzione“ kommt von', o: ['costruire', 'costrutto', 'costante', 'costituire'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'libero → la ___', ans: ['libertà'], tag: 'lexis' },
      { type: 'mc', s: 'Nominalisierung ersetzt oft', o: ['einen Nebensatz', 'ein Subjekt', 'einen Artikel', 'ein Pronomen'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-locuzioni-idiomatiche', level: 'B2', title: 'Redewendungen (modi di dire)',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Feste Wendungen: in bocca al lupo (Viel Glück), costare un occhio della testa (teuer sein), non piovere (es regnet nicht / alles gut), prendere in giro (veräppeln).',
    examples: ['In bocca al lupo per l’esame!', 'Mi ha preso in giro.', 'Costa un occhio della testa.'],
    exercises: [
      { type: 'mc', s: '„In bocca al lupo!“ bedeutet', o: ['Viel Glück', 'Gute Nacht', 'Auf Wiedersehen', 'Guten Appetit'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„prendere in giro“ heißt', o: ['veräppeln', 'umarmen', 'erinnern', 'verzeihen'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„costare un occhio della testa“ =', o: ['sehr teuer', 'billig', 'schmerzhaft', 'kostenlos'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Antwort auf „in bocca al lupo“: „Crepi il ___!“', ans: ['lupo'], tag: 'lexis' },
      { type: 'mc', s: '„non piove“ (umgangssprachlich) heißt', o: ['alles ist gut', 'es regnet', 'schlechtes Wetter', 'niemand da'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„avere le gambe a fagiolo“ =', o: ['müde Beine', 'gutes Gleichgewicht', 'Hunger', 'Schlaf'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'etwas auf die lange Bank schieben: rimandare a ___ (domani)', ans: ['domani'], tag: 'lexis' },
      { type: 'mc', s: 'Redewendungen sind', o: ['idiomatisch (nicht wörtlich)', 'wörtlich', 'veraltet', 'dialektal'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-modali-epistemici', level: 'B2', title: 'Modalverben epistemisch (Vermutung)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Condizionale für Vermutung: Sarà le otto (es wird wohl 8 sein). „deve essere“ (Vermutung), „potrebbe“ (Möglichkeit), „non può essere“ (Ausschluss).',
    examples: ['Saranno le otto.', 'Deve essere stanco.', 'Non può essere vero.'],
    exercises: [
      { type: 'mc', s: 'Es wird wohl 8 sein: ___ le otto.', o: ['Saranno', 'Sono', 'Erano', 'Saranno state'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Er muss müde sein (Vermutung): ___ essere stanco.', o: ['Deve', 'Devi', 'Dobbiamo', 'Devono'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Es könnte wahr sein: ___ essere vero.', o: ['Potrebbe', 'Può', 'Potrà', 'Poteva'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Das kann nicht wahr sein (Ausschluss): Non ___ essere vero.', o: ['può', 'deve', 'vuole', 'sa'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Vermutung über Vergangenheit: sarà ___ (partire)', ans: ['partito'], tag: 'tense' },
      { type: 'mc', s: '„deve essere“ drückt hier', o: ['Vermutung', 'Pflicht', 'Erlaubnis', 'Wunsch'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Sie dürfte gekommen sein: sarà ___ (venire)', ans: ['venuta', 'venuto'], tag: 'tense' },
      { type: 'mc', s: 'Epistemisches „futuro“ drückt', o: ['Vermutung', 'Zukunft', 'Befehl', 'Wunsch'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-futuro-nel-passato', level: 'B2', title: 'Futur in der Vergangenheit',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Condizionale presente als „Futur II der Vergangenheit“ nach Vergangenheits-Verb: Ha detto che sarebbe venuto (Er sagte, er werde kommen).',
    examples: ['Ha detto che sarebbe venuto.', 'Sapevo che avremmo vinto.'],
    exercises: [
      { type: 'mc', s: 'Er sagte, er werde kommen: Ha detto che ___ (venire).', o: ['sarebbe venuto', 'verrà', 'viene', 'venne'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Ich wusste, wir würden gewinnen: Sapevo che ___ (vincere).', o: ['avremmo vinto', 'vinceremo', 'vinciamo', 'vinse'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Sie meinte, sie käme später: Diceva che ___ (venire) dopo', ans: ['sarebbe venuta', 'sarebbe venuto'], tag: 'tense' },
      { type: 'mc', s: 'Futur in der Vergangenheit =', o: ['condizionale passato', 'futuro semplice', 'imperfetto', 'cong. imperfetto'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Ha promesso che ___ (aiutare).', o: ['avrebbe aiutato', 'aiuterà', 'aiuta', 'aiutò'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'nach Verb der Vergangenheit: „che io ___ (partire)“', ans: ['sarei partito', 'sarei partita'], tag: 'tense' },
      { type: 'mc', s: 'Ausgangssatz steht im', o: ['Präteritum/Perfekt', 'Präsens', 'Futur', 'Konjunktiv'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„sarebbe venuto“ entspricht dt.', o: ['er würde kommen / er werde kommen', 'er kam', 'er käme', 'er wäre gekommen (Bedingung)'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'it-connettivi-testuali', level: 'B2', title: 'Textkonnektoren (zwar…aber, inoltre, tuttavia)',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Textverknüpfung: inoltre/inoltre (außerdem), tuttavia/però/invece (aber/jedoch), dunque/quindi (also), in realtà (eigentlich), d’altra parte (andererseits).',
    examples: ['Inoltre, fa freddo.', 'È caro, tuttavia lo compro.', 'Dunque, ricapitoliamo.'],
    exercises: [
      { type: 'mc', s: 'außerdem =', o: ['inoltre', 'tuttavia', 'dunque', 'però'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'jedoch/trotzdem =', o: ['tuttavia', 'inoltre', 'quindi', 'infatti'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'also/folglich =', o: ['dunque', 'però', 'invece', 'eppure'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'andererseits = d’___ parte', ans: ['altra'], tag: 'lexis' },
      { type: 'mc', s: 'im Gegenteil/hingegen =', o: ['invece', 'inoltre', 'quindi', 'anche'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'eigentlich/wirklich =', o: ['in realtà', 'inoltre', 'dunque', 'perciò'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'tatsächlich/deshalb = ___ (deshalb)', ans: ['perciò', 'quindi'], tag: 'lexis' },
      { type: 'mc', s: 'Textkonnektoren dienen der', o: ['Kohärenz', 'Aussprache', 'Konjugation', 'Wortbildung'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-discorso-indiretto-comandi', level: 'B2', title: 'Indirekte Rede: Befehle & Fragen',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Befehle: „Ha detto di + Infinitiv“ (Er sagte, er solle…). Verneint: „di non + Infinitiv“. Fragen: „ha chiesto se / dove / quando…“ mit angepasstem Tempus.',
    examples: ['Ha detto di venire.', 'Mi ha chiesto se fossi libero.', 'Ha ordinato di uscire.'],
    exercises: [
      { type: 'mc', s: 'Er sagte, zu kommen: Ha detto ___ venire.', o: ['di', 'a', 'che', 'per'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Er sagte, nicht zu gehen: Ha detto ___ non andare.', o: ['di', 'a', 'che', 'per'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Er fragte, ob ich frei sei: Ha chiesto se ___ (essere) libero.', o: ['fossi', 'sono', 'ero', 'sarò'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'Befehl indirekt: Ha ordinato ___ (di) uscire', ans: ['di'], tag: 'preposition' },
      { type: 'mc', s: 'Indirekte Ja/Nein-Frage beginnt mit', o: ['se', 'che', 'di', 'perché'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'Sie bat mich zu warten: Mi ha pregato ___ aspettare', ans: ['di'], tag: 'preposition' },
      { type: 'mc', s: 'Nach „ha chiesto“ folgt oft', o: ['Konjunktiv', 'Futur', 'Imperativ', 'Infinitiv'], a: 0, tag: 'tense' },
      { type: 'mc', s: '„Ha detto di venire“ = Er sagte,', o: ['(jemand) solle kommen', 'er kam', 'er kommt', 'er käme'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-concordanza-temporale', level: 'B2', title: 'Zeitliche Konsekutivsätze (tanto…che, così…che)',
    concept: 'word_order', errorTag: 'word_order',
    explanation: 'Folge/Konsekutiv: „tanto/così + Adj. + che + Indikativ/Konjunktiv“, „tale…che“, „al punto che“. Drückt eine Folge aus.',
    examples: ['Era così stanco che si addormentò.', 'Parla tanto velocemente che non capisco.'],
    exercises: [
      { type: 'mc', s: 'Er war so müde, dass…: Era ___ stanco che si addormentò.', o: ['così', 'tanto', 'tale', 'quanto'], a: 0, tag: 'word_order' },
      { type: 'mc', s: 'Folge-Konnektor:', o: ['che', 'se', 'affinché', 'benché'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'so viel, dass… = ___ tanto che…', ans: ['parla', 'mangia'], tag: 'word_order' },
      { type: 'mc', s: '„tale … che“ bedeutet', o: ['solcher/solche, dass', 'obwohl', 'damit', 'wenn'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„al punto che“ =', o: ['sodass', 'obwohl', 'damit', 'falls'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'so schön, dass… = ___ bella che…', ans: ['così'], tag: 'word_order' },
      { type: 'mc', s: 'Konsekutivsätze drücken', o: ['eine Folge', 'einen Grund', 'einen Zweck', 'eine Bedingung'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Nach „così … che“ steht meist', o: ['Indikativ', 'Konjunktiv', 'Futur', 'Imperativ'], a: 0, tag: 'tense' }
    ]
  },
  {
    id: 'it-avverbi-valutativi', level: 'B2', title: 'Bewertungs-/Gradpartikel (addirittura, perfino)',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Steigerung/Überraschung: addirittura, perfino, persino (sogar), appena (kaum), neppure/nemmeno (nicht einmal), almeno (zumindest).',
    examples: ['Parla tre lingue, perfino il cinese.', 'Non ho nemmeno fame.', 'Almeno prova!'],
    exercises: [
      { type: 'mc', s: 'sogar =', o: ['perfino', 'appena', 'almeno', 'neppure'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'nicht einmal =', o: ['nemmeno', 'perfino', 'addirittura', 'appena'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'kaum =', o: ['appena', 'perfino', 'almeno', 'persino'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'zumindest = ___', ans: ['almeno'], tag: 'lexis' },
      { type: 'mc', s: 'sogar/überraschend (verstärkend) =', o: ['addirittura', 'appena', 'almeno', 'neanche'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'auch nicht = ___ (nicht einmal)', ans: ['neanche', 'neppure'], tag: 'lexis' },
      { type: 'mc', s: '„perfino“ entspricht dt.', o: ['sogar', 'kaum', 'zumindest', 'nie'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Gradpartikel betonen', o: ['Überraschung/Steigerung', 'Zeit', 'Ort', 'Frage'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-stile-formale-scritto', level: 'B2', title: 'Formeller Schreibstil (congiuntivo esortativo)',
    concept: 'tense', errorTag: 'tense',
    explanation: 'Formelle Bitten/Aufforderungen: „Si prega di…“, „La invitiamo a…“, „Si prega che…“, „Si richiede che + Congiuntivo“. Passiv und unpersönliche Formen dominieren.',
    examples: ['Si prega di firmare.', 'Si richiede che sia presente.', 'La invitiamo a partecipare.'],
    exercises: [
      { type: 'mc', s: 'Bitte unterschreiben (formell): Si prega ___ firmare.', o: ['di', 'a', 'che', 'per'], a: 0, tag: 'preposition' },
      { type: 'mc', s: 'Es wird verlangt, dass er anwesend sei: Si richiede che ___ (essere) presente.', o: ['sia', 'è', 'sarà', 'era'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Wir laden Sie ein: La ___ a partecipare.', o: ['invitiamo', 'inviti', 'inviti a', 'invito'], a: 0, tag: 'tense' },
      { type: 'fill', s: 'formell „Sie“ (Akk.) = ___ (La invito)', ans: ['La'], tag: 'lexis' },
      { type: 'mc', s: 'Formeller Stil nutzt oft', o: ['unpersönliche Formen', 'Slang', 'Ausrufe', 'Diminutive'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Es wird gebeten: Si ___ di attendere (bitten)', ans: ['prega'], tag: 'lexis' },
      { type: 'mc', s: '„Si richiede che“ verlangt', o: ['Konjunktiv', 'Indikativ', 'Futur', 'Infinitiv'], a: 0, tag: 'tense' },
      { type: 'mc', s: 'Formelle Schreiben nutzen', o: ['Passiv/„si“, Konjunktiv', 'nur Aktiv', 'nur Imperativ', 'nur Futur'], a: 0, tag: 'word_order' }
    ]
  },
  {
    id: 'it-verbi-pronominali', level: 'B1', title: 'Pronominale Verben (farcela, andarsene)',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Verben mit festem Pronomen: farcela (es schaffen), andarsene (weggehen), volercene (brauchen), cavarcela (durchkommen). Das Pronomen ist Teil des Verbs.',
    examples: ['Ce la faccio.', 'Me ne vado.', 'Ci vuole tempo.'],
    exercises: [
      { type: 'mc', s: 'Ich schaffe es: ___ la faccio.', o: ['Ce', 'Ci', 'Ne', 'Mi'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'Ich gehe weg: ___ ne vado.', o: ['Me', 'Mi', 'Ce', 'Ne'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Wir schaffen es: ___ la facciamo.', ans: ['Ce'], tag: 'lexis' },
      { type: 'mc', s: '„farcela“ bedeutet', o: ['es schaffen', 'machen', 'gehen', 'sehen'], a: 0, tag: 'lexis' },
      { type: 'mc', s: '„andarsene“ bedeutet', o: ['weggehen', 'hingehen', 'besuchen', 'warten'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'Er schafft es: Lui ___ la fa.', ans: ['se', 'ce'], tag: 'lexis' },
      { type: 'mc', s: 'Bei „me ne vado“ gehören „me“ und „ne“', o: ['zum Verb', 'zum Objekt', 'zum Subjekt', 'zum Adjektiv'], a: 0, tag: 'word_order' },
      { type: 'fill', s: 'Ich brauche (volercene): Ne ___ vogliono due', ans: ['ne'], tag: 'lexis' }
    ]
  },
  {
    id: 'it-avverbi-tempo-luogo', level: 'B1', title: 'Adverbien von Zeit und Ort',
    concept: 'lexis', errorTag: 'lexis',
    explanation: 'Ort: qui/qua (hier), lì/là (dort), vicino/lontano, sopra/sotto, dentro/fuori. Zeit: ora/adesso, ieri, oggi, domani, presto, tardi, già, ancora, appena.',
    examples: ['Vieni qui.', 'Abito vicino.', 'Sono già arrivato.', 'Adesso parto.'],
    exercises: [
      { type: 'mc', s: 'Komm hierher: Vieni ___!', o: ['qui', 'lì', 'là', 'giù'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'dort (fern): ___', o: ['là', 'qui', 'qua', 'giù'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'gestern = ___', ans: ['ieri'], tag: 'lexis' },
      { type: 'fill', s: 'morgen = ___', ans: ['domani'], tag: 'lexis' },
      { type: 'mc', s: 'schon =', o: ['già', 'ancora', 'appena', 'presto'], a: 0, tag: 'lexis' },
      { type: 'mc', s: 'noch =', o: ['ancora', 'già', 'subito', 'tardi'], a: 0, tag: 'lexis' },
      { type: 'fill', s: 'oben = ___', ans: ['sopra'], tag: 'lexis' },
      { type: 'mc', s: 'früh vs. spät:', o: ['presto / tardi', 'qui / lì', 'già / ancora', 'sopra / sotto'], a: 0, tag: 'lexis' }
    ]
  },
  {
    id: 'it-aggettivi-indeterminativi', level: 'B1', title: 'Unbestimmte Adjektive (ogni, qualche, tanto)',
    concept: 'agreement', errorTag: 'agreement',
    explanation: 'ogni (+ Sg.), qualche (+ Sg.), tanto/tanta/tanti/tante, poco/pochi, molto/molti, parecchio, tutto/tutta/tutti/tutte, certo/qualche.',
    examples: ['Ogni giorno studio.', 'Tanti amici.', 'Tutte le ragazze.', 'Poco tempo.'],
    exercises: [
      { type: 'mc', s: 'jeden Tag: ___ giorno', o: ['Ogni', 'Qualche', 'Tutto', 'Tanto'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'einige (immer Singular): ___ amici', o: ['Qualche', 'Alcuni', 'Tanti', 'Molti'], a: 0, tag: 'agreement' },
      { type: 'mc', s: 'alle (f.Pl.): ___ ragazze', o: ['Tutte', 'Tutto', 'Tutti', 'Tanta'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'viel (m.Sg.) = ___ tempo', ans: ['tanto', 'molto'], tag: 'agreement' },
      { type: 'mc', s: 'wenige (m.Pl.): ___ amici', o: ['pochi', 'poco', 'poca', 'poche'], a: 0, tag: 'agreement' },
      { type: 'mc', s: '„ogni“ steht mit', o: ['Singular', 'Plural', 'beidem', 'Verb'], a: 0, tag: 'agreement' },
      { type: 'fill', s: 'viele (f.Pl.) = ___ amiche', ans: ['tante', 'molte'], tag: 'agreement' },
      { type: 'mc', s: '„qualche“ verlangt', o: ['Singular', 'Plural', 'Verb', 'Artikel'], a: 0, tag: 'agreement' }
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

// Richtige Antworten gleichmäßig über A–D verteilen (deterministischer Seed)
for (const p of points) {
  p.exercises.forEach((e, i) => shuffleMcExercise(e, `${p.id}#${i}`));
}

const doc = {
  lang: 'it',
  version: '1.0.0',
  source: 'CEFR Can-do + Lehrplan A1–B1',
  points
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
console.log(`✅ ${points.length} Punkte, ${points.reduce((n, p) => n + p.exercises.length, 0)} Übungen → ${OUT}`);
