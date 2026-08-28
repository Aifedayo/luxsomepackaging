export function apiBase(){return window.LUXSOME?.apiBase||'';}
export function itemsFromFlat(flat){if(!flat)return[];return flat.split('||').filter(Boolean).map(x=>{const [category,...rest]=x.split('::');return{category,product:rest.join('::')}})}
export function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
export async function patch(path,status){const r=await fetch(`${apiBase()}${path}`,{method:'PATCH',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({status})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).message||'Update failed');}
