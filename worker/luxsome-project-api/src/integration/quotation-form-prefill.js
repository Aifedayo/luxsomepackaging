// Add this to your existing CRM quotation-create page JavaScript.
// Change the input IDs in fill() only if your quotation form uses different IDs.
(async function prefillFromRequest(){
  const requestId=new URLSearchParams(location.search).get('request_id');
  if(!requestId||!window.LUXSOME?.apiBase)return;
  const response=await fetch(`${window.LUXSOME.apiBase}/crm-api/quotation-requests/${encodeURIComponent(requestId)}/prefill`,{headers:{Accept:'application/json'}});
  if(!response.ok)return;
  const data=await response.json(),r=data.request;
  const fill=(id,value)=>{const el=document.getElementById(id);if(el&&!el.value)el.value=value||'';};
  fill('brandName',r.brand_name); fill('customerEmail',r.email); fill('customerPhone',r.phone); fill('customerName',r.contact_name);
  const notes=[r.customer_note, data.items?.length?'Requested: '+data.items.map(x=>x.product).join(', '):'', r.approximate_quantity?'Requested quantity: '+r.approximate_quantity:''].filter(Boolean).join('\n');
  fill('notes',notes);
  window.luxsomeQuotationRequest={id:r.id,reference:r.request_reference,items:data.items||[]};
})();
