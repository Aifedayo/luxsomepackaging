document.addEventListener('DOMContentLoaded', () => {
    const sort = document.getElementById('shopSort');
    const grid = document.getElementById('productGrid');
    if (sort && grid) {
      sort.addEventListener('change', () => {
        const cards = [...grid.querySelectorAll('.product-card')];
        cards.sort((a, b) => {
          if (sort.value === 'items-low') return Number(a.dataset.items) - Number(b.dataset.items);
          if (sort.value === 'items-high') return Number(b.dataset.items) - Number(a.dataset.items);
          return Number(a.dataset.order) - Number(b.dataset.order);
        });
        cards.forEach(card => grid.appendChild(card));
      });
    }
  
    const mainImage = document.getElementById('productMainImage');
    document.querySelectorAll('.product-thumb').forEach(button => {
      button.addEventListener('click', () => {
        if (!mainImage) return;
        mainImage.src = button.dataset.image;
        document.querySelectorAll('.product-thumb').forEach(item => item.classList.remove('is-active'));
        button.classList.add('is-active');
      });
    });
  
    const form = document.getElementById('productConfigForm');
    const product = document.querySelector('.product-detail');
    const submitConfiguration = () => {
      if (!form || !product) return;
      const data = new FormData(form);
      const params = new URLSearchParams();
      params.set('source', 'shop');
      params.set('product', product.dataset.product || '');
      params.set('system', product.dataset.productName || '');
      params.set('box_style', data.get('boxStyle') || '');
      params.set('finish', data.get('finish') || '');
      params.set('foil', data.get('foil') || '');
      params.set('quantity', data.get('quantity') || '');
      params.set('comments', data.get('comments') || '');
      params.set('extras', data.getAll('extras').join(', '));
      localStorage.setItem('luxsomeShopConfiguration', JSON.stringify(Object.fromEntries(params.entries())));
      window.location.href = `/start-project/?${params.toString()}`;
    };
    form?.addEventListener('submit', event => { event.preventDefault(); submitConfiguration(); });
    document.getElementById('mobileBuyButton')?.addEventListener('click', submitConfiguration);
  });
  