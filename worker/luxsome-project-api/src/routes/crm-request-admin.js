import { json } from '../lib/request-utils.js';

export async function listQuotationRequests(request, env) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const bind = [];
  let where = '';
  if (status && status !== 'all') { where = 'WHERE q.status = ?'; bind.push(status); }
  const query = `SELECT q.*, GROUP_CONCAT(i.category || '::' || i.product, '||') AS items_flat
    FROM quotation_requests q LEFT JOIN quotation_request_items i ON i.request_id=q.id
    ${where} GROUP BY q.id ORDER BY q.created_at DESC LIMIT 200`;
  const { results } = await env.DB.prepare(query).bind(...bind).all();
  return json({ results });
}

export async function listSampleRequests(request, env) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const bind = [];
  let where = '';
  if (status && status !== 'all') { where = 'WHERE s.status = ?'; bind.push(status); }
  const query = `SELECT s.*, GROUP_CONCAT(i.category || '::' || i.product, '||') AS items_flat
    FROM sample_requests s LEFT JOIN sample_request_items i ON i.request_id=s.id
    ${where} GROUP BY s.id ORDER BY s.created_at DESC LIMIT 200`;
  const { results } = await env.DB.prepare(query).bind(...bind).all();
  return json({ results });
}

export async function updateQuotationRequest(request, env, id) {
  const body = await request.json();
  const allowed = new Set(['new','reviewing','quotation_created','sent','closed']);
  if (!allowed.has(body.status)) return json({ message: 'Invalid status.' }, 400);
  await env.DB.prepare(`UPDATE quotation_requests SET status=?, updated_at=datetime('now'),
    reviewed_at=CASE WHEN ?='reviewing' AND reviewed_at IS NULL THEN datetime('now') ELSE reviewed_at END,
    closed_at=CASE WHEN ?='closed' THEN datetime('now') ELSE closed_at END WHERE id=?`)
    .bind(body.status, body.status, body.status, id).run();
  return json({ ok: true });
}

export async function updateSampleRequest(request, env, id) {
  const body = await request.json();
  const allowed = new Set(['new','reviewing','sample_quoted','awaiting_payment','in_production','dispatched','completed','closed']);
  if (!allowed.has(body.status)) return json({ message: 'Invalid status.' }, 400);
  await env.DB.prepare(`UPDATE sample_requests SET status=?, updated_at=datetime('now'),
    reviewed_at=CASE WHEN ?='reviewing' AND reviewed_at IS NULL THEN datetime('now') ELSE reviewed_at END,
    closed_at=CASE WHEN ? IN ('completed','closed') THEN datetime('now') ELSE closed_at END WHERE id=?`)
    .bind(body.status, body.status, body.status, id).run();
  return json({ ok: true });
}

export async function getSampleAttachment(request, env, id) {
  const row = await env.DB.prepare('SELECT attachment_r2_key, attachment_name, attachment_type FROM sample_requests WHERE id=?').bind(id).first();
  if (!row?.attachment_r2_key) return json({ message: 'No attachment.' }, 404);
  const object = await env.ARTWORK_BUCKET.get(row.attachment_r2_key);
  if (!object) return json({ message: 'Attachment not found.' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-disposition', `inline; filename="${String(row.attachment_name || 'attachment').replace(/"/g,'')}"`);
  return new Response(object.body, { headers });
}

export async function getQuotationRequestPrefill(request, env, id) {
  const row = await env.DB.prepare('SELECT * FROM quotation_requests WHERE id=?').bind(id).first();
  if (!row) return json({ message: 'Quotation request not found.' }, 404);
  const { results: items } = await env.DB.prepare('SELECT category, product FROM quotation_request_items WHERE request_id=? ORDER BY id').bind(id).all();
  return json({ request: row, items });
}
