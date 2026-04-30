// ================================================================
// LOJA.JS — Catálogo dinâmico da loja Avany
// ================================================================

let _activeFilter = 'all';

// ── Init ─────────────────────────────────────────────────────
async function initPage() {
  Avany.initHeader();
  if (typeof renderBanners === 'function') renderBanners();
  buildCategoryNav();
  renderCatalog('all');

  // Pull latest products from API in background, re-render if data arrived
  const fresh = await Avany.products.sync();
  if (fresh && fresh.length > 0) {
    buildCategoryNav();
    renderCatalog(_activeFilter);
  }
}

// ── Category nav ──────────────────────────────────────────────
function buildCategoryNav() {
  const products   = Avany.products.getActive();
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const nav  = document.getElementById('cat-nav');
  const pills = document.getElementById('cat-filters');

  nav.innerHTML = `<span class="cat-link" onclick="filterCatalog('all')">🏠 Todos</span>`
    + categories.map(c => `<span class="cat-link" onclick="filterCatalog('${c}')">${c}</span>`).join('');

  pills.innerHTML = ['Todos', ...categories].map((c, i) => {
    const filterVal = c === 'Todos' ? 'all' : c;
    return `<button class="filter-pill${i === 0 ? ' active' : ''}" data-cat="${filterVal}" onclick="filterCatalog('${filterVal}')">${c}</button>`;
  }).join('');
}

// ── Catalog render ────────────────────────────────────────────
function renderCatalog(filter) {
  _activeFilter = filter;

  const all      = Avany.products.getActive();
  const filtered = filter === 'all' ? all : all.filter(p => p.category === filter);

  updateFilterPills(filter);
  updateCatalogTitle(filter);

  const grid  = document.getElementById('product-grid');
  const empty = document.getElementById('catalog-empty');

  if (filtered.length === 0) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
  } else {
    grid.style.display  = 'grid';
    empty.style.display = 'none';
    grid.innerHTML = filtered.map(renderCard).join('');
  }

  if (filter !== 'all') {
    document.getElementById('catalog-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateFilterPills(activeFilter) {
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === activeFilter);
  });
}

function updateCatalogTitle(filter) {
  const title = document.getElementById('cat-title');
  const sub   = document.getElementById('cat-sub');

  if (filter === 'all') {
    title.textContent = 'Nosso Catálogo 🛍️';
    sub.textContent   = 'Tudo para você';
  } else {
    title.textContent = `${filter} 🛍️`;
    sub.textContent   = 'Categoria';
  }
}

// ── Search ────────────────────────────────────────────────────
function searchProducts(query) {
  const q    = (query || '').toLowerCase().trim();
  const all  = Avany.products.getActive();
  const list = q
    ? all.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      )
    : all;

  const grid  = document.getElementById('product-grid');
  const empty = document.getElementById('catalog-empty');
  const title = document.getElementById('cat-title');

  title.textContent = q ? `Resultados para "${q}"` : 'Nosso Catálogo 🛍️';

  if (list.length === 0) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
  } else {
    grid.style.display  = 'grid';
    empty.style.display = 'none';
    grid.innerHTML = list.map(renderCard).join('');
  }
}

// ── Filter shortcut (from explore grid) ──────────────────────
function filterCatalog(category) {
  document.getElementById('search-input').value = '';
  renderCatalog(category);
}

// ── Card template ─────────────────────────────────────────────
function renderCard(product) {
  const promo      = product.promotion?.active && product.promotion?.discountPercent > 0;
  const price      = promo
    ? Math.round(product.clientPrice * (1 - product.promotion.discountPercent / 100) * 100) / 100
    : product.clientPrice;
  const installment = Math.round(price / 12 * 100) / 100;
  const stars       = Math.round(product.stars || 4);

  const starsHtml = '★'.repeat(stars) + '☆'.repeat(5 - stars);

  const imgHtml = product.imageUrl
    ? `<img src="${esc(product.imageUrl)}" alt="${esc(product.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <span style="font-size:52px;display:none;align-items:center;justify-content:center;width:100%;height:100%;">${product.emoji || '📦'}</span>`
    : `<span style="font-size:52px;">${product.emoji || '📦'}</span>`;

  const promoLabel = product.promotion?.label || `-${product.promotion?.discountPercent}% OFF`;

  return `
    <div class="product-card">
      <div class="product-img">${imgHtml}</div>

      ${promo ? `<span class="badge badge-off">${esc(promoLabel)}</span>` : ''}

      <p style="font-size:12px;color:#888;margin:6px 0 2px;line-height:1.3;">${esc(product.name)}</p>

      ${promo ? `<p class="price-old">${Avany.fmtPrice(product.clientPrice)}</p>` : ''}
      <p class="price-main">${Avany.fmtPrice(price)}</p>
      <p style="font-size:11px;color:#666;">12x de ${Avany.fmtPrice(installment)}</p>

      <div class="stars" style="margin-top:6px;">
        ${starsHtml}
        <span style="color:#666;font-size:10px;">(${product.reviews || 0})</span>
      </div>

      ${product.freeShipping ? `<span class="badge badge-frete" style="margin-top:6px;">Frete grátis</span>` : ''}

      <button
        onclick="addToCart('${esc(product.id)}')"
        style="width:100%;margin-top:10px;padding:8px 0;background:linear-gradient(135deg,#c9a04c,#e8c96d);border:none;border-radius:8px;color:#111;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;transition:opacity .2s,transform .15s;"
        onmouseover="this.style.opacity='.85';this.style.transform='translateY(-1px)'"
        onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">
        + Adicionar
      </button>
    </div>`;
}

// ── Add to cart ───────────────────────────────────────────────
function addToCart(id) {
  const product = Avany.products.get().find(p => p.id === id);
  if (!product) return;

  const promo = product.promotion?.active && product.promotion?.discountPercent > 0;
  const price = promo
    ? Math.round(product.clientPrice * (1 - product.promotion.discountPercent / 100) * 100) / 100
    : product.clientPrice;

  Avany.cart.add({
    id:    product.id,
    name:  product.name,
    price,
    emoji: product.emoji || '📦',
  });
}

// ── Escape helper ─────────────────────────────────────────────
function esc(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
