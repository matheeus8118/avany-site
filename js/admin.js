// ================================================================
// ADMIN.JS — Lógica do Painel Administrativo Avany
// ================================================================

let _editingId = null;
let _deleteId  = null;

async function doLogout() {
  await Avany.auth.logout();
}

function showPanel() {
  document.getElementById('panel').style.display = 'flex';
  loadView('dashboard');
  startClock();
}

// ── Clock ────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('adm-clock');
  const tick = () => {
    el.textContent = new Date().toLocaleString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  };
  tick();
  setInterval(tick, 30_000);
}

// ── View switcher ────────────────────────────────────────────
function loadView(name) {
  const views = ['dashboard', 'produtos', 'promocoes'];

  views.forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === name ? 'block' : 'none';
    document.getElementById(`nav-${v}`)?.classList.toggle('active', v === name);
  });

  if (name === 'dashboard')  renderDashboard();
  if (name === 'produtos')   renderProductTable();
  if (name === 'promocoes')  renderPromoTable();
}

// ── Dashboard ────────────────────────────────────────────────
function renderDashboard() {
  const all    = Avany.products.get();
  const active = all.filter(p => p.active !== false);
  const promos = all.filter(p => p.promotion?.active);
  const cats   = new Set(all.map(p => p.category).filter(Boolean));

  document.getElementById('stats-grid').innerHTML = [
    buildStatCard('📦', all.length,    'Total de Produtos', 'var(--gold)'),
    buildStatCard('✅', active.length, 'Produtos Ativos',   'var(--green)'),
    buildStatCard('🏷️', promos.length, 'Promoções Ativas',  'var(--purple)'),
    buildStatCard('📂', cats.size,     'Categorias',        'var(--orange)'),
  ].join('');

  const recent = all.slice(0, 8);
  document.getElementById('dash-recent').innerHTML = recent.length
    ? buildTable(recent)
    : buildEmpty('Nenhum produto cadastrado ainda.');
}

function buildStatCard(icon, value, label, color) {
  return `
    <div class="stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-val" style="color:${color}">${value}</div>
      <div class="stat-lbl">${label}</div>
    </div>`;
}

