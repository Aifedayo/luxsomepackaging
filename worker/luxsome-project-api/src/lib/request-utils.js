export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}

export function makeReference(prefix) {
  const now = new Date();
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,'0')}${String(now.getUTCDate()).padStart(2,'0')}`;
  const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString().slice(-6).padStart(6,'0');
  return `${prefix}-${date}-${rand}`;
}

export function text(value, max = 1500) {
  return String(value ?? '').trim().slice(0, max);
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function validPhone(value) {
  const v = String(value || '').trim();
  const digits = v.replace(/\D/g, '');
  return /^\+?[0-9\s()-]+$/.test(v) && digits.length >= 10 && digits.length <= 15;
}

export function parseItems(raw) {
  if (!raw) return [];
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(value)) return [];
    return value.map(item => ({
      category: text(item.category, 80),
      product: text(item.product, 120)
    })).filter(item => item.category && item.product).slice(0, 30);
  } catch {
    return [];
  }
}

export function cors(env, request) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN;
  return origin && allowed && origin === allowed ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
    'access-control-allow-headers': 'content-type,accept,authorization',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  } : {};
}
