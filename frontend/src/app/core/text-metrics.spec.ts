import { countCharacters, countWords } from './text-metrics';

describe('text metrics', () => {
  it('matches the backend rules for a normal sentence', () => {
    const text = 'Explain how artificial intelligence works';
    expect(countWords(text)).toBe(5);
    expect(countCharacters(text)).toBe(41);
  });

  it('does not count whitespace-only text as words', () => {
    expect(countWords(' \n\t ')).toBe(0);
    expect(countCharacters(' \n\t ')).toBe(4);
  });
});
