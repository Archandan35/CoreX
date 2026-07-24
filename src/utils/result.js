export function ok(data) {
  return { ok: true, data };
}

export function fail(error) {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: message };
}