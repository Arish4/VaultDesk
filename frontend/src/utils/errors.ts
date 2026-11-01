import type { ApiError } from "../api/client";

export interface ReadableError {
  general: string | null;
  fields: Record<string, string>;
}

/**
 * Split an ApiError into one general message plus one message per form field,
 * so forms can show "This username is taken" right under the username box.
 */
export function readApiError(
  error: (Error & Partial<Pick<ApiError, "status" | "fieldErrors">>) | null,
  { unauthorized }: { unauthorized?: string } = {},
): ReadableError {
  if (!error) return { general: null, fields: {} };
  if (error.status === 401 && unauthorized) return { general: unauthorized, fields: {} };
  const fields = Object.fromEntries(
    Object.entries(error.fieldErrors ?? {}).map(([name, messages]) => [name, ([] as string[]).concat(messages)[0]]),
  );
  return { general: Object.keys(fields).length ? null : error.message, fields };
}
