export interface TextStats {
  wordCount: number;
  characterCount: number;
  tokenCount: number;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }

  return trimmed.split(/\s+/u).length;
}

/** UTF-16 code units, matching a typical editor character count. */
export function countCharacters(text: string): number {
  return text.length;
}
