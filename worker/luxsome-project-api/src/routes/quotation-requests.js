import { json, makeReference, text, validEmail, validPhone, parseItems, cors } from '../lib/request-utils.js';

export async function handleQuotationRequest(request, env) {
  const headers = cors(env, request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405, headers);

  const form = await request.formData();
  if (text(form.get('_gotcha'), 200)) return json({ ok: true }, 200, headers);

  const brandName = text(form.get('brandName'), 100);
  const contactName = text(form.get('contactName'), 100);
  const phone = text(form.get('phoneNumber'), 30);
  const email = text(form.get('emailAddress'), 150).toLowerCase();
  const quantity = text(form.get('selected_quantity'), 40) || null;
  const note = text(form.get('customer_note'), 1500);
  const items = parseItems(form.get('selected_products_json'));

  const errors = [];
  if (brandName.length < 2) errors.push({ field: 'brandName', message: 'Please enter your brand name.' });
  if (!validPhone(phone)) errors.push({ field: 'phoneNumber', message: 'Please enter a valid phone number.' });
  if (!validEmail(email)) errors.push({ field: 'emailAddress', message: 'Please enter a valid email address.' });
  if (!items.length) errors.push({ field: 'products', message: 'Please choose at least one packaging item.' });
  if (errors.length) return json({ message: 'Please check your details.', errors }, 400, headers);

  let reference;
  for (let attempt = 0; attempt < 4; attempt++) {
    reference = makeReference('LQR');
    try {
      const result = await env.DB.prepare(`INSERT INTO quotation_requests
        (request_reference, brand_name, contact_name, phone, email, approximate_quantity, customer_note)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(reference, brandName, contactName, phone, email, quantity, note).run();
      const requestId = result.meta.last_row_id;
      const statements = items.map(item => env.DB.prepare(
        'INSERT INTO quotation_request_items (request_id, category, product) VALUES (?, ?, ?)'
      ).bind(requestId, item.category, item.product));
      if (statements.length) await env.DB.batch(statements);
      return json({ ok: true, reference, type: 'quotation' }, 201, headers);
    } catch (error) {
      if (!String(error.message).includes('UNIQUE')) throw error;
    }
  }
  return json({ message: 'Could not create a unique request reference. Please try again.' }, 500, headers);
}
