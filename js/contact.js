document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.LUXSOME?.apiBase;
  const router = document.getElementById('routerPanel');
  const views = ['quotationView','sampleView','simpleContactView','existingView'].map(id=>document.getElementById(id)).filter(Boolean);
  const show = view => { router.hidden=true; views.forEach(v=>v.hidden=v!==view); view.hidden=false; view.scrollIntoView({behavior:'smooth',block:'start'}); };
  const home = () => { views.forEach(v=>v.hidden=true); router.hidden=false; router.scrollIntoView({behavior:'smooth',block:'start'}); };
  document.querySelectorAll('[data-back-to="home"]').forEach(b=>b.addEventListener('click',home));
  document.querySelectorAll('[data-intent]').forEach(b=>b.addEventListener('click',()=>show(document.getElementById(b.dataset.intent==='quotation'?'quotationView':b.dataset.intent==='sample'?'sampleView':b.dataset.intent==='existing'?'existingView':'simpleContactView'))));

  function setupAccordion(root){
    root?.querySelectorAll('.product-group__toggle').forEach(toggle=>toggle.addEventListener('click',()=>{
      const group=toggle.closest('.product-group'); const panel=group.querySelector('.product-group__panel'); const opening=panel.hidden;
      root.querySelectorAll('.product-group').forEach(g=>{g.querySelector('.product-group__panel').hidden=true;g.querySelector('.product-group__toggle').setAttribute('aria-expanded','false');g.querySelector('.product-group__toggle span:last-child').textContent='+';});
      if(opening){panel.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.querySelector('span:last-child').textContent='−';}
    }));
  }
  document.querySelectorAll('[data-product-accordion]').forEach(setupAccordion);

  function productSelector(form, hiddenId, errorId, summaryId){
    const selected=new Map(); const hidden=document.getElementById(hiddenId); const summary=summaryId?document.getElementById(summaryId):null;
    form.querySelectorAll('[data-product]').forEach(button=>button.addEventListener('click',()=>{
      const key=`${button.dataset.category}::${button.dataset.product}`; const active=selected.has(key);
      if(active) selected.delete(key); else selected.set(key,{category:button.dataset.category,product:button.dataset.product});
      button.classList.toggle('is-selected',!active); button.setAttribute('aria-pressed',String(!active)); hidden.value=JSON.stringify([...selected.values()]);
      document.getElementById(errorId).textContent='';
      if(summary){summary.innerHTML=selected.size?[...selected.values()].map(x=>`<span class="selection-chip">${escapeHtml(x.product)}</span>`).join(''):'<span class="selection-empty">Nothing selected yet.</span>';}
    }));
    return selected;
  }
  const qForm=document.getElementById('quotationForm'); const qSelected=productSelector(qForm,'quotationProductsJson','quotationProductError','quotationSelectionSummary');
  let qty=''; qForm.querySelectorAll('[data-quantity]').forEach(b=>b.addEventListener('click',()=>{qty=b.dataset.quantity;qForm.querySelectorAll('[data-quantity]').forEach(x=>x.classList.toggle('is-selected',x===b));document.getElementById('selectedQuantity').value=qty;}));
  qForm.addEventListener('submit',e=>submit(e,qForm,'/quotation-requests','quotation','quotationSubmitButton','quotationFormStatus',qSelected,'quotationProductError'));

  const sForm=document.getElementById('sampleForm'); const sSelected=productSelector(sForm,'sampleProductsJson','sampleProductError');
  const basis=document.getElementById('sampleBasis'), upload=document.getElementById('sampleUploadZone'), file=document.getElementById('sampleAttachment');
  document.querySelectorAll('[data-sample-basis]').forEach(b=>b.addEventListener('click',()=>{basis.value=b.dataset.sampleBasis;document.querySelectorAll('[data-sample-basis]').forEach(x=>x.classList.toggle('is-selected',x===b));upload.hidden=!['reference','artwork'].includes(basis.value);}));
  file.addEventListener('change',()=>{document.getElementById('sampleFileName').textContent=file.files[0]?file.files[0].name:'';});
  sForm.addEventListener('submit',e=>submit(e,sForm,'/sample-requests','sample','sampleSubmitButton','sampleFormStatus',sSelected,'sampleProductError'));

  async function submit(event,form,path,type,buttonId,statusId,selected,errorId){
    event.preventDefault(); const status=document.getElementById(statusId); status.textContent=''; status.className='form-status';
    if(!selected.size){document.getElementById(errorId).textContent='Please choose at least one item.';return;}
    if(!form.reportValidity()) return;
    if(!API_BASE){status.textContent='The request service is temporarily unavailable.';status.classList.add('is-error');return;}
    const button=document.getElementById(buttonId), text=button.querySelector('.button-text'), original=text.textContent; button.disabled=true;button.classList.add('loading');text.textContent='Sending...';
    try{
      const response=await fetch(`${API_BASE}${path}`,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}}); const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.message||'Your request could not be sent.');
      sessionStorage.setItem('luxsomeContactConfirmation',JSON.stringify({reference:data.reference,type,brandName:new FormData(form).get('brandName'),submittedAt:new Date().toISOString()}));
      location.assign(`/contact/success/?reference=${encodeURIComponent(data.reference)}&type=${encodeURIComponent(type)}`);
    }catch(err){status.textContent=err.message;status.classList.add('is-error');button.disabled=false;button.classList.remove('loading');text.textContent=original;}
  }
  function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
});