import { json, makeReference, text, validEmail, validPhone, parseItems, cors } from '../lib/request-utils.js';

const MAX_FILE = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','application/pdf']);

export async function handleSampleRequest(request, env) {
  const headers = cors(env, request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405, headers);

  const form = await request.formData();
  if (text(form.get('_gotcha'), 200)) return json({ ok: true }, 200, headers);

  const brandName = text(form.get('brandName'), 100);
  const contactName = text(form.get('contactName'), 100);
  const phone = text(form.get('phoneNumber'), 30);
  const email = text(form.get('emailAddress'), 150).toLowerCase();
  const sampleBasis = ['reference','artwork','recommendation','none'].includes(String(form.get('sample_basis'))) ? String(form.get('sample_basis')) : 'none';
  const note = text(form.get('customer_note'), 1500);
  const items = parseItems(form.get('selected_products_json'));
  const attachment = form.get('attachment');

  const errors = [];
  if (brandName.length < 2) errors.push({ field: 'brandName', message: 'Please enter your brand name.' });
  if (!validPhone(phone)) errors.push({ field: 'phoneNumber', message: 'Please enter a valid phone number.' });
  if (!validEmail(email)) errors.push({ field: 'emailAddress', message: 'Please enter a valid email address.' });
  if (!items.length) errors.push({ field: 'products', message: 'Please choose what you want sampled.' });

  const hasFile = attachment && typeof attachment === 'object' && typeof attachment.arrayBuffer === 'function' && attachment.size > 0;
  if (hasFile && attachment.size > MAX_FILE) errors.push({ field: 'attachment', message: 'Attachment must be 10MB or smaller.' });
  if (hasFile && !ALLOWED.has(attachment.type)) errors.push({ field: 'attachment', message: 'Upload JPG, PNG, WEBP or PDF.' });
  if (errors.length) return json({ message: 'Please check your details.', errors }, 400, headers);

  let reference = makeReference('LSR');
  let r2Key = null;
  try {
    if (hasFile) {
      if (!env.ARTWORK_BUCKET) return json({ message: 'Sample attachment storage is not configured for this environment.' }, 503, headers);
      const safeName = String(attachment.name || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100);
      r2Key = `sample-requests/${reference}/${crypto.randomUUID()}-${safeName}`;
      await env.ARTWORK_BUCKET.put(r2Key, attachment.stream(), {
        httpMetadata: { contentType: attachment.type },
        customMetadata: { requestReference: reference, originalName: attachment.name || '' }
      });
    }

    const result = await env.DB.prepare(`INSERT INTO sample_requests
      (request_reference, brand_name, contact_name, phone, email, sample_basis, customer_note, attachment_r2_key, attachment_name, attachment_type, attachment_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(reference, brandName, contactName, phone, email, sampleBasis, note,
        r2Key, hasFile ? text(attachment.name, 180) : null, hasFile ? attachment.type : null, hasFile ? attachment.size : null).run();

    const requestId = result.meta.last_row_id;
    const statements = items.map(item => env.DB.prepare(
      'INSERT INTO sample_request_items (request_id, category, product) VALUES (?, ?, ?)'
    ).bind(requestId, item.category, item.product));
    if (statements.length) await env.DB.batch(statements);

    return json({ ok: true, reference, type: 'sample' }, 201, headers);
  } catch (error) {
    if (r2Key && env.ARTWORK_BUCKET) await env.ARTWORK_BUCKET.delete(r2Key).catch(() => {});
    throw error;
  }
}