// ── Product table ────────────────────────────────────────────
function renderProductTable(search) {
  if (search === undefined) {
    search = document.getElementById('prod-search')?.value || '';
  }

  const catFilter = document.getElementById('prod-cat-filter')?.value || '';
  let products = Avany.products.get();

  if (search) {
    const q = search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  if (catFilter) {
    products = products.filter(p => p.category === catFilter);
  }

  refreshCategorySelect();

  const countLabel = document.getElementById('prod-count-lbl');
  if (countLabel) {
    countLabel.textContent = `${products.length} produto${products.length !== 1 ? 's' : ''}`;
  }

  document.getElementById('prod-table-wrap').innerHTML = products.length
    ? buildTable(products)
    : buildEmpty('Nenhum produto encontrado.');
}

function refreshCategorySelect() {
  const select = document.getElementById('prod-cat-filter');
  if (!select) return;

  const current = select.value;
  const cats    = [...new Set(Avany.products.get().map(p => p.category).filter(Boolean))].sort();

  select.innerHTML = '<option value="">Todas as categorias</option>'
    + cats.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
}

function buildTable(products) {
  const rows = products.map(buildProductRow).join('');
  return `
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th>Categoria</th>
          <th>Custo</th>
          <th>Cliente</th>
          <th>Margem</th>
          <th>Promoção</th>
          <th>Status</th>
          <th style="text-align:right">Ações</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildProductRow(p) {
  const hasPromo   = p.promotion?.active && p.promotion?.discountPercent > 0;
  const promoPrice = hasPromo
    ? Math.round(p.clientPrice * (1 - p.promotion.discountPercent / 100) * 100) / 100
    : null;

  const promoCell = hasPromo
    ? `<span class="badge badge-promo" onclick="quickDiscount('${p.id}')" style="cursor:pointer" title="Clique para ajustar">
         -${p.promotion.discountPercent}% · ${Avany.fmtPrice(promoPrice)}
       </span>`
    : `<button class="btn btn-ghost btn-sm" onclick="quickDiscount('${p.id}')">+ Criar</button>`;

  const statusBadge = p.active !== false
    ? `<span class="badge badge-on">● Ativo</span>`
    : `<span class="badge badge-inactive">○ Inativo</span>`;

  const thumb = p.imageUrl
    ? `<div class="prod-thumb"><img src="${escAttr(p.imageUrl)}" alt="" onerror="this.parentElement.innerHTML='<span>${escHtml(p.emoji||'📦')}</span>'"></div>`
    : `<div class="prod-thumb">${p.emoji || '📦'}</div>`;

  return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          ${thumb}
          <span style="font-weight:500;color:#ddd;">${escHtml(p.name)}</span>
        </div>
      </td>
      <td><span style="font-size:11px;color:#666;">${escHtml(p.category || '—')}</span></td>
      <td style="color:#888;">${Avany.fmtPrice(p.costPrice || 0)}</td>
      <td style="font-weight:600;color:#fff;">${Avany.fmtPrice(p.clientPrice || 0)}</td>
      <td><span style="color:var(--green);font-size:12px;">+${p.profitMargin || 0}%</span></td>
      <td>${promoCell}</td>
      <td>${statusBadge}</td>
      <td style="text-align:right">
        <button class="btn btn-ghost btn-sm" onclick="openModal('${p.id}')" style="margin-right:6px;">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="askDelete('${p.id}','${escAttr(p.name)}')">🗑️</button>
      </td>
    </tr>`;
}

// ── Promotions view ──────────────────────────────────────────
function renderPromoTable() {
  const all     = Avany.products.get();
  const active  = all.filter(p => p.promotion?.active);
  const without = all.filter(p => !p.promotion?.active);

  let html = '';

  if (active.length) {
    const rows = active.map(p => {
      const discounted = Math.round(p.clientPrice * (1 - p.promotion.discountPercent / 100) * 100) / 100;
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:22px;">${p.emoji || '📦'}</span>
              <span style="font-weight:500;color:#ddd;">${escHtml(p.name)}</span>
            </div>
          </td>
          <td><span style="font-size:11px;color:#666;">${escHtml(p.category || '—')}</span></td>
          <td style="color:#888;text-decoration:line-through;">${Avany.fmtPrice(p.clientPrice)}</td>
          <td><span class="badge badge-off">-${p.promotion.discountPercent}%</span></td>
          <td style="font-weight:700;color:var(--green);">${Avany.fmtPrice(discounted)}</td>
          <td style="font-size:12px;color:#888;">${escHtml(p.promotion.label || '—')}</td>
          <td style="font-size:12px;color:#666;">${p.promotion.endDate ? formatDate(p.promotion.endDate) : '—'}</td>
          <td style="text-align:right">
            <button class="btn btn-ghost btn-sm" onclick="openModal('${p.id}')" style="margin-right:4px;">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="removePromo('${p.id}')">✕</button>
          </td>
        </tr>`;
    }).join('');

    html += `
      <table>
        <thead>
          <tr>
            <th>Produto</th><th>Categoria</th><th>Preço Original</th>
            <th>Desconto</th><th>Preço Promo</th><th>Rótulo</th><th>Válido até</th>
            <th style="text-align:right">Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  } else {
    html += buildEmpty('Nenhuma promoção ativa no momento.');
  }

  if (without.length) {
    const cards = without.map(p => `
      <div class="promo-card">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;">${p.emoji || '📦'}</span>
          <div>
            <p style="font-size:12px;font-weight:500;color:#ccc;">${escHtml(p.name.substring(0, 28))}${p.name.length > 28 ? '…' : ''}</p>
            <p style="font-size:11px;color:#555;">${Avany.fmtPrice(p.clientPrice)}</p>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="quickDiscount('${p.id}')">+ Promo</button>
      </div>`).join('');

    html += `
      <div style="margin-top:20px;margin-bottom:12px;">
        <p style="font-size:14px;color:#666;">Sem promoção (${without.length})</p>
      </div>
      <div class="promo-card-grid">${cards}</div>`;
  }

  document.getElementById('promo-table-wrap').innerHTML = `<div style="padding:4px">${html}</div>`;
}

async function removePromo(id) {
  await Avany.products.update(id, {
    promotion: { active: false, discountPercent: 0, label: '', endDate: '' }
  });
  renderPromoTable();
  Avany.toast('Promoção removida!');
}

// ── Quick discount shortcut ───────────────────────────────────
function quickDiscount(id) {
  openModal(id);
  setTimeout(() => {
    document.getElementById('f-promo-toggle').checked = true;
    togglePromoZone();
  }, 80);
}

// ── Modal ────────────────────────────────────────────────────
function openModal(id) {
  _editingId = id || null;
  const p    = id ? Avany.products.get().find(x => x.id === id) : null;

  document.getElementById('modal-title').textContent = p ? 'Editar Produto' : 'Novo Produto';
  document.getElementById('save-btn').textContent    = p ? 'Salvar Alterações' : 'Salvar Produto';

  setField('f-name',      p?.name       || '');
  setField('f-emoji',     p?.emoji      || '📦');
  setField('f-category',  p?.category   || '');
  setField('f-imageUrl',  p?.imageUrl   || '');
  setField('f-cost',      p?.costPrice  != null ? p.costPrice  : '');
  setField('f-client',    p?.clientPrice != null ? p.clientPrice.toFixed(2) : '');
  setField('f-margin',    p?.profitMargin != null ? p.profitMargin : 50);
  setField('f-stars',     p?.stars      || 5);
  setField('f-reviews',   p?.reviews    || 0);

  document.getElementById('f-free-ship').checked = p?.freeShipping || false;
  document.getElementById('f-active').checked    = p?.active !== false;

  const promo = p?.promotion;
  document.getElementById('f-promo-toggle').checked = promo?.active || false;
  setField('f-discount',    promo?.discountPercent || 10);
  setField('f-promo-label', promo?.label   || '');
  setField('f-promo-end',   promo?.endDate || '');

  updateImagePreview();
  syncPricing();
  togglePromoZone();
  syncDiscount();

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('f-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  _editingId = null;
}

async function saveProduct() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) {
    alert('O nome do produto é obrigatório.');
    return;
  }

  const btn = document.getElementById('save-btn');
  btn.disabled   = true;
  btn.textContent = 'Salvando…';

  const costPrice    = parseFloat(document.getElementById('f-cost').value)    || 0;
  const clientPrice  = parseFloat(document.getElementById('f-client').value)  || 0;
  const profitMargin = parseInt(document.getElementById('f-margin').value)    || 0;
  const promoActive  = document.getElementById('f-promo-toggle').checked;
  const discPct      = parseInt(document.getElementById('f-discount').value)  || 0;
  const customLabel  = document.getElementById('f-promo-label').value.trim();

  const data = {
    name,
    emoji:        document.getElementById('f-emoji').value        || '📦',
    category:     document.getElementById('f-category').value.trim(),
    imageUrl:     document.getElementById('f-imageUrl').value.trim(),
    costPrice,
    profitMargin,
    clientPrice,
    freeShipping: document.getElementById('f-free-ship').checked,
    active:       document.getElementById('f-active').checked,
    stars:        parseFloat(document.getElementById('f-stars').value)   || 5,
    reviews:      parseInt(document.getElementById('f-reviews').value)   || 0,
    promotion: {
      active:          promoActive,
      discountPercent: promoActive ? discPct : 0,
      label:           promoActive ? (customLabel || `-${discPct}% OFF`) : '',
      endDate:         document.getElementById('f-promo-end').value || '',
    },
  };

  if (_editingId) {
    await Avany.products.update(_editingId, data);
    Avany.toast('✓ Produto atualizado!');
  } else {
    await Avany.products.add(data);
    Avany.toast('✓ Produto adicionado!');
  }

  btn.disabled    = false;
  btn.textContent = _editingId ? 'Salvar Alterações' : 'Salvar Produto';

  closeModal();
  renderDashboard();
  renderProductTable();
}

// ── Pricing sync ─────────────────────────────────────────────
function syncPricing() {
  const cost   = parseFloat(document.getElementById('f-cost').value)   || 0;
  const margin = parseInt(document.getElementById('f-margin').value)   || 0;
  const client = Avany.products.calcClientPrice(cost, margin);

  document.getElementById('f-client').value         = client.toFixed(2);
  document.getElementById('margin-display').textContent = margin + '%';
  document.getElementById('pb-cost').textContent    = Avany.fmtPrice(cost);
  document.getElementById('pb-client').textContent  = Avany.fmtPrice(client);
  document.getElementById('pb-profit').textContent  = Avany.fmtPrice(client - cost);

  syncDiscount();
}

function syncFromClient() {
  const cost   = parseFloat(document.getElementById('f-cost').value)   || 0;
  const client = parseFloat(document.getElementById('f-client').value) || 0;

  if (cost > 0 && client >= cost) {
    const margin = Math.round((client / cost - 1) * 100);
    document.getElementById('f-margin').value            = Math.min(200, Math.max(0, margin));
    document.getElementById('margin-display').textContent = margin + '%';
  }

  document.getElementById('pb-cost').textContent   = Avany.fmtPrice(cost);
  document.getElementById('pb-client').textContent = Avany.fmtPrice(client);
  document.getElementById('pb-profit').textContent = Avany.fmtPrice(client - cost);

  syncDiscount();
}

function syncDiscount() {
  const pct        = parseInt(document.getElementById('f-discount').value)  || 0;
  const client     = parseFloat(document.getElementById('f-client').value)  || 0;
  const discounted = Math.round(client * (1 - pct / 100) * 100) / 100;

  document.getElementById('disc-display').textContent  = pct + '%';
  document.getElementById('promo-preview').textContent =
    `De ${Avany.fmtPrice(client)} por ${Avany.fmtPrice(discounted)} (economia de ${Avany.fmtPrice(client - discounted)})`;
}

function togglePromoZone() {
  const isOn = document.getElementById('f-promo-toggle').checked;
  document.getElementById('promo-zone').classList.toggle('show', isOn);
  if (isOn) syncDiscount();
}

// ── Image preview ─────────────────────────────────────────────
function updateImagePreview() {
  const url   = document.getElementById('f-imageUrl').value.trim();
  const emoji = document.getElementById('f-emoji').value || '📦';
  const prev  = document.getElementById('img-preview');

  if (url) {
    prev.innerHTML = `<img src="${escAttr(url)}" alt="" onerror="this.parentElement.innerHTML='<span style=font-size:36px>${escHtml(emoji)}</span>'">`;
  } else {
    prev.textContent = emoji;
  }
}

// ── Delete ────────────────────────────────────────────────────
function askDelete(id, name) {
  _deleteId = id;
  document.getElementById('confirm-name').textContent = name;
  document.getElementById('confirm-overlay').classList.add('open');
}

function closeConfirm() {
  _deleteId = null;
  document.getElementById('confirm-overlay').classList.remove('open');
}

async function confirmDelete() {
  if (!_deleteId) return;
  await Avany.products.remove(_deleteId);
  closeConfirm();
  renderProductTable();
  renderDashboard();
  Avany.toast('Produto removido.', 'error');
}

// ── Import / Export ───────────────────────────────────────────
function exportData() {
  const json = JSON.stringify(Avany.products.get(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `avany-produtos-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      Avany.products.save(data);
      renderDashboard();
      renderProductTable();
      Avany.toast(`✓ ${data.length} produtos importados!`);
    } catch {
      Avany.toast('Erro ao importar JSON.', 'error');
    }
  };

  reader.readAsText(file);
  event.target.value = '';
}

// ── Helpers ───────────────────────────────────────────────────
function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function buildEmpty(message) {
  return `
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-text">${message}</div>
    </div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(s) {
  return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Avany.products.seed();

  if (!Avany.auth.isAdmin()) {
    window.location.href = 'login.html';
    return;
  }

  showPanel();
});
