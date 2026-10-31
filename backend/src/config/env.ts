import 'dotenv/config';

function readPort(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${value}". Use an integer from 1 to 65535.`);
  }

  return port;
}

function readOrigins(value: string | undefined): string[] {
  const raw = value ?? 'http://localhost:4200,http://127.0.0.1:4200';
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must include at least one origin.');
  }

  return origins;
}

function readOptionalKey(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export interface Env {
  port: number;
  corsOrigins: string[];
  anthropicApiKey: string | null;
  geminiApiKey: string | null;
}

export const env: Env = {
  port: readPort(process.env.PORT, 3000),
  corsOrigins: readOrigins(process.env.CORS_ORIGIN),
  anthropicApiKey: readOptionalKey('ANTHROPIC_API_KEY'),
  geminiApiKey: readOptionalKey('GEMINI_API_KEY'),
};
