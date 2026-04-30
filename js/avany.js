// ================================================================
// AVANY.JS — Estado global compartilhado entre todas as páginas
// ================================================================

// ── Supabase config — substitua pelos valores do seu projeto ────
const SUPABASE_URL      = 'https://hqskbchyyldbisqdyttj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_n62pIhl0E3YJRCKRQUX03g_WmmjD9yd';
const ADMIN_EMAIL       = 'matheeus998@gmail.com';
// ────────────────────────────────────────────────────────────────

const Avany = (function () {
  const CART_KEY     = 'avany_cart';
  const USER_KEY     = 'avany_user';
  const PRODUCTS_KEY = 'avany_products';

  // ── Supabase client (lazy singleton) ────────────────────────
  let _sbClient = null;
  function _sb() {
    if (_sbClient) return _sbClient;
    if (typeof supabase === 'undefined' || SUPABASE_URL.includes('YOUR_PROJECT')) return null;
    _sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _sbClient;
  }

  // ── Row mappers (DB snake_case ↔ JS camelCase) ────────────────
  function _fromDb(row) {
    return {
      id:           row.id,
      name:         row.name,
      emoji:        row.emoji          || '📦',
      category:     row.category       || '',
      costPrice:    Number(row.cost_price),
      profitMargin: Number(row.profit_margin),
      clientPrice:  Number(row.client_price),
      imageUrl:     row.image_url      || '',
      freeShipping: row.free_shipping,
      active:       row.active,
      stars:        Number(row.stars),
      reviews:      row.reviews,
      promotion: {
        active:          row.promo_active,
        discountPercent: row.promo_discount,
        label:           row.promo_label    || '',
        endDate:         row.promo_end_date || '',
      },
    };
  }

  function _toDb(product) {
    const promo = product.promotion || {};
    return {
      name:           product.name,
      emoji:          product.emoji          || '📦',
      category:       product.category       || '',
      cost_price:     product.costPrice      || 0,
      profit_margin:  product.profitMargin   || 50,
      client_price:   product.clientPrice    || 0,
      image_url:      product.imageUrl       || '',
      free_shipping:  product.freeShipping   || false,
      active:         product.active         !== false,
      stars:          product.stars          || 5,
      reviews:        product.reviews        || 0,
      promo_active:   promo.active           || false,
      promo_discount: promo.discountPercent  || 0,
      promo_label:    promo.label            || '',
      promo_end_date: promo.endDate          || '',
    };
  }

  // ── AUTH ────────────────────────────────────────────────────
  const auth = {
    get() {
      try { return JSON.parse(localStorage.getItem(USER_KEY)); }
      catch { return null; }
    },
    set(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); },

    async login(email, password) {
      const sb = _sb();
      if (!sb) throw new Error('Configure o Supabase em js/avany.js');

      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const isAdmin = email === ADMIN_EMAIL;
      const name = email.split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      this.set({ name, email, isAdmin });
      return isAdmin;
    },

    async logout() {
      const sb = _sb();
      if (sb) await sb.auth.signOut();
      localStorage.removeItem(USER_KEY);
      window.location.href = 'index.html';
    },

    isAdmin() {
      try { return this.get()?.isAdmin === true; }
      catch { return false; }
    },

    async register(email, password, meta = {}) {
      const sb = _sb();
      if (!sb) throw new Error('Supabase não configurado.');
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: meta,
          emailRedirectTo: 'https://avanymoveiseletronicos.web.app/login.html',
        },
      });
      if (error) throw error;
      return data;
    },

    async resetPassword(email) {
      const sb = _sb();
      if (!sb) throw new Error('Supabase não configurado.');
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://avanymoveiseletronicos.web.app/login.html',
      });
      if (error) throw error;
    },
  };

  // ── PRODUCTS ────────────────────────────────────────────────
  const SEED = [
    { id:'seed-1',  name:'Geladeira Frost Free 480L Inox',       emoji:'❄️',  category:'Eletrodomésticos', costPrice:2200, profitMargin:41, clientPrice:3099.90, imageUrl:'', freeShipping:true,  active:true, stars:5, reviews:248, promotion:{active:true,  discountPercent:28, label:'-28% OFF', endDate:''} },
    { id:'seed-2',  name:'Smart TV LED 55" 4K UHD Wi-Fi',        emoji:'🖥️',  category:'TV e Vídeo',        costPrice:1850, profitMargin:22, clientPrice:2249.90, imageUrl:'', freeShipping:true,  active:true, stars:4, reviews:193, promotion:{active:true,  discountPercent:22, label:'-22% OFF', endDate:''} },
    { id:'seed-3',  name:'Air Fryer Digital 5,5L 1700W',          emoji:'🍟',  category:'Eletrodomésticos', costPrice:250,  profitMargin:60, clientPrice:399.90,  imageUrl:'', freeShipping:false, active:true, stars:5, reviews:512, promotion:{active:false, discountPercent:0,  label:'',        endDate:''} },
    { id:'seed-4',  name:'Notebook Intel i5 8GB SSD 512GB',       emoji:'💻',  category:'Informática',       costPrice:2700, profitMargin:22, clientPrice:3299.00, imageUrl:'', freeShipping:true,  active:true, stars:5, reviews:87,  promotion:{active:true,  discountPercent:15, label:'-15% OFF', endDate:''} },
    { id:'seed-5',  name:'Máquina de Lavar 11kg Inverter',        emoji:'🌀',  category:'Eletrodomésticos', costPrice:1300, profitMargin:38, clientPrice:1799.90, imageUrl:'', freeShipping:true,  active:true, stars:4, reviews:341, promotion:{active:false, discountPercent:0,  label:'',        endDate:''} },
    { id:'seed-6',  name:'Smartphone 128GB 5G Câmera 50MP',       emoji:'📱',  category:'Celulares',         costPrice:1200, profitMargin:27, clientPrice:1529.10, imageUrl:'', freeShipping:false, active:true, stars:5, reviews:420, promotion:{active:true,  discountPercent:10, label:'-10% OFF', endDate:''} },
    { id:'seed-7',  name:'Fone Bluetooth ANC 30h bateria',        emoji:'🎧',  category:'Áudio',             costPrice:160,  profitMargin:56, clientPrice:249.90,  imageUrl:'', freeShipping:false, active:true, stars:5, reviews:689, promotion:{active:false, discountPercent:0,  label:'',        endDate:''} },
    { id:'seed-8',  name:'Sofá Retrátil 3 Lugares Veludo',        emoji:'🛋️',  category:'Móveis',            costPrice:1400, profitMargin:40, clientPrice:1959.30, imageUrl:'', freeShipping:true,  active:true, stars:5, reviews:176, promotion:{active:true,  discountPercent:30, label:'-30% OFF', endDate:''} },
    { id:'seed-9',  name:'Fogão 5 Bocas Inox Auto Acendimento',   emoji:'🍳',  category:'Eletrodomésticos', costPrice:900,  profitMargin:44, clientPrice:1299.90, imageUrl:'', freeShipping:false, active:true, stars:4, reviews:203, promotion:{active:false, discountPercent:0,  label:'',        endDate:''} },
    { id:'seed-10', name:'PS5 Console Digital + 2 Jogos',         emoji:'🎮',  category:'Games',             costPrice:3100, profitMargin:19, clientPrice:3689.00, imageUrl:'', freeShipping:true,  active:true, stars:5, reviews:532, promotion:{active:true,  discountPercent:18, label:'-18% OFF', endDate:''} },
    { id:'seed-11', name:'Smartwatch GPS Monitor Cardíaco',        emoji:'⌚',  category:'Eletrônicos',       costPrice:500,  profitMargin:35, clientPrice:674.25,  imageUrl:'', freeShipping:false, active:true, stars:5, reviews:317, promotion:{active:true,  discountPercent:25, label:'-25% OFF', endDate:''} },
    { id:'seed-12', name:'Cafeteira Espresso 19 Bar Inox',         emoji:'☕',  category:'Eletrodomésticos', costPrice:400,  profitMargin:50, clientPrice:599.90,  imageUrl:'', freeShipping:false, active:true, stars:5, reviews:445, promotion:{active:false, discountPercent:0,  label:'',        endDate:''} },
    { id:'seed-13', name:'Cama Box Casal Queen Size Ortobom',      emoji:'🛏️',  category:'Móveis',            costPrice:1500, profitMargin:39, clientPrice:2079.35, imageUrl:'', freeShipping:true,  active:true, stars:5, reviews:228, promotion:{active:true,  discountPercent:35, label:'-35% OFF', endDate:''} },
    { id:'seed-14', name:'Cadeira Gamer Ergonômica Reclinável',    emoji:'🪑',  category:'Móveis',            costPrice:600,  profitMargin:50, clientPrice:899.90,  imageUrl:'', freeShipping:false, active:true, stars:4, reviews:156, promotion:{active:false, discountPercent:0,  label:'',        endDate:''} },
    { id:'seed-15', name:'Robô Aspirador Wi-Fi Mapeamento',        emoji:'🧹',  category:'Eletrodomésticos', costPrice:850,  profitMargin:41, clientPrice:1199.20, imageUrl:'', freeShipping:true,  active:true, stars:4, reviews:164, promotion:{active:true,  discountPercent:20, label:'-20% OFF', endDate:''} },
  ];

  const products = {
    get() {
      try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || []; }
      catch { return []; }
    },
    save(items) { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(items)); },

    seed() {
      if (!localStorage.getItem(PRODUCTS_KEY)) this.save(SEED);
      this.sync().then(data => { if (data && data.length > 0) this.save(data); });
    },

    // ── Busca do Supabase → atualiza localStorage ────────────
    async sync() {
      const sb = _sb();
      if (!sb) return null;
      try {
        const { data, error } = await sb
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const mapped = data.map(_fromDb);
        this.save(mapped);
        return mapped;
      } catch { return null; }
    },

    async add(product) {
      const sb  = _sb();
      const row = { id: 'prod-' + Date.now(), ..._toDb(product) };
      if (sb) {
        const { data, error } = await sb.from('products').insert(row).select().single();
        if (!error) {
          const p = _fromDb(data);
          this.save([p, ...this.get()]);
          return p;
        }
      }
      // Fallback offline
      const p = { ...product, id: row.id };
      this.save([p, ...this.get()]);
      return p;
    },

    async update(id, product) {
      const sb = _sb();
      if (sb) {
        const { data, error } = await sb
          .from('products')
          .update(_toDb(product))
          .eq('id', id)
          .select()
          .single();
        if (!error) {
          this.save(this.get().map(p => p.id === id ? _fromDb(data) : p));
          return;
        }
      }
      // Fallback offline
      this.save(this.get().map(p => p.id === id ? { ...p, ...product } : p));
    },

    async remove(id) {
      const sb = _sb();
      if (sb) await sb.from('products').delete().eq('id', id);
      this.save(this.get().filter(p => p.id !== id));
    },

    getActive()   { return this.get().filter(p => p.active !== false); },
    calcClientPrice(costPrice, margin) {
      return Math.round(costPrice * (1 + margin / 100) * 100) / 100;
    },
  };

  // ── BANNERS ─────────────────────────────────────────────────
  const BANNERS_KEY = 'avany_banners';
  const BANNER_DEFAULTS = [
    { active:true, theme:'gold',  badge:'⚡ Oferta por tempo limitado', title1:'Festival de',  title2:'Eletro',       subtitle:'Cupons de até',  price:'R$ 500',    priceNote:'+ Frete grátis em todo o site*', btnText:'Ver Ofertas →',      btnFilter:'all',      products:[{emoji:'🖥️',name:'Smart TV 55"',    price:'R$ 2.499,00'},{emoji:'❄️', name:'Geladeira 480L',price:'R$ 3.899,00'},{emoji:'🍟',name:'Air Fryer 5L',  price:'R$ 349,90'}] },
    { active:true, theme:'blue',  badge:'🆕 Lançamento',                title1:'Novos',        title2:'Smartphones',  subtitle:'A partir de',    price:'R$ 899,90', priceNote:'',                               btnText:'Ver Lançamentos →', btnFilter:'Celulares', products:[{emoji:'📱',name:'iPhone 15',       price:'R$ 4.999,00'},{emoji:'📲',name:'Samsung S24',  price:'R$ 3.799,00'}] },
    { active:true, theme:'green', badge:'🛋️ Estoque limitado',           title1:'Móveis',       title2:'Premium',      subtitle:'Até 40% OFF',    price:'',          priceNote:'+ Montagem grátis em SP',        btnText:'Ver Móveis →',      btnFilter:'Móveis',   products:[{emoji:'🛋️',name:'Sofá Retrátil',  price:'R$ 1.899,00'},{emoji:'🪑',name:'Cadeira Gamer',price:'R$ 999,00'}] },
  ];

  const banners = {
    get()       { try { return JSON.parse(localStorage.getItem(BANNERS_KEY)) || BANNER_DEFAULTS; } catch { return BANNER_DEFAULTS; } },
    save(data)  { localStorage.setItem(BANNERS_KEY, JSON.stringify(data)); },
    defaults()  { return JSON.parse(JSON.stringify(BANNER_DEFAULTS)); },
  };

  // ── CART ────────────────────────────────────────────────────
  const cart = {
    get() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
      catch { return []; }
    },
    save(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); },
    add(product) {
      const items    = this.get();
      const existing = items.find(i => i.id === product.id);
      if (existing) existing.qty++;
      else items.push({ ...product, qty: 1 });
      this.save(items);
      _updateBadge();
      toast('✓ ' + product.name.substring(0, 30) + '… adicionado!');
    },
    remove(id) {
      this.save(this.get().filter(i => i.id !== id));
      _updateBadge();
    },
    updateQty(id, qty) {
      const items = this.get();
      const item  = items.find(i => i.id === id);
      if (item) { item.qty = Math.max(1, parseInt(qty) || 1); this.save(items); }
      _updateBadge();
    },
    count()    { return this.get().reduce((s, i) => s + i.qty, 0); },
    subtotal() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
    clear()    { localStorage.removeItem(CART_KEY); _updateBadge(); },
  };

  // ── UTILS ───────────────────────────────────────────────────
  function _updateBadge() {
    const count = cart.count();
    document.querySelectorAll('[data-cart-badge]').forEach(el => {
      el.textContent   = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function toast(msg, type = 'success') {
    document.querySelector('.avany-toast')?.remove();
    const c = type === 'success'
      ? { bg: '#0d1f0d', border: '#4ade8055', text: '#4ade80' }
      : { bg: '#1f0d0d', border: '#f8717155', text: '#f87171' };
    const el = document.createElement('div');
    el.className = 'avany-toast';
    Object.assign(el.style, {
      position: 'fixed', bottom: '28px', left: '50%',
      transform: 'translateX(-50%) translateY(12px)',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '11px 22px', borderRadius: '12px', fontSize: '13px',
      fontFamily: 'Inter,sans-serif', zIndex: '99999', opacity: '0',
      transition: 'all .3s', whiteSpace: 'nowrap',
      boxShadow: '0 8px 32px rgba(0,0,0,.5)',
    });
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      el.style.opacity   = '0';
      el.style.transform = 'translateX(-50%) translateY(12px)';
      setTimeout(() => el.remove(), 300);
    }, 2500);
  }

  function fmtPrice(n) {
    return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

  // ── HEADER ──────────────────────────────────────────────────
  function initHeader() {
    _updateBadge();
    const area = document.getElementById('header-user');
    if (!area) return;
    const user = auth.get();
    if (user) {
      const initials  = user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const adminLink = auth.isAdmin()
        ? `<a href="admin.html" style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;font-size:13px;color:#c9a04c;text-decoration:none;border:1px solid #c9a04c33;margin-bottom:4px;transition:background .15s;" onmouseover="this.style.background='#c9a04c15'" onmouseout="this.style.background='transparent'">⚙️ Painel Admin</a>`
        : '';
      area.innerHTML = `
        <div style="position:relative;">
          <button onclick="document.getElementById('umenu').classList.toggle('hidden')"
            style="background:transparent;border:none;display:flex;flex-direction:column;
            align-items:center;gap:3px;cursor:pointer;padding:8px 10px;border-radius:8px;transition:background .2s;"
            onmouseover="this.style.background='#1e1e1e'" onmouseout="this.style.background='transparent'">
            <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#c9a04c,#e8c96d);
              display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#111;">
              ${initials}
            </div>
            <span style="font-size:11px;color:#c9a04c;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${user.name.split(' ')[0]}
            </span>
          </button>
          <div id="umenu" class="hidden" style="position:absolute;right:0;top:calc(100% + 6px);
            background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:8px;
            min-width:180px;box-shadow:0 16px 40px rgba(0,0,0,.6);z-index:200;">
            <div style="padding:10px 14px 8px;border-bottom:1px solid #222;margin-bottom:6px;">
              <p style="font-size:13px;font-weight:600;color:#fff;">${user.name}</p>
              <p style="font-size:11px;color:#555;">${user.email}</p>
            </div>
            ${adminLink}
            ${_menuItem('conta.html',     '👤', 'Minha Conta')}
            ${_menuItem('conta.html#ped', '📦', 'Meus Pedidos')}
            ${_menuItem('conta.html#end', '📍', 'Endereços')}
            <div style="height:1px;background:#222;margin:6px 0;"></div>
            <button onclick="Avany.auth.logout()"
              style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;
              font-size:13px;color:#f87171;background:transparent;border:none;cursor:pointer;
              width:100%;text-align:left;font-family:Inter,sans-serif;transition:background .15s;"
              onmouseover="this.style.background='#2a1010'" onmouseout="this.style.background='transparent'">
              🚪 Sair
            </button>
          </div>
        </div>`;
      document.addEventListener('click', e => {
        const m = document.getElementById('umenu');
        if (m && !e.target.closest('#header-user')) m.classList.add('hidden');
      });
    } else {
      area.innerHTML = `
        <a href="login.html" style="display:flex;flex-direction:column;align-items:center;gap:3px;
          cursor:pointer;padding:8px 10px;border-radius:8px;text-decoration:none;transition:background .2s;"
          onmouseover="this.style.background='#1e1e1e'" onmouseout="this.style.background='transparent'">
          <svg width="22" height="22" fill="none" stroke="#aaa" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span style="font-size:11px;color:#888;">Entrar</span>
        </a>`;
    }
  }

  function _menuItem(href, icon, label) {
    return `<a href="${href}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;
      border-radius:8px;font-size:13px;color:#ccc;text-decoration:none;transition:background .15s;"
      onmouseover="this.style.background='#222'" onmouseout="this.style.background='transparent'">${icon} ${label}</a>`;
  }

  // ── PUBLIC API ──────────────────────────────────────────────
  return { auth, cart, products, banners, toast, fmtPrice, initHeader, updateBadge: _updateBadge, sb: _sb };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  Avany.products.seed();
  Avany.updateBadge();
  if (typeof initPage === 'function') initPage();
});
