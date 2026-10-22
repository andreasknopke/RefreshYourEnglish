import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const itemsFile = path.resolve(__dirname, '../../content/packs/it/placement/items.json');
const data = JSON.parse(fs.readFileSync(itemsFile, 'utf-8'));

describe('Placement-Item-Bank Italienisch', () => {
  it('hat Einträge', () => {
    expect(data.items.length).toBeGreaterThanOrEqual(40);
  });

  it('hat eindeutige IDs', () => {
    const ids = data.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('alle Items haben Pflichtfelder', () => {
    for (const item of data.items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('skill');
      expect(item).toHaveProperty('difficulty');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('prompt');
      expect(['reading', 'listening', 'grammar', 'vocabulary', 'writing', 'speaking']).toContain(
        item.skill
      );
      expect(item.difficulty).toBeGreaterThanOrEqual(-3);
      expect(item.difficulty).toBeLessThanOrEqual(3);
    }
  });

  it('mc/listen-Items: Antwort ist in den Optionen', () => {
    for (const item of data.items.filter((i) => i.type === 'mc' || i.type === 'listen')) {
      expect(item.options).toContain(item.answer);
    }
  });

  it('produce-Items haben keywords und minWords', () => {
    for (const item of data.items.filter((i) => i.type === 'produce')) {
      expect(Array.isArray(item.keywords)).toBe(true);
      expect(item.minWords).toBeGreaterThan(0);
    }
  });

  it('deckt alle vier Kern-Skills ab', () => {
    const skills = new Set(data.items.map((i) => i.skill));
    for (const s of ['reading', 'listening', 'grammar', 'vocabulary']) {
      expect(skills.has(s)).toBe(true);
    }
  });

  it('hat Items über mehrere Schwierigkeitsgrade je Kern-Skill', () => {
    for (const skill of ['reading', 'grammar', 'vocabulary']) {
      const diffs = data.items.filter((i) => i.skill === skill).map((i) => i.difficulty);
      expect(Math.max(...diffs) - Math.min(...diffs)).toBeGreaterThan(1.5);
    }
  });
});
