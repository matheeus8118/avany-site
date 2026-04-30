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
  const views = ['dashboard', 'produtos', 'promocoes', 'pedidos', 'banners'];

  views.forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === name ? 'block' : 'none';
    document.getElementById(`nav-${v}`)?.classList.toggle('active', v === name);
  });

  if (name === 'dashboard')  renderDashboard();
  if (name === 'produtos')   renderProductTable();
  if (name === 'promocoes')  renderPromoTable();
  if (name === 'pedidos')    renderOrdersView();
  if (name === 'banners')    renderBannerEditor();
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

// ── Orders ────────────────────────────────────────────────────
const STATUS_LABELS = {
  pendente:              { label: 'Pendente',            color: '#c9a04c', bg: '#c9a04c18' },
  aguardando_pagamento:  { label: 'Aguard. Pagamento',   color: '#f87171', bg: '#f8717118' },
  preparando:            { label: 'Em Preparação',       color: '#60a5fa', bg: '#60a5fa18' },
  enviado:               { label: 'Enviado',             color: '#a78bfa', bg: '#a78bfa18' },
  entregue:              { label: 'Entregue',            color: '#4ade80', bg: '#4ade8018' },
  cancelado:             { label: 'Cancelado',           color: '#6b7280', bg: '#6b728018' },
};

