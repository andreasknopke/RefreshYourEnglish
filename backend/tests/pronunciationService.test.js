import { describe, it, expect } from 'vitest';
import { scorePronunciation, normalize } from '../src/services/pronunciationService.js';

describe('Pronunciation Service (Stufe 1)', () => {
  it('normalisiert Text: lowercase, Akzente, Interpunktion', () => {
    expect(normalize('Caffè, per favore!')).toBe('caffe per favore');
    expect(normalize('  Più   caffè?  ')).toBe('piu caffe');
  });

  it('perfekter Treffer bei normalem Tempo -> hoher Score', () => {
    const ref = 'Vorrei un caffe per favore';
    // 5 Wörter @ 2.6 W/s ~ 1923 ms
    const res = scorePronunciation({ reference: ref, transcript: ref, durationMs: 1900 });
    expect(res.ok).toBe(true);
    expect(res.wordAccuracy).toBe(1);
    expect(res.matched).toBe(5);
    expect(res.total).toBe(5);
    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.level).toBe('hervorragend');
  });

  it('Teil-Treffer reduziert Wortgenauigkeit und Score', () => {
    const ref = 'Vorrei un caffe per favore';
    const res = scorePronunciation({ reference: ref, transcript: 'vorrei caffe', durationMs: 1500 });
    expect(res.matched).toBe(2);
    expect(res.total).toBe(5);
    expect(res.wordAccuracy).toBeCloseTo(0.4, 2);
    expect(res.missing).toContain('un');
    expect(res.score).toBeLessThan(70);
  });

  it('leeres Transkript -> Score 0, empty=true', () => {
    const res = scorePronunciation({ reference: 'Buongiorno come stai', transcript: '', durationMs: 800 });
    expect(res.score).toBe(0);
    expect(res.empty).toBe(true);
    expect(res.wordAccuracy).toBe(0);
  });

  it('fehlende Referenz -> ok=false', () => {
    const res = scorePronunciation({ reference: '', transcript: 'ciao', durationMs: 500 });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it('zu schnelles Sprechen drückt den Dauer-Score', () => {
    const ref = 'uno due tre quattro cinque sei sette otto';
    const fast = scorePronunciation({ reference: ref, transcript: ref, durationMs: 500 });
    const ok = scorePronunciation({ reference: ref, transcript: ref, durationMs: 3000 });
    expect(fast.durationScore).toBeLessThan(ok.durationScore);
  });

  it('zu langsames Sprechen drückt den Dauer-Score', () => {
    const ref = 'uno due tre';
    const slow = scorePronunciation({ reference: ref, transcript: ref, durationMs: 8000 });
    const ok = scorePronunciation({ reference: ref, transcript: ref, durationMs: 1150 });
    expect(slow.durationScore).toBeLessThan(ok.durationScore);
  });

  it('Akzentunabhängigkeit: caffe == caffè', () => {
    const res = scorePronunciation({ reference: 'Un caffè, per favore', transcript: 'un caffe per favore', durationMs: 1500 });
    expect(res.wordAccuracy).toBe(1);
  });

  it('fehlende Dauer -> neutraler Dauer-Score, aber Worttreffer zählt', () => {
    const ref = 'ciao come stai';
    const res = scorePronunciation({ reference: ref, transcript: ref });
    expect(res.wordAccuracy).toBe(1);
    expect(res.durationMs).toBeNull();
    expect(res.durationScore).toBe(0.7);
  });
});
