import React, { useState, useEffect, useContext, createContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import axios from 'axios';

// ==================== DADOS MOCK ====================

const PRODUCTS = [
  { id: 1, name: 'Sofá Confort 3 Lugares', category: 'Sala', price: 2890, oldPrice: 3400, description: 'Sofá moderno com estrutura em madeira maciça e tecido suede. Ideal para salas amplas.', color: '#D4B896' },
  { id: 2, name: 'Mesa de Centro Oslo', category: 'Sala', price: 890, oldPrice: null, description: 'Mesa de centro em MDF laqueado com pés em metal. Design escandinavo minimalista.', color: '#B8A89A' },
  { id: 3, name: 'Poltrona Velvet', category: 'Sala', price: 1290, oldPrice: 1590, description: 'Poltrona estofada em veludo com estrutura em madeira. Toque de elegância para qualquer ambiente.', color: '#9B8EA0' },
  { id: 4, name: 'Estante Modular Nord', category: 'Sala', price: 1650, oldPrice: null, description: 'Estante modular em MDF com acabamento amadeirado. Até 6 módulos combináveis.', color: '#C4A882' },
  { id: 5, name: 'Cama Queen Ibiza', category: 'Quarto', price: 3200, oldPrice: 3800, description: 'Cama queen com cabeceira estofada e estrutura em madeira de lei. Inclui suporte para colchão.', color: '#A8B5C4' },
  { id: 6, name: 'Guarda-Roupa 6 Portas', category: 'Quarto', price: 4100, oldPrice: null, description: 'Guarda-roupa amplo com espelho interno, gavetas e cabideiro duplo. Em MDF 15mm.', color: '#C4BEB8' },
  { id: 7, name: 'Criado-Mudo Slim', category: 'Quarto', price: 420, oldPrice: 550, description: 'Criado-mudo com uma gaveta e nicho aberto. Design slim para quartos compactos.', color: '#D4CCC4' },
  { id: 8, name: 'Mesa de Jantar Tokio', category: 'Cozinha', price: 1980, oldPrice: null, description: 'Mesa de jantar para 6 pessoas em madeira maciça e tampo de vidro temperado.', color: '#C4A882' },
  { id: 9, name: 'Cadeira Eames Réplica', category: 'Cozinha', price: 380, oldPrice: 480, description: 'Cadeira inspirada no design clássico Eames. Base em metal e assento estofado.', color: '#B8C4B8' },
  { id: 10, name: 'Banqueta Alta Loft', category: 'Cozinha', price: 290, oldPrice: null, description: 'Banqueta alta com regulagem de altura. Ideal para bancadas e ilhas de cozinha.', color: '#D4B896' },
  { id: 11, name: 'Mesa de Escritório L', category: 'Escritório', price: 1450, oldPrice: 1700, description: 'Mesa em L para escritório com 2 gavetas e suporte para CPU. Tampo duplo.', color: '#A8B8C4' },
  { id: 12, name: 'Cadeira Ergonômica Pro', category: 'Escritório', price: 2200, oldPrice: 2600, description: 'Cadeira ergonômica com suporte lombar ajustável, apoio de braço 4D e base giratória.', color: '#8A9AA0' },
];

const CATEGORIES = ['Todos', 'Sala', 'Quarto', 'Cozinha', 'Escritório'];

// ==================== CONTEXTS ====================

const AuthContext = createContext();
const CartContext = createContext();
const useAuth = () => useContext(AuthContext);
const useCart = () => useContext(CartContext);

// ==================== API ====================

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==================== AUTH PROVIDER ====================

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.get('/auth/me')
        .then(({ data }) => setUser(data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    navigate('/');
  };

  const register = async (email, password, name) => {
    const { data } = await API.post('/auth/register', { email, password, name });
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ==================== CART PROVIDER ====================

function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || []; }
    catch { return []; }
  });
  const [open, setOpen] = useState(false);

  const save = (updated) => {
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const add = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      const updated = exists
        ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { ...product, qty: 1 }];
      localStorage.setItem('cart', JSON.stringify(updated));
      return updated;
    });
    setOpen(true);
  };

  const remove = (id) => save(cart.filter(i => i.id !== id));

  const setQty = (id, qty) => {
    if (qty <= 0) return remove(id);
    save(cart.map(i => i.id === id ? { ...i, qty } : i));
  };

  const clear = () => save([]);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, add, remove, setQty, clear, total, count, open, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

