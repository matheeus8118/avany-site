import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ==================== CONTEXT ====================

const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);

// ==================== API SERVICE ====================

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await API.get('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    navigate('/');
    return data;
  };

  const register = async (email, password, name) => {
    const { data } = await API.post('/auth/register', { email, password, name });
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    navigate('/');
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ==================== COMPONENTS ====================

function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
        <Link to="/" className="text-xl font-light tracking-widest">
          minha conta
        </Link>

        <nav className="flex gap-6 items-center">
          {user ? (
            <>
              <Link to="/" className="text-sm hover:text-gray-500">Início</Link>
              <Link to="/documents" className="text-sm hover:text-gray-500">Documentos</Link>
              <Link to="/addresses" className="text-sm hover:text-gray-500">Endereços</Link>
              <Link to="/account" className="text-sm hover:text-gray-500">Perfil</Link>
              <button
                onClick={logout}
                className="text-sm px-4 py-2 border border-gray-900 hover:bg-gray-900 hover:text-white transition"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm px-4 py-2 border border-gray-900 hover:bg-gray-900 hover:text-white transition"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="text-sm px-4 py-2 bg-gray-900 text-white hover:bg-gray-800"
              >
                Criar Conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-12">Carregando...</div>;
  return user ? children : <Navigate to="/login" />;
}

// ==================== PAGES ====================

function Home() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-light mb-2">Olá, {user?.name}</h1>
      <p className="text-gray-500 mb-10">{user?.email}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/documents" className="border border-gray-200 p-6 hover:border-gray-400 transition">
          <div className="text-2xl mb-3">📄</div>
          <h2 className="font-medium mb-1">Documentos</h2>
          <p className="text-sm text-gray-500">Gerencie seu CPF ou CNPJ</p>
        </Link>

        <Link to="/addresses" className="border border-gray-200 p-6 hover:border-gray-400 transition">
          <div className="text-2xl mb-3">📍</div>
          <h2 className="font-medium mb-1">Endereços</h2>
          <p className="text-sm text-gray-500">Adicione e edite seus endereços</p>
        </Link>

        <Link to="/account" className="border border-gray-200 p-6 hover:border-gray-400 transition">
          <div className="text-2xl mb-3">👤</div>
          <h2 className="font-medium mb-1">Perfil</h2>
          <p className="text-sm text-gray-500">Edite seus dados e senha</p>
        </Link>
      </div>
    </div>
  );
}

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState({ document_type: 'CPF', document_number: '', document_name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/auth/documents').then(({ data }) => setDocuments(data.documents));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/documents', form);
      setSuccess(data.message);
      const updated = await API.get('/auth/documents');
      setDocuments(updated.data.documents);
      setForm({ document_type: 'CPF', document_number: '', document_name: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar documento');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = { pending: 'Pendente', verified: 'Verificado', rejected: 'Rejeitado' };
  const statusColor = { pending: 'text-yellow-600', verified: 'text-green-600', rejected: 'text-red-600' };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-light mb-10">Documentos</h1>

      {documents.length > 0 && (
        <div className="mb-10 space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="border border-gray-200 p-4 flex justify-between items-center">
              <div>
                <span className="font-medium">{doc.document_type}</span>
                <span className="text-gray-500 ml-3 text-sm">{doc.document_number}</span>
                {doc.document_name && <p className="text-sm text-gray-400 mt-1">{doc.document_name}</p>}
              </div>
              <span className={`text-sm ${statusColor[doc.status] || 'text-gray-500'}`}>
                {statusLabel[doc.status] || doc.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="border border-gray-200 p-6">
        <h2 className="text-lg font-light mb-4">Adicionar / Atualizar Documento</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={form.document_type}
            onChange={(e) => setForm({ ...form, document_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          >
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
          </select>

          <input
            type="text"
            placeholder={form.document_type === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
            value={form.document_number}
            onChange={(e) => setForm({ ...form, document_number: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
            required
          />

          <input
            type="text"
            placeholder="Nome no documento (opcional)"
            value={form.document_name}
            onChange={(e) => setForm({ ...form, document_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Documento'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const emptyForm = { street: '', number: '', complement: '', city: '', state: '', zip_code: '', is_default: false };
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAddresses = () =>
    API.get('/auth/addresses').then(({ data }) => setAddresses(data.addresses));

  useEffect(() => { fetchAddresses(); }, []);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setError(''); setShowForm(true); };
  const openEdit = (addr) => { setForm(addr); setEditingId(addr.id); setError(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editingId) {
        await API.put(`/auth/addresses/${editingId}`, form);
      } else {
        await API.post('/auth/addresses', form);
      }
      await fetchAddresses();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar endereço');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este endereço?')) return;
    await API.delete(`/auth/addresses/${id}`);
    await fetchAddresses();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-light">Endereços</h1>
        {!showForm && (
          <button onClick={openNew} className="text-sm px-4 py-2 bg-gray-900 text-white hover:bg-gray-800">
            + Novo Endereço
          </button>
        )}
      </div>

      {!showForm && (
        <div className="space-y-4">
          {addresses.length === 0 && (
            <p className="text-gray-500">Nenhum endereço cadastrado.</p>
          )}
          {addresses.map(addr => (
            <div key={addr.id} className="border border-gray-200 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {addr.street}, {addr.number}
                    {addr.complement && ` — ${addr.complement}`}
                  </p>
                  <p className="text-sm text-gray-500">{addr.city} — {addr.state} · {addr.zip_code}</p>
                  {addr.is_default && <span className="text-xs text-green-600 mt-1 inline-block">Principal</span>}
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => openEdit(addr)} className="hover:underline">Editar</button>
                  <button onClick={() => handleDelete(addr.id)} className="text-red-600 hover:underline">Remover</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border border-gray-200 p-6">
          <h2 className="text-lg font-light mb-4">{editingId ? 'Editar Endereço' : 'Novo Endereço'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Rua / Avenida"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Número"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
                required
              />
            </div>

            <input
              type="text"
              placeholder="Complemento (opcional)"
              value={form.complement}
              onChange={(e) => setForm({ ...form, complement: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Cidade"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
                required
              />
              <input
                type="text"
                placeholder="Estado (ex: SP)"
                maxLength={2}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
                required
              />
            </div>

            <input
              type="text"
              placeholder="CEP"
              value={form.zip_code}
              onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
              required
            />

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              Definir como endereço principal
            </label>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gray-900 text-white py-2 hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 border border-gray-900 py-2 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Account() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', phone: user.phone || '', password: '' });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = { name: form.name, phone: form.phone };
      if (form.password) payload.password = form.password;
      const { data } = await API.put('/auth/me', payload);
      updateUser(data.user);
      setSuccess('Perfil atualizado com sucesso');
      setForm(prev => ({ ...prev, password: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-light mb-10">Perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nome</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
            required
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-400"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
          <input
            type="text"
            placeholder="(00) 00000-0000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nova Senha (deixe em branco para manter)</label>
          <input
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
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
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-light mb-8">Entrar</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          required
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm mt-6">
        Não tem conta?{' '}
        <Link to="/register" className="font-medium hover:underline">Criar conta</Link>
      </p>
    </div>
  );
}

function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(formData.email, formData.password, formData.name);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-light mb-8">Criar Conta</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Nome"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          required
        />

        <input
          type="password"
          placeholder="Senha (mínimo 6 caracteres)"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-900"
          required
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Criando...' : 'Criar Conta'}
        </button>
      </form>

      <p className="text-center text-sm mt-6">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium hover:underline">Fazer login</Link>
      </p>
    </div>
  );
}

// ==================== MAIN APP ====================

function AppContent() {
  const { loading } = useAuth();

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute><Documents /></PrivateRoute>} />
          <Route path="/addresses" element={<PrivateRoute><Addresses /></PrivateRoute>} />
          <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-200 mt-12 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Minha Conta
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
