let _token = null;

export function setApiToken(token) {
  _token = token;
}

export function getApiToken() {
  return _token;
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }
  const res = await fetch(path, { ...options, headers });
  return res;
}
