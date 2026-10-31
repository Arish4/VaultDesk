/**
 * Split an ApiError into one general message plus one message per form field,
 * so forms can show "This username is taken" right under the username box.
 */
export function readApiError(error, { unauthorized } = {}) {
  if (!error) return { general: null, fields: {} };
  if (error.status === 401 && unauthorized) return { general: unauthorized, fields: {} };
  const fields = Object.fromEntries(
    Object.entries(error.fieldErrors ?? {}).map(([name, messages]) => [name, [].concat(messages)[0]]),
  );
  return { general: Object.keys(fields).length ? null : error.message, fields };
}
