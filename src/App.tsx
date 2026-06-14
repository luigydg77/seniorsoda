import React, { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, Layers, Phone, User as UserIcon, LogIn, UserPlus, AlertCircle, Sparkles } from 'lucide-react';
import AdminLTE from './components/AdminLTE';
import { Product, Order, UserProfile } from './types';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Global user profile state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('current_user_profile');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login & Registration Interface states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Synchronize data from server database
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [prodRes, ordRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders')
      ]);

      if (!prodRes.ok || !ordRes.ok) {
        throw new Error('No se pudo conectar con la base de datos');
      }

      const prodData = await prodRes.json();
      const ordData = await ordRes.json();

      setProducts(prodData);
      setOrders(ordData);
      setError('');
    } catch (err: any) {
      console.error('Data sync error:', err);
      setError('Problema sincronizando datos del servidor. Intentando reconectar...');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Sync data on startup
  useEffect(() => {
    fetchData();

    // 3 seconds intervals to guarantee immediate "Real-Time" reaction on both sidecards!
    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    const formattedPhone = phoneInput.trim();
    if (!formattedPhone) {
      setAuthError('Por favor ingresa tu número de WhatsApp.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('current_user_profile', JSON.stringify(data.user));
        localStorage.setItem('last_user_whatsapp', data.user.phoneNumber);
      } else {
        setAuthError(data.error || 'Número de WhatsApp no registrado. Regístrate para entrar.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Error de red. Intenta nuevamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Registration submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const formattedPhone = phoneInput.trim();
    const formattedName = nameInput.trim();

    if (!formattedPhone || !formattedName) {
      setAuthError('Por favor completa todos los campos.');
      return;
    }

    if (formattedPhone.length < 4) {
      setAuthError('El número de WhatsApp o contraseña debe tener al menos 4 dígitos.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          fullName: formattedName
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('current_user_profile', JSON.stringify(data.user));
        localStorage.setItem('last_user_whatsapp', data.user.phoneNumber);
      } else {
        setAuthError(data.error || 'No se pudo realizar el registro.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setAuthError('Error de red al intentar registrarse.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Global Logout callback
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('current_user_profile');
    localStorage.removeItem('last_user_whatsapp');
    setPhoneInput('');
    setNameInput('');
    setAuthError('');
  };

  // Sync whatsappUser context
  const whatsappUser = currentUser?.phoneNumber || '';
  const handleSetWhatsappUser = (phone: string) => {
    if (!phone) {
      handleLogout();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col antialiased">
      {/* Connection warning header if database offline */}
      {error && (
        <div className="bg-amber-600 text-white text-xs text-center py-2 px-4 shadow flex items-center justify-center gap-2 animate-pulse shrink-0 z-30">
          <Database className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Core workspace */}
      <main className="flex-1 w-full flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-24 space-y-4">
            <RefreshCw className="w-10 h-10 animate-spin text-blue-650" />
            <p className="text-sm font-semibold tracking-wide">Iniciando Servidor Express de Inventario...</p>
          </div>
        ) : !currentUser ? (
          /* LOGIN & REGISTRATION LAYOUT PANEL */
          <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-neutral-105">
            {/* Left side banner */}
            <div className="lg:w-1/2 bg-slate-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden select-none">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-600/30 via-slate-900 to-slate-950 z-0" />
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="bg-yellow-500 rounded-xl p-2.5 flex items-center justify-center text-slate-950 font-bold shadow-lg">
                  <Layers className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h1 className="font-black text-lg tracking-wider text-yellow-500 uppercase">Señor Soda</h1>
                  <p className="text-xs text-slate-400 font-semibold tracking-wide">Compra de manera eficiente</p>
                </div>
              </div>

       {/*       <div className="relative z-10 my-10 max-w-md space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                  <Sparkles className="w-3 h-3" /> Conectado con Firebase Firestore
                </span>
                <h2 className="text-3xl font-black leading-tight tracking-tight text-white lg:text-4xl">
                  Controla tu inventario con el poder de WhatsApp.
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Accede a la compra y venta de bebidas, refrescos y energizantes en tiempo real. Configuración rápida, roles de usuario y métricas avanzadas.
                </p>
              </div>

              <div className="relative z-10 text-xs text-slate-500 flex items-center gap-2">
                <span>Diseño AdminLTE 2.4.18 • React v19</span>
              </div>
        */}
            </div>

            {/* Right side Authentication form */}
            <div className="lg:w-1/2 p-6 lg:p-16 flex items-center justify-center bg-neutral-50 relative z-10">
              <div className="max-w-md w-full space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {authMode === 'login' ? 'Bienvenido de vuelta' : 'Crear nueva cuenta'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {authMode === 'login' 
                      ? 'Ingresa tu número de WhatsApp registrado para comenzar a gestionar tus compras o catálogo.'
                      : 'Regístrate solo con tu número de WhatsApp y nombre. El inventario se actualizará automáticamente.'}
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                    <span className="font-medium">{authError}</span>
                  </div>
                )}

                <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                  {/* Phone input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                      WhatsApp / Número de celular
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 77777777 "
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-xs text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Name input (only in register mode) */}
                  {authMode === 'register' && (
                    <div className="space-y-1.5 animate-slide-down">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                        Nombre Completo
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Ingresa tu nombre y apellido"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-xs text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">
                        * Ingresa datos reales
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : authMode === 'login' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Iniciar Sesión</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Registrarse y Entrar</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 text-center">
                  {authMode === 'login' ? (
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setAuthError(''); }}
                      className="text-xs font-bold text-yellow-600 hover:text-yellow-700 transition"
                    >
                      ¿No tienes una cuenta de WhatsApp registrada? Créala aquí
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError(''); }}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 transition"
                    >
                      ¿Ya tienes cuenta? Inicia sesión aquí
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* EMBEDDED CONTROL WORKSPACE PANEL */
          <AdminLTE 
            products={products}
            orders={orders}
            onRefresh={() => fetchData(true)}
            whatsappUser={whatsappUser}
            setWhatsappUser={handleSetWhatsappUser}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}
