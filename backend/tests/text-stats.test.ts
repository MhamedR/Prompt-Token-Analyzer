import { describe, expect, it } from 'vitest';
import { countCharacters, countWords } from '../src/domain/text-stats.js';

describe('text stats', () => {
  it('counts words and characters for a normal sentence', () => {
    const text = 'Explain how artificial intelligence works';
    expect(countWords(text)).toBe(5);
    expect(countCharacters(text)).toBe(41);
  });

  it('treats blank text as zero words and keeps the character length', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n\t  ')).toBe(0);
    expect(countCharacters('   ')).toBe(3);
  });

  it('splits on any unicode whitespace', () => {
    expect(countWords('alpha\nbeta\tgamma  delta')).toBe(4);
  });
});