// ==================== CART DRAWER ====================

function CartDrawer() {
  const { cart, remove, setQty, total, open, setOpen } = useCart();
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-medium">Carrinho</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <span className="text-5xl">🛋️</span>
            <p>Seu carrinho está vazio</p>
            <button onClick={() => setOpen(false)} className="text-sm text-gray-700 underline mt-2">
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded flex-shrink-0 flex items-center justify-center" style={{ background: item.color + '40' }}>
                    <span className="text-2xl">🛋️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">R$ {item.price.toLocaleString('pt-BR')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => setQty(item.id, item.qty - 1)} className="w-6 h-6 border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-50">−</button>
                      <span className="text-sm w-5 text-center">{item.qty}</span>
                      <button onClick={() => setQty(item.id, item.qty + 1)} className="w-6 h-6 border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-50">+</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">R$ {(item.price * item.qty).toLocaleString('pt-BR')}</p>
                    <button onClick={() => remove(item.id)} className="text-xs text-red-400 hover:text-red-600 mt-1">remover</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 border-t border-gray-100">
              <div className="flex justify-between mb-4">
                <span className="font-medium">Total</span>
                <span className="font-medium text-lg">R$ {total.toLocaleString('pt-BR')}</span>
              </div>
              <button
                onClick={() => { setOpen(false); navigate('/checkout'); }}
                className="w-full bg-gray-900 text-white py-3 hover:bg-gray-700 transition font-medium"
              >
                Finalizar Compra
              </button>
              <button onClick={() => setOpen(false)} className="w-full text-center text-sm text-gray-500 mt-3 hover:text-gray-700">
                Continuar comprando
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ==================== HEADER ====================

function Header() {
  const { user, logout } = useAuth();
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-light tracking-widest text-gray-900">
          möbel
        </Link>

        <nav className="hidden md:flex gap-8 text-sm text-gray-600">
          <Link to="/" className="hover:text-gray-900 transition">Loja</Link>
          <Link to="/?cat=Sala" className="hover:text-gray-900 transition">Sala</Link>
          <Link to="/?cat=Quarto" className="hover:text-gray-900 transition">Quarto</Link>
          <Link to="/?cat=Cozinha" className="hover:text-gray-900 transition">Cozinha</Link>
          <Link to="/?cat=Escritório" className="hover:text-gray-900 transition">Escritório</Link>
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={() => setOpen(true)} className="relative p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 bg-white border border-gray-100 shadow-lg w-44 py-2 z-50">
                  <p className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100">{user.name}</p>
                  <Link to="/orders" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">Meus Pedidos</Link>
                  <Link to="/account" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">Minha Conta</Link>
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50">Sair</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="text-sm px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 transition">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

// ==================== PRODUCT CARD ====================

function ProductCard({ product }) {
  const { add } = useCart();

  return (
    <div className="group cursor-pointer">
      <Link to={`/produto/${product.id}`}>
        <div
          className="aspect-square rounded-lg mb-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${product.color}30, ${product.color}60)` }}
        >
          <span className="text-6xl select-none">🛋️</span>
        </div>
      </Link>
      <div className="flex justify-between items-start">
        <div>
          <Link to={`/produto/${product.id}`}>
            <h3 className="text-sm font-medium text-gray-900 hover:text-gray-600 transition leading-snug">{product.name}</h3>
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-semibold text-gray-900">
              R$ {product.price.toLocaleString('pt-BR')}
            </span>
            {product.oldPrice && (
              <span className="text-xs text-gray-400 line-through">
                R$ {product.oldPrice.toLocaleString('pt-BR')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => add(product)}
          className="w-8 h-8 bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition flex-shrink-0 mt-0.5"
          title="Adicionar ao carrinho"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ==================== PAGES ====================

function Home() {
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');

  const filtered = PRODUCTS.filter(p => {
    const matchCat = category === 'Todos' || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-stone-50 border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <p className="text-sm text-stone-400 tracking-widest uppercase mb-3">Design & Conforto</p>
            <h1 className="text-5xl font-light text-gray-900 leading-tight mb-6">
              Móveis que<br />
              <span className="italic">transformam</span><br />
              seu lar.
            </h1>
            <p className="text-gray-500 mb-8 max-w-md">
              Peças selecionadas com design atemporal, materiais de qualidade e entrega para todo o Brasil.
            </p>
            <button
              onClick={() => document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3 bg-gray-900 text-white hover:bg-gray-700 transition font-medium"
            >
              Ver Coleção
            </button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 max-w-sm">
            {PRODUCTS.slice(0, 4).map(p => (
              <div key={p.id} className="aspect-square rounded-xl flex items-center justify-center text-4xl"
                style={{ background: `linear-gradient(135deg, ${p.color}25, ${p.color}55)` }}>
                🛋️
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap gap-2 items-center">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-5 py-2 text-sm whitespace-nowrap transition border ${
                category === cat
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ml-auto px-4 py-2 text-sm border border-gray-200 focus:outline-none focus:border-gray-400 w-52"
          />
        </div>
      </section>

      {/* Produtos */}
      <section id="produtos" className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-light text-gray-900">
            {category === 'Todos' ? 'Todos os Produtos' : category}
            <span className="text-gray-400 text-base ml-2">({filtered.length})</span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Nenhum produto encontrado.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Banner frete */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-sm tracking-widest text-gray-400 uppercase mb-3">Frete Grátis</p>
          <h2 className="text-3xl font-light mb-4">Em compras acima de R$ 2.000</h2>
          <p className="text-gray-400">Para todo o Brasil · Entrega de 7 a 15 dias úteis</p>
        </div>
      </section>
    </>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const { add } = useCart();
  const product = PRODUCTS.find(p => p.id === Number(id));

  if (!product) return <Navigate to="/" />;

  const related = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link to="/" className="text-sm text-gray-400 hover:text-gray-700 mb-8 inline-flex items-center gap-1">
        ← Voltar à loja
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-4">
        <div
          className="aspect-square rounded-2xl flex items-center justify-center text-9xl"
          style={{ background: `linear-gradient(135deg, ${product.color}25, ${product.color}55)` }}
        >
          🛋️
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-sm text-gray-400 tracking-wide uppercase mb-2">{product.category}</p>
          <h1 className="text-4xl font-light text-gray-900 mb-4">{product.name}</h1>
          <p className="text-gray-500 leading-relaxed mb-8">{product.description}</p>

          <div className="flex items-end gap-3 mb-8">
            <span className="text-3xl font-light text-gray-900">
              R$ {product.price.toLocaleString('pt-BR')}
            </span>
            {product.oldPrice && (
              <>
                <span className="text-lg text-gray-400 line-through mb-0.5">
                  R$ {product.oldPrice.toLocaleString('pt-BR')}
                </span>
                <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded mb-0.5">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          <div className="space-y-3 text-sm text-gray-500 mb-8 border-y border-gray-100 py-6">
            <div className="flex items-center gap-2"><span>✓</span><span>Frete grátis acima de R$ 2.000</span></div>
            <div className="flex items-center gap-2"><span>✓</span><span>Entrega de 7 a 15 dias úteis</span></div>
            <div className="flex items-center gap-2"><span>✓</span><span>30 dias para troca e devolução</span></div>
          </div>

          <button
            onClick={() => add(product)}
            className="w-full py-4 bg-gray-900 text-white hover:bg-gray-700 transition font-medium text-base"
          >
            Adicionar ao Carrinho
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="text-xl font-light mb-8">Você também pode gostar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Checkout() {
  const { cart, total, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', address: '', city: '', zip: '' });
  const [done, setDone] = useState(false);

  if (cart.length === 0 && !done) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-gray-500 mb-4">Seu carrinho está vazio.</p>
      <Link to="/" className="text-gray-900 underline">Voltar à loja</Link>
    </div>
  );

  if (done) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-3xl font-light mb-3">Pedido realizado!</h1>
      <p className="text-gray-500 mb-8">Obrigado pela sua compra. Você receberá um e-mail de confirmação em breve.</p>
      <Link to="/" className="px-8 py-3 bg-gray-900 text-white hover:bg-gray-700 transition">
        Continuar Comprando
      </Link>
    </div>
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    clear();
    setDone(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-light mb-12">Finalizar Compra</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
        <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
          <h2 className="text-lg font-medium mb-4">Dados de Entrega</h2>

          <input type="text" placeholder="Nome completo" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />

          <input type="email" placeholder="E-mail" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />

          <input type="text" placeholder="Endereço completo" value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />

          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Cidade" value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />
            <input type="text" placeholder="CEP" value={form.zip}
              onChange={e => setForm({ ...form, zip: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />
          </div>

          <h2 className="text-lg font-medium mt-8 mb-4">Pagamento</h2>
          <div className="border border-gray-200 p-4 flex items-center gap-3 bg-gray-50">
            <input type="radio" defaultChecked readOnly />
            <span className="text-sm">Cartão de Crédito (simulação)</span>
          </div>

          <button type="submit"
            className="w-full py-4 bg-gray-900 text-white hover:bg-gray-700 transition font-medium mt-4">
            Confirmar Pedido — R$ {total.toLocaleString('pt-BR')}
          </button>
        </form>

        <div className="md:col-span-2">
          <h2 className="text-lg font-medium mb-4">Resumo</h2>
          <div className="space-y-3 mb-6">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name} × {item.qty}</span>
                <span>R$ {(item.price * item.qty).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-4 flex justify-between font-medium">
            <span>Total</span>
            <span>R$ {total.toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-xs text-green-600 mt-2">
            {total >= 2000 ? '✓ Frete grátis aplicado' : `Adicione mais R$ ${(2000 - total).toLocaleString('pt-BR')} para frete grátis`}
          </p>
        </div>
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-10 shadow-sm">
        <Link to="/" className="block text-2xl font-light tracking-widest text-center mb-10">möbel</Link>
        <h1 className="text-2xl font-light mb-8 text-center">Entrar na conta</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="E-mail" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />

          <input type="password" placeholder="Senha" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gray-900 text-white hover:bg-gray-700 transition disabled:opacity-50 font-medium">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-gray-500">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-gray-900 underline">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form.email, form.password, form.name);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-10 shadow-sm">
        <Link to="/" className="block text-2xl font-light tracking-widest text-center mb-10">möbel</Link>
        <h1 className="text-2xl font-light mb-8 text-center">Criar conta</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Nome completo" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />

          <input type="email" placeholder="E-mail" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />

          <input type="password" placeholder="Senha (mínimo 6 caracteres)" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900" required />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gray-900 text-white hover:bg-gray-700 transition disabled:opacity-50 font-medium">
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-gray-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-gray-900 underline">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}

function Account() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-light mb-10">Minha Conta</h1>
      <div className="border border-gray-100 p-6 space-y-5 shadow-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Nome</p>
          <p className="font-medium">{user.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">E-mail</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div className="border-t border-gray-100 pt-5 space-y-3">
          <Link to="/orders" className="block text-sm text-gray-700 hover:text-gray-900 hover:underline">
            Meus Pedidos
          </Link>
          <button onClick={logout}
            className="block text-sm text-red-500 hover:text-red-700">
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}

function Orders() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-light mb-10">Meus Pedidos</h1>
      <div className="text-center py-16 text-gray-400">
        <span className="text-5xl block mb-4">📦</span>
        <p>Você ainda não tem pedidos.</p>
        <Link to="/" className="text-sm text-gray-700 underline mt-3 inline-block">Ir às compras</Link>
      </div>
    </div>
  );
}

// ==================== APP ====================

function AppLayout() {
  const { loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/account" element={<Account />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-light tracking-widest mb-4">möbel</h3>
            <p className="text-sm text-gray-400">Design e conforto para o seu lar.</p>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4 text-gray-300">Categorias</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-white transition">Sala</Link></li>
              <li><Link to="/" className="hover:text-white transition">Quarto</Link></li>
              <li><Link to="/" className="hover:text-white transition">Cozinha</Link></li>
              <li><Link to="/" className="hover:text-white transition">Escritório</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4 text-gray-300">Ajuda</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Frete e Entrega</li>
              <li>Trocas e Devoluções</li>
              <li>Atendimento</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4 text-gray-300">Contato</h4>
            <p className="text-sm text-gray-400">contato@mobel.com.br</p>
            <p className="text-sm text-gray-400 mt-1">(11) 9 9999-9999</p>
          </div>
        </div>
        <div className="border-t border-gray-800 py-4">
          <p className="text-center text-xs text-gray-600">&copy; {new Date().getFullYear()} Möbel. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppLayout />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
