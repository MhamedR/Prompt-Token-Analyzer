export interface LenmlTokenizer {
  encode(text: string, options?: { add_special_tokens?: boolean }): number[];
}

const loaded = new Map<string, Promise<LenmlTokenizer>>();

export function loadLenml(
  key: string,
  factory: () => Promise<{ fromPreTrained: () => LenmlTokenizer }>,
): Promise<LenmlTokenizer> {
  const existing = loaded.get(key);
  if (existing) {
    return existing;
  }

  const created = factory().then((module) => module.fromPreTrained());
  loaded.set(key, created);
  return created;
}

/** Counts text only. Special tokens such as BOS are not added. */
export async function countLenml(tokenizer: Promise<LenmlTokenizer>, text: string): Promise<number> {
  if (text.length === 0) {
    return 0;
  }

  const encoder = await tokenizer;
  return encoder.encode(text, { add_special_tokens: false }).length;
}
