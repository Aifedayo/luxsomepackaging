
const toggle=document.querySelector("[data-menu-toggle]"),nav=document.querySelector("[data-site-nav]");
toggle?.addEventListener("click",()=>{const open=nav.classList.toggle("is-open");toggle.setAttribute("aria-expanded",String(open))});
document.querySelectorAll("[data-year]").forEach(el=>el.textContent=new Date().getFullYear());
