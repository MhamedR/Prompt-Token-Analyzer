import { HttpErrorResponse } from '@angular/common/http';

export function readHttpError(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Cannot reach the API. Start the backend with npm run dev in the backend folder.';
    }

    const body = error.error as { error?: { message?: unknown } } | null;
    const message = body?.error?.message;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }

    return `${fallback} (${error.status})`;
  }

  return fallback;
}