function renderOrdersView() {
  const filter = document.getElementById('order-status-filter')?.value || '';
  let   all    = Avany.orders.get();
  const total  = all.length;
  const filtered = filter ? all.filter(o => o.status === filter) : all;

  // Stats
  const counts = { pendente:0, aguardando_pagamento:0, preparando:0, enviado:0, entregue:0, cancelado:0 };
  all.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
  document.getElementById('orders-stats').innerHTML = [
    buildStatCard('🛍️', total,                    'Total Pedidos',      'var(--gold)'),
    buildStatCard('⏳', counts.pendente + counts.aguardando_pagamento, 'Aguardando', '#f87171'),
    buildStatCard('📦', counts.preparando + counts.enviado,            'Em Andamento','#60a5fa'),
    buildStatCard('✅', counts.entregue,           'Entregues',         'var(--green)'),
  ].join('');

  document.getElementById('orders-count-lbl').textContent =
    filter ? `${filtered.length} de ${total} pedido(s)` : `${total} pedido(s) no total`;

  if (filtered.length === 0) {
    document.getElementById('orders-table-wrap').innerHTML = buildEmpty(
      total === 0
        ? 'Nenhum pedido ainda. Clique em "+ Pedidos demo" para ver um exemplo.'
        : 'Nenhum pedido com esse status.'
    );
    return;
  }

  const rows = filtered.map(o => {
    const s   = STATUS_LABELS[o.status] || { label: o.status, color: '#888', bg: '#1a1a1a' };
    const dt  = new Date(o.date);
    const dtf = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    const itemsSummary = (o.items || []).slice(0, 2).map(i => i.emoji + ' ' + i.name.substring(0, 22)).join('<br>');
    const payIcon = { card:'💳', pix:'⚡', boleto:'📄' }[o.payment?.method] || '💰';
    return `
    <tr style="border-bottom:1px solid #1e1e1e;cursor:pointer;" onclick="toggleOrderDetail('${o.id}')">
      <td style="padding:14px 16px;font-size:13px;font-weight:600;color:var(--gold);white-space:nowrap;">#${o.id}</td>
      <td style="padding:14px 8px;font-size:12px;color:#666;white-space:nowrap;">${dtf}</td>
      <td style="padding:14px 8px;">
        <p style="font-size:13px;font-weight:500;color:#ddd;">${o.customer?.name || '—'}</p>
        <p style="font-size:11px;color:#555;">${o.customer?.email || ''}</p>
      </td>
      <td style="padding:14px 8px;font-size:12px;color:#888;line-height:1.6;">${itemsSummary}${(o.items||[]).length > 2 ? `<br><span style="color:#555;">+${(o.items||[]).length-2} item(s)</span>` : ''}</td>
      <td style="padding:14px 8px;font-size:13px;font-weight:700;color:#fff;white-space:nowrap;">${Avany.fmtPrice(o.total||0)}</td>
      <td style="padding:14px 8px;font-size:12px;color:#888;">${payIcon} ${o.payment?.method === 'card' ? o.payment?.installments+'x' : (o.payment?.method||'—')}</td>
      <td style="padding:14px 8px;">
        <span style="background:${s.bg};color:${s.color};border:1px solid ${s.color}44;border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;white-space:nowrap;">${s.label}</span>
      </td>
      <td style="padding:14px 8px;"><span style="font-size:12px;color:#555;">▼</span></td>
    </tr>
    <tr id="detail-${o.id}" style="display:none;">
      <td colspan="8" style="padding:0;background:#111;border-bottom:1px solid #1e1e1e;">
        ${buildOrderDetail(o)}
      </td>
    </tr>`;
  }).join('');

  document.getElementById('orders-table-wrap').innerHTML = `
    <div class="tbl-wrap">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #2a2a2a;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Pedido</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Data</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Cliente</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Itens</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Total</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Pgto</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Status</th>
            <th style="padding:10px 8px;"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildOrderDetail(o) {
  const addr = o.address || {};
  const itemsHtml = (o.items || []).map(i => `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #1e1e1e;">
      <span style="font-size:28px;flex-shrink:0;">${i.emoji||'📦'}</span>
      <div style="flex:1;min-width:0;">
        <p style="font-size:13px;color:#ddd;font-weight:500;">${i.name}</p>
        <p style="font-size:11px;color:#666;">Qtd: ${i.qty} × ${Avany.fmtPrice(i.price)}</p>
      </div>
      <span style="font-size:13px;font-weight:700;color:#fff;">${Avany.fmtPrice(i.price * i.qty)}</span>
    </div>`).join('');

  const opts = Object.entries(STATUS_LABELS).map(([k, v]) =>
    `<option value="${k}" ${o.status===k?'selected':''}>${v.label}</option>`).join('');

  return `
  <div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;">
    <div>
      <p style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Itens do Pedido</p>
      ${itemsHtml}
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;"><span>Subtotal</span><span>${Avany.fmtPrice(o.subtotal||0)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;"><span>Frete</span><span>${o.shipping===0?'Grátis':Avany.fmtPrice(o.shipping||0)}</span></div>
        ${o.discount>0?`<div style="display:flex;justify-content:space-between;font-size:12px;color:#4ade80;"><span>Desconto Pix (5%)</span><span>-${Avany.fmtPrice(o.discount)}</span></div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:#fff;border-top:1px solid #2a2a2a;padding-top:6px;margin-top:4px;"><span>Total</span><span>${Avany.fmtPrice(o.total||0)}</span></div>
      </div>
    </div>
    <div>
      <p style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Endereço de Entrega</p>
      <p style="font-size:13px;color:#ddd;line-height:1.7;">
        ${addr.street||'—'}${addr.number?', '+addr.number:''}<br>
        ${addr.complement?addr.complement+'<br>':''}
        ${addr.city||''}${addr.state?' — '+addr.state:''}<br>
        CEP: ${addr.cep||'—'}
      </p>
    </div>
    <div>
      <p style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Atualizar Status</p>
      <select id="status-sel-${o.id}" style="width:100%;background:#1e1e1e;border:1.5px solid #2a2a2a;border-radius:8px;padding:10px 12px;font-size:13px;color:#ccc;font-family:'Inter',sans-serif;outline:none;margin-bottom:10px;cursor:pointer;">
        ${opts}
      </select>
      <button onclick="saveOrderStatus('${o.id}')" style="width:100%;padding:10px;background:linear-gradient(135deg,#c9a04c,#e8c96d,#b8892a);color:#111;font-weight:700;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:'Inter',sans-serif;">Salvar Status</button>
      <p style="font-size:11px;color:#555;margin-top:12px;">Cliente: <span style="color:#888;">${o.customer?.email||'—'}</span></p>
    </div>
  </div>`;
}

function toggleOrderDetail(id) {
  const row = document.getElementById('detail-' + id);
  if (!row) return;
  const open = row.style.display !== 'none';
  // Fecha todos, abre o clicado
  document.querySelectorAll('[id^="detail-"]').forEach(r => r.style.display = 'none');
  if (!open) row.style.display = 'table-row';
}

function saveOrderStatus(id) {
  const sel = document.getElementById('status-sel-' + id);
  if (!sel) return;
  Avany.orders.updateStatus(id, sel.value);
  Avany.toast('✓ Status atualizado para "' + STATUS_LABELS[sel.value]?.label + '"');
  renderOrdersView();
}

function seedDemoOrders() {
  const demo = [
    { id:'AVN-2026-0038', date:'2026-04-15T10:22:00', customer:{name:'Maria Silva',email:'maria@example.com'}, address:{cep:'01310-100',street:'Rua das Flores',number:'123',complement:'Apto 4',city:'São Paulo',state:'SP'}, payment:{method:'pix',installments:1}, items:[{id:'seed-6',name:'Smartphone 128GB 5G',emoji:'📱',price:1529.10,qty:1}], subtotal:1529.10,shipping:0,discount:76.46,total:1452.64, status:'entregue' },
    { id:'AVN-2026-0041', date:'2026-04-22T14:30:00', customer:{name:'João Costa',email:'joao@example.com'}, address:{cep:'01311-000',street:'Av. Paulista',number:'1000',complement:'',city:'São Paulo',state:'SP'}, payment:{method:'card',installments:12}, items:[{id:'seed-2',name:'Smart TV LED 55" 4K',emoji:'🖥️',price:2249.90,qty:1},{id:'seed-7',name:'Fone Bluetooth ANC',emoji:'🎧',price:249.90,qty:1}], subtotal:2499.80,shipping:0,discount:0,total:2499.80, status:'enviado' },
    { id:'AVN-2026-0044', date:'2026-04-28T09:15:00', customer:{name:'Ana Oliveira',email:'ana@example.com'}, address:{cep:'01304-000',street:'Rua Augusta',number:'500',complement:'',city:'São Paulo',state:'SP'}, payment:{method:'boleto',installments:1}, items:[{id:'seed-8',name:'Sofá Retrátil 3 Lugares',emoji:'🛋️',price:1959.30,qty:1}], subtotal:1959.30,shipping:29.90,discount:0,total:1989.20, status:'preparando' },
    { id:'AVN-2026-0047', date:'2026-04-29T16:45:00', customer:{name:'Pedro Lima',email:'pedro@example.com'}, address:{cep:'01426-001',street:'Rua Oscar Freire',number:'200',complement:'Casa',city:'São Paulo',state:'SP'}, payment:{method:'card',installments:6}, items:[{id:'seed-4',name:'Notebook Intel i5',emoji:'💻',price:3299.00,qty:1},{id:'seed-11',name:'Smartwatch GPS',emoji:'⌚',price:674.25,qty:1}], subtotal:3973.25,shipping:0,discount:0,total:3973.25, status:'pendente' },
  ];
  const existing = Avany.orders.get();
  const ids = new Set(existing.map(o => o.id));
  demo.filter(d => !ids.has(d.id)).forEach(d => Avany.orders.add(d));
  renderOrdersView();
  Avany.toast('✓ Pedidos de demonstração adicionados!');
}

// ── Banner Editor ─────────────────────────────────────────────
function renderBannerEditor() {
  const data  = Avany.banners.get();
  const names = ['Slide 1 — Dourado', 'Slide 2 — Azul', 'Slide 3 — Verde'];
  const themes = ['gold', 'blue', 'green'];

  document.getElementById('banner-saved-msg').style.display = 'none';
  document.getElementById('banner-editor').innerHTML = data.map((b, i) => {
    const prods = (b.products || [{emoji:'',name:'',price:''},{emoji:'',name:'',price:''}]).map((p, pi) => `
      <div style="display:grid;grid-template-columns:60px 1fr 120px;gap:8px;align-items:center;">
        <input type="text" value="${p.emoji}" placeholder="📱" data-bi="${i}" data-pi="${pi}" data-f="emoji"
          style="background:#111;border:1.5px solid #2a2a2a;border-radius:8px;padding:8px;font-size:20px;text-align:center;color:#e0e0e0;outline:none;font-family:Inter,sans-serif;" />
        <input type="text" value="${p.name}" placeholder="Nome do produto" data-bi="${i}" data-pi="${pi}" data-f="name"
          style="background:#111;border:1.5px solid #2a2a2a;border-radius:8px;padding:8px 12px;font-size:13px;color:#e0e0e0;outline:none;font-family:Inter,sans-serif;" />
        <input type="text" value="${p.price}" placeholder="R$ 0,00" data-bi="${i}" data-pi="${pi}" data-f="price"
          style="background:#111;border:1.5px solid #2a2a2a;border-radius:8px;padding:8px 12px;font-size:13px;color:#e0e0e0;outline:none;font-family:Inter,sans-serif;" />
      </div>`).join('');

    return `
    <div style="background:#161616;border:1px solid ${b.active?'#c9a04c44':'#222'};border-radius:16px;overflow:hidden;" id="banner-card-${i}">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:#1a1a1a;border-bottom:1px solid #222;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:15px;font-weight:600;color:${b.active?'#fff':'#555'};">${names[i]||'Slide '+(i+1)}</span>
          ${b.active
            ? '<span style="font-size:11px;background:#0d1f0d;color:#4ade80;border:1px solid #4ade8033;border-radius:20px;padding:3px 10px;">● Ativo</span>'
            : '<span style="font-size:11px;background:#1a1a1a;color:#555;border:1px solid #333;border-radius:20px;padding:3px 10px;">○ Inativo</span>'}
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#888;">
          <span>${b.active ? 'Desativar' : 'Ativar'}</span>
          <div onclick="toggleBanner(${i})" style="width:44px;height:24px;border-radius:12px;background:${b.active?'#c9a04c':'#333'};position:relative;cursor:pointer;transition:background .2s;">
            <div style="position:absolute;top:3px;${b.active?'right:3px':'left:3px'};width:18px;height:18px;border-radius:50%;background:#fff;transition:all .2s;"></div>
          </div>
        </label>
      </div>

      <div style="padding:20px;display:${b.active?'flex':'none'};flex-direction:column;gap:16px;" id="banner-fields-${i}">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          ${bannerField(i,'badge','Badge / Etiqueta',b.badge,'⚡ Oferta por tempo limitado')}
          ${bannerField(i,'theme','Tema de cor','','','select',themes)}
          ${bannerField(i,'title1','Título linha 1',b.title1,'Festival de')}
          ${bannerField(i,'title2','Título linha 2 (destaque)',b.title2,'Eletro')}
          ${bannerField(i,'subtitle','Subtítulo',b.subtitle,'Cupons de até')}
          ${bannerField(i,'price','Preço em destaque',b.price,'R$ 500')}
          ${bannerField(i,'priceNote','Nota abaixo do preço',b.priceNote,'+ Frete grátis*')}
          ${bannerField(i,'btnText','Texto do botão',b.btnText,'Ver Ofertas →')}
          ${bannerField(i,'btnFilter','Filtro do botão (categoria ou "all")',b.btnFilter,'all')}
        </div>

        <div>
          <p style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Produtos exibidos no banner</p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:grid;grid-template-columns:60px 1fr 120px;gap:8px;">
              <p style="font-size:10px;color:#444;text-align:center;">Emoji</p>
              <p style="font-size:10px;color:#444;">Nome</p>
              <p style="font-size:10px;color:#444;">Preço</p>
            </div>
            ${prods}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Set theme selects to current value
  data.forEach((b, i) => {
    const sel = document.querySelector(`select[data-bi="${i}"][data-f="theme"]`);
    if (sel) sel.value = b.theme || 'gold';
  });
}

function bannerField(bi, field, label, value, placeholder, type='text', options=[]) {
  const base = `background:#111;border:1.5px solid #2a2a2a;border-radius:8px;padding:9px 12px;font-size:13px;color:#e0e0e0;outline:none;font-family:Inter,sans-serif;width:100%;`;
  let input;
  if (type === 'select') {
    input = `<select data-bi="${bi}" data-f="${field}" style="${base}cursor:pointer;">
      ${options.map(o => `<option value="${o}">${o.charAt(0).toUpperCase()+o.slice(1)}</option>`).join('')}
    </select>`;
  } else {
    input = `<input type="text" value="${(value||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}" data-bi="${bi}" data-f="${field}" style="${base}" />`;
  }
  return `<div><label style="display:block;font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px;">${label}</label>${input}</div>`;
}

function toggleBanner(i) {
  const data = Avany.banners.get();
  data[i].active = !data[i].active;
  Avany.banners.save(data);
  renderBannerEditor();
}

function saveBanners() {
  const data = Avany.banners.get();

  // Read all fields from inputs
  document.querySelectorAll('#banner-editor input[data-bi], #banner-editor select[data-bi]').forEach(el => {
    const bi = +el.dataset.bi;
    const f  = el.dataset.f;
    const pi = el.dataset.pi;
    if (pi !== undefined) {
      if (!data[bi].products[+pi]) data[bi].products[+pi] = {};
      data[bi].products[+pi][f] = el.value.trim();
    } else {
      data[bi][f] = el.value.trim();
    }
  });

  Avany.banners.save(data);
  const msg = document.getElementById('banner-saved-msg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 4000);
}

function resetBanners() {
  if (!confirm('Restaurar os banners para o padrão original?')) return;
  Avany.banners.save(Avany.banners.defaults());
  renderBannerEditor();
}
