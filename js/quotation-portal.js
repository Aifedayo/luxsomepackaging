(function(){
    "use strict";
    const API="https://api.luxsomepackaging.com";
    const params=new URLSearchParams(location.search);
    const token=params.get("token")||"";
    let quote=null,action="";
    const $=id=>document.getElementById(id);
    const money=v=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(v)||0);
    const date=v=>v?new Intl.DateTimeFormat("en-NG",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(v+"T00:00:00Z")):"—";
    const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
    async function api(path,options={}){const r=await fetch(API+path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Request failed.");return d}
    function statusLabel(v){return({sent:"Sent",accepted:"Accepted",needs_revision:"Changes requested",declined:"Declined",expired:"Expired",cancelled:"Cancelled",draft:"Draft"})[v]||v}
    async function load(){
     if(!token){showError("The quotation link is missing.");return}
     try{const d=await api("/public/quotations/"+encodeURIComponent(token));quote=d.quotation;render()}
     catch(e){showError(e.message)}
    }
    function render(){
     $("portalLoading").hidden=true;$("portalQuotation").hidden=false;
     $("quoteReference").textContent=quote.quoteReference;$("quoteBrand").textContent=quote.brandName||quote.customerName||"Valued customer";
     $("quoteStatus").textContent=statusLabel(quote.status);$("issueDate").textContent=date(quote.issueDate);$("expiryDate").textContent=date(quote.expiryDate);$("heroTotal").textContent=money(quote.grandTotal);
     $("productionTimeline").textContent=quote.productionTimeline||"To be confirmed.";$("paymentTerms").textContent=quote.paymentTerms||"To be confirmed.";$("quoteNotes").textContent=quote.notes||"No additional notes.";
     $("quoteItems").innerHTML=(quote.items||[]).map(i=>`<div class="quote-item"><div><h3>${esc(i.description)}</h3><p>${esc(i.details||"")}</p></div><div class="quote-item__amount"><strong>${esc(money(i.line_total))}</strong><small>${esc(i.quantity)} × ${esc(money(i.unit_price))}</small></div></div>`).join("");
     $("quoteTotals").innerHTML=`<div><span>Subtotal</span><strong>${esc(money(quote.subtotal))}</strong></div><div><span>Discount</span><strong>− ${esc(money(quote.discount))}</strong></div><div><span>Delivery</span><strong>${esc(money(quote.deliveryFee))}</strong></div><div><span>Tax</span><strong>${esc(money(quote.tax))}</strong></div><div><span>Grand total</span><strong>${esc(money(quote.grandTotal))}</strong></div>`;
     if(["accepted","needs_revision","declined"].includes(quote.status)){showCompleted(quote.status,quote.responseComment)}
     if(["expired","cancelled"].includes(quote.status)){ $("responseSection").hidden=true;showCompleted(quote.status,"Please contact Luxsome Packaging for assistance.") }
    }
    function showError(m){$("portalLoading").hidden=true;$("portalError").hidden=false;$("portalErrorMessage").textContent=m}
    function openModal(a){action=a;const cfg={accepted:["ACCEPT QUOTATION","Confirm acceptance","Once confirmed, Luxsome Packaging will be notified that you are ready to proceed.","Optional comment"],needs_revision:["REQUEST CHANGES","Tell us what should change","Describe the changes you would like Luxsome Packaging to make.","Requested changes"],declined:["DECLINE QUOTATION","Let us know why","Your feedback helps us understand how we can improve.","Optional comment"]}[a];$("responseEyebrow").textContent=cfg[0];$("responseTitle").textContent=cfg[1];$("responseDescription").textContent=cfg[2];$("commentLabel").textContent=cfg[3];$("reasonField").hidden=a!=="declined";$("responseComment").value="";$("responseReason").value="";$("responseStatus").textContent="";$("responseBackdrop").hidden=false;$("responseModal").classList.add("is-open");$("responseModal").setAttribute("aria-hidden","false")}
    function closeModal(){$("responseBackdrop").hidden=true;$("responseModal").classList.remove("is-open");$("responseModal").setAttribute("aria-hidden","true")}
    async function submit(){const b=$("submitResponse");b.disabled=true;b.textContent="Submitting...";$("responseStatus").textContent="";try{const d=await api("/public/quotations/"+encodeURIComponent(token),{method:"POST",body:JSON.stringify({action,comment:$("responseComment").value.trim(),reason:$("responseReason").value})});closeModal();quote.status=action;showCompleted(action,d.message)}catch(e){$("responseStatus").textContent=e.message}finally{b.disabled=false;b.textContent="Confirm"}}
    function showCompleted(s,msg){$("responseSection").hidden=true;$("completedResponse").hidden=false;const cfg={accepted:["✓","Quotation accepted","Thank you — Luxsome Packaging has been notified and will contact you about the next steps."],needs_revision:["↻","Changes requested","Your requested changes have been sent to Luxsome Packaging."],declined:["—","Response received","Thank you for letting us know."],expired:["!","Quotation expired","This quotation has passed its validity date."],cancelled:["!","Quotation unavailable","This quotation is no longer active."]}[s];$("completedIcon").textContent=cfg[0];$("completedTitle").textContent=cfg[1];$("completedMessage").textContent=msg||cfg[2];$("quoteStatus").textContent=statusLabel(s)}
    document.querySelectorAll("[data-response]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.response)));$("closeResponseModal").addEventListener("click",closeModal);$("responseBackdrop").addEventListener("click",closeModal);$("submitResponse").addEventListener("click",submit);document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});load();
    })();