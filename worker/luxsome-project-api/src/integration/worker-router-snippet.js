// Add these imports near the top of src/worker.js
import { handleQuotationRequest } from './routes/quotation-requests.js';
import { handleSampleRequest } from './routes/sample-requests.js';
import { listQuotationRequests, listSampleRequests, updateQuotationRequest, updateSampleRequest, getSampleAttachment, getQuotationRequestPrefill } from './routes/crm-request-admin.js';

// Add these routes inside your existing fetch router.
// IMPORTANT: Keep your existing CRM/admin authentication in front of all /crm-api/* routes.

if (url.pathname === '/quotation-requests') return handleQuotationRequest(request, env);
if (url.pathname === '/sample-requests') return handleSampleRequest(request, env);

// AFTER your existing admin authentication check:
if (url.pathname === '/crm-api/quotation-requests' && request.method === 'GET') return listQuotationRequests(request, env);
if (url.pathname === '/crm-api/sample-requests' && request.method === 'GET') return listSampleRequests(request, env);

let match = url.pathname.match(/^\/crm-api\/quotation-requests\/(\d+)$/);
if (match && request.method === 'PATCH') return updateQuotationRequest(request, env, Number(match[1]));

match = url.pathname.match(/^\/crm-api\/sample-requests\/(\d+)$/);
if (match && request.method === 'PATCH') return updateSampleRequest(request, env, Number(match[1]));

match = url.pathname.match(/^\/crm-api\/sample-requests\/(\d+)\/attachment$/);
if (match && request.method === 'GET') return getSampleAttachment(request, env, Number(match[1]));

match = url.pathname.match(/^\/crm-api\/quotation-requests\/(\d+)\/prefill$/);
if (match && request.method === 'GET') return getQuotationRequestPrefill(request, env, Number(match[1]));
