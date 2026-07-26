const _atob = typeof atob !== 'undefined' ? atob : (str) => Buffer.from(str, 'base64').toString('utf-8');

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch {
    req.user = null;
  }

  next();
}

function verifyToken(token) {
  const base64 = decodeBase64(token);
  if (base64?.id) return base64;
  return null;
}

function decodeBase64(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(_atob(parts[1]));
  } catch {
    return null;
  }
}
