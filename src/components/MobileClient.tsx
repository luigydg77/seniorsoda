import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  MapPin, 
  Clock, 
  ArrowLeft, 
  Smartphone, 
  Battery, 
  Wifi, 
  Check, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  ChevronRight, 
  MessageSquare, 
  CheckCircle2, 
  Package, 
  Truck, 
  AlertCircle 
} from 'lucide-react';
import { Product, Order, OrderItem, OrderStatus, Category } from '../types';

interface MobileClientProps {
  products: Product[];
  orders: Order[];
  onOrderPlaced: () => void;
  whatsappUser: string;
  setWhatsappUser: (phone: string) => void;
}

export default function MobileClient({ 
  products, 
  orders, 
  onOrderPlaced, 
  whatsappUser, 
  setWhatsappUser 
}: MobileClientProps) {
  // Navigation & Authentication states
  const [loginPhone, setLoginPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');
  
  // Search & Filters
  const [selectedCategory, setSelectedCategory] = useState<Category>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [systemError, setSystemError] = useState('');

  // Auto-fill delivery address if stored
  useEffect(() => {
    const savedAddress = localStorage.getItem('last_delivery_address');
    if (savedAddress) {
      setDeliveryAddress(savedAddress);
    }
  }, []);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim() || loginPhone.length < 8) {
      setOtpError('Ingresa un número de WhatsApp válido (mínimo 8 dígitos)');
      return;
    }
    setOtpError('');
    setIsOtpStep(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '1234' || otp.trim() === '1234' || otp === '') {
      // Allow empty or '1234' for quick testing
      setWhatsappUser(loginPhone);
      setOtpError('');
    } else {
      setOtpError('Código de verificación incorrecto. Usa el código "1234" o deja en blanco');
    }
  };

  const logout = () => {
    setWhatsappUser('');
    setIsOtpStep(false);
    setLoginPhone('');
    setOtp('');
    setCart([]);
  };

  // Cart actions
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Lo sentimos, solo quedan ${product.stock} unidades de este producto.`);
          return prevCart;
        }
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;

    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > targetProduct.stock) {
            alert(`Stock máximo alcanzado para ${targetProduct.name}. Solo hay ${targetProduct.stock} disponibles.`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as { product: Product; quantity: number }[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      setSystemError('La dirección de envío es obligatoria');
      return;
    }
    if (cart.length === 0) {
      setSystemError('Tu carrito está vacío');
      return;
    }

    setIsSubmitting(true);
    setSystemError('');

    try {
      const orderData = {
        whatsappNumber: whatsappUser,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price
        })),
        deliveryAddress,
        notes: deliveryNotes
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Ocurrió un error al procesar el pedido');
      }

      localStorage.setItem('last_delivery_address', deliveryAddress);
      setSuccessOrder(body);
      setCart([]);
      setIsCartOpen(false);
      onOrderPlaced(); // Refresh products & orders
    } catch (err: any) {
      setSystemError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // User orders
  const myOrders = orders.filter(o => o.whatsappNumber === whatsappUser);

  const getStatusDetails = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente':
        return { color: 'text-amber-500 bg-amber-50 border-amber-200', text: 'Pendiente', icon: Clock, progressWidth: '25%' };
      case 'Preparando':
        return { color: 'text-blue-500 bg-blue-50 border-blue-200', text: 'Preparando', icon: Package, progressWidth: '50%' };
      case 'En Camino':
        return { color: 'text-purple-500 bg-purple-50 border-purple-200', text: 'En Camino', icon: Truck, progressWidth: '75%' };
      case 'Entregado':
        return { color: 'text-emerald-500 bg-emerald-50 border-emerald-200', text: 'Entregado', icon: CheckCircle2, progressWidth: '100%' };
      case 'Cancelado':
        return { color: 'text-rose-500 bg-rose-50 border-rose-200', text: 'Cancelado', icon: AlertCircle, progressWidth: '0%' };
    }
  };

  return (
    <div className="relative w-full bg-neutral-50 rounded-2xl border border-neutral-250 flex flex-col overflow-hidden text-neutral-800 shrink-0 min-h-[620px] shadow-sm">
          
          {/* 1. Login View if not authenticated */}
          {!whatsappUser ? (
            <div className="flex-1 flex flex-col justify-between p-6 bg-white">
              <div className="mt-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900">Refresco Express</h2>
                <p className="text-sm text-neutral-500 text-center mt-1">Refrescos fríos en la puerta de tu hogar.</p>
              </div>

              <div className="my-auto text-left">
                {!isOtpStep ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">Ingresa tu número de WhatsApp</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">+503</span>
                        <input 
                          type="tel"
                          placeholder="78901234" 
                          maxLength={8}
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-15 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-neutral-900 placeholder:text-neutral-400"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-2">Te enviaremos una notificación directa para autorizar tu pedido de bebidas.</p>
                    </div>

                    {otpError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continuar con WhatsApp</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">Código de Verificación</label>
                        <button 
                          type="button" 
                          onClick={() => setIsOtpStep(false)}
                          className="text-xs text-blue-600 font-medium hover:underline"
                        >
                          Cambiar número
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 mb-3">Enviado al <span className="font-semibold text-neutral-700">+503 {loginPhone}</span></p>
                      
                      <input 
                        type="text"
                        maxLength={4}
                        placeholder="Código: 1234" 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full text-center tracking-widest text-lg font-bold py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-neutral-900"
                      />
                      <p className="text-[10px] text-neutral-400 mt-2 text-center">Para testing rápido, dale "Ingresar" directo (Código por defecto: 1234).</p>
                    </div>

                    {otpError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Ingresar a la App
                    </button>
                  </form>
                )}
              </div>

              <div className="text-[11px] text-center text-neutral-400">
                Al ingresar estás de acuerdo con el envío automático de órdenes vía WhatsApp API.
              </div>
            </div>
          ) : successOrder ? (
            /* 2. Order Success Screen */
            <div className="flex-1 flex flex-col justify-between p-6 bg-white animate-fade-in">
              <div className="my-auto flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 animate-bounce">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">¡Pedido Confirmado!</span>
                <h3 className="text-xl font-bold text-neutral-800">Código: {successOrder.id}</h3>
                <p className="text-sm text-neutral-500 mt-2 px-4">
                  Tu pedido de refrescos ha sido recibido con éxito. El administrador está confirmando tu stock en tiempo real.
                </p>

                <div className="w-full bg-neutral-50 rounded-xl p-4 border border-neutral-100 text-left mt-6 space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 font-medium text-left">WhatsApp:</span>
                    <span className="font-semibold text-neutral-700">{successOrder.whatsappNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Dirección:</span>
                    <span className="font-semibold text-neutral-700 text-right truncate max-w-[160px]">{successOrder.deliveryAddress}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-dashed border-neutral-200 pt-2 text-neutral-900 font-bold">
                    <span>Total Cancelado</span>
                    <span>$ {successOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setSuccessOrder(null);
                    setActiveTab('orders');
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Seguir mi Envío
                </button>
                <button 
                  onClick={() => setSuccessOrder(null)}
                  className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl text-sm transition-all cursor-pointer"
                >
                  Volver a Comprar
                </button>
              </div>
            </div>
          ) : (
            /* 3. Main Customer App Screen */
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="p-4 bg-white border-b border-neutral-100 sticky top-0 z-30">
                {/* Brand Header */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-neutral-800 tracking-tight">Refrescos Express</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-neutral-150 p-1 rounded-xl items-center gap-2">
                      <User className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="font-bold text-neutral-700 text-xs tracking-tight">+503 {whatsappUser}</span>
                    </div>
                    <button 
                      onClick={logout} 
                      className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                    >
                      Salir
                    </button>
                  </div>
                </div>

                {/* Navigation inside Client Frame */}
                <div className="flex bg-neutral-100 p-0.5 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('catalog')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-all text-center cursor-pointer ${activeTab === 'catalog' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    Bebidas Heladas
                  </button>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    Mis Pedidos
                    {myOrders.length > 0 && (
                      <span className="w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                        {myOrders.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* View Content Panel */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'catalog' ? (
                  <>
                    {/* Welcome banner */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl p-4 text-white shadow-md relative overflow-hidden text-left">
                      <div className="relative z-10">
                        <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">¡Elige tu favorita!</span>
                        <h4 className="text-base font-extrabold tracking-tight mt-0.5">Envío a domicilio en 15 min</h4>
                        <p className="text-[11px] text-blue-50 mt-1 opacity-90 leading-snug">Bebidas selladas e heladas listas para destapar.</p>
                      </div>
                      <div className="absolute right-0 bottom-0 top-0 opacity-15 flex items-center mr-2">
                        <ShoppingBag className="w-24 h-24 stroke-[1]" />
                      </div>
                    </div>

                    {/* Search Panel */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Buscar Coca Cola, Fanta, Frugos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      />
                    </div>

                    {/* Categories Scroller */}
                    <div className="overflow-x-auto scrollbar-none flex gap-1.5 pb-2 -mx-1 px-1">
                      {(['Todos', 'Gaseosas', 'Jugos', 'Aguas y Energizantes'] as Category[]).map((cat) => (
                        <button
                           key={cat}
                           onClick={() => setSelectedCategory(cat)}
                           className={`shrink-0 border px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                            selectedCategory === cat 
                              ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm' 
                              : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-600'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Product Listing */}
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-neutral-100 p-6">
                        <AlertCircle className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                        <h5 className="font-semibold text-neutral-800 text-sm">Sin Stock / No encontrado</h5>
                        <p className="text-xs text-slate-400 mt-1">Intenta ajustando los filtros de búsqueda.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map((p) => {
                          const isInCart = cart.find(item => item.product.id === p.id);
                          return (
                            <div 
                              key={p.id}
                              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group h-full relative text-left"
                            >
                              {/* Stock Badge overlay */}
                              <div className="absolute top-2 left-2 z-10">
                                {p.stock === 0 ? (
                                  <span className="bg-rose-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">Agotado</span>
                                ) : p.stock <= 5 ? (
                                  <span className="bg-amber-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">Bajo stock: {p.stock}</span>
                                ) : (
                                  <span className="bg-slate-900/80 backdrop-blur-md text-white font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">{p.category}</span>
                                )}
                              </div>

                              {/* Beverage Image and Main details */}
                              <div className="aspect-square w-full bg-slate-50 overflow-hidden relative border-b border-slate-100">
                                <img 
                                  src={p.imageUrl} 
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {p.originalPrice && p.originalPrice > p.price && (
                                  <div className="absolute top-2 right-2 z-10">
                                    <span className="bg-emerald-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                      -{Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% Desc
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="p-2.5 flex-1 flex flex-col justify-between">
                                <div className="space-y-0.5 mb-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{p.category}</span>
                                    {p.packSize && (
                                      <span className="bg-blue-50 text-blue-600 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-blue-100">
                                        📦 Pack x{p.packSize}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="font-bold text-xs text-slate-800 line-clamp-2 h-8 leading-tight tracking-tight">{p.name}</h5>
                                  <p className="text-[10.5px] text-slate-500 line-clamp-1 leading-normal">{p.description}</p>
                                  <p className="text-[9.5px] text-blue-500 font-semibold mt-1">Pedido: Todo por paquete de {p.unitType || 'Unidades'}</p>
                                </div>

                                <div className="space-y-2 mt-auto">
                                  {/* Pricing details */}
                                  <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-medium">Precio Mayor:</span>
                                    <div className="flex flex-col items-end">
                                      {p.originalPrice && p.originalPrice > p.price && (
                                        <span className="text-[10px] text-slate-400 line-through leading-none font-medium mb-1">
                                          ${p.originalPrice.toFixed(2)}
                                        </span>
                                      )}
                                      <span className="text-xs font-extrabold text-blue-600 leading-none">
                                        ${p.price.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Add button / Cart state controller */}
                                  {p.stock <= 0 ? (
                                    <button 
                                      disabled
                                      className="w-full py-1.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-extrabold uppercase pointer-events-none cursor-not-allowed"
                                    >
                                      No Disponible
                                    </button>
                                  ) : isInCart ? (
                                    <div className="flex items-center bg-blue-50 border border-blue-250 rounded-xl py-1 px-1.5 justify-between">
                                      <button 
                                        onClick={() => updateQuantity(p.id, -1)}
                                        className="w-5 h-5 bg-white text-blue-600 hover:bg-blue-100 rounded-md flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-xs font-black text-blue-600">{isInCart.quantity}</span>
                                      <button 
                                        onClick={() => updateQuantity(p.id, 1)}
                                        className="w-5 h-5 bg-white text-blue-600 hover:bg-blue-100 rounded-md flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => addToCart(p)}
                                      className="w-full py-2 bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-750 hover:to-indigo-600 text-white rounded-xl text-[10.5px] font-bold uppercase shadow-sm tracking-wide transition-all duration-205 active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3 stroke-[2.5]" />
                                      <span>Agregar</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Orders history list */}
                    <div className="space-y-4 text-left">
                      <div className="flex justify-between items-center">
                        <h4 className="font-extrabold text-neutral-800 text-sm tracking-tight flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span>Seguimiento de Órdenes</span>
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-150 text-neutral-500 rounded-full font-bold">
                          Total: {myOrders.length}
                        </span>
                      </div>

                      {myOrders.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-neutral-100 p-6 flex flex-col justify-center items-center">
                          <ShoppingBag className="w-12 h-12 text-neutral-200 mb-2" />
                          <h5 className="font-semibold text-neutral-800 text-sm">Aún no tienes pedidos</h5>
                          <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto text-center">
                            ¡Entra a la pestaña de Bebidas y pídelas heladas ahora!
                          </p>
                          <button 
                            onClick={() => setActiveTab('catalog')}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-750 transition-all active:scale-95 cursor-pointer"
                          >
                            Ir a Catálogo
                          </button>
                        </div>
                      ) : (
                        myOrders.map((order) => {
                          const statusInfo = getStatusDetails(order.status);
                          const StatusIcon = statusInfo.icon;

                          return (
                            <div 
                              key={order.id}
                              className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3.5"
                            >
                              <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                                <div>
                                  <h5 className="font-black text-neutral-900 text-xs">{order.id}</h5>
                                  <span className="text-[10px] text-neutral-400 font-medium">{new Date(order.createdAt).toLocaleDateString()} a las {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${statusInfo.color}`}>
                                  <StatusIcon className="w-3 h-3 stroke-[2.5]" />
                                  <span>{statusInfo.text}</span>
                                </span>
                              </div>

                              {/* Items list summary */}
                              <div className="space-y-1.5 text-xs">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-slate-600">
                                    <span className="font-semibold text-neutral-700">
                                      {item.quantity}x <span className="font-medium text-slate-605">{item.productName}</span>
                                    </span>
                                    <span className="text-slate-400">$ {(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="bg-neutral-50 rounded-xl p-2.5 text-[11px] space-y-1 border border-neutral-100">
                                <div className="flex items-start gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                  <span className="text-slate-600 truncate"><strong className="text-neutral-700">Envío: </strong>{order.deliveryAddress}</span>
                                </div>
                                {order.notes && (
                                  <div className="flex items-start gap-1">
                                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="text-slate-500 italic"><strong className="text-neutral-600 font-bold not-italic">Nota: </strong>"{order.notes}"</span>
                                  </div>
                                )}
                              </div>

                              {/* Progress pipeline visual indicator */}
                              {order.status !== 'Cancelado' && (
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wide">
                                    <span>Ruta de entrega</span>
                                    <span className="text-blue-600 font-extrabold">{order.status}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                                    <div 
                                      className="bg-gradient-to-r from-blue-600 to-indigo-400 h-full transition-all duration-500" 
                                      style={{ width: statusInfo.progressWidth }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-between items-center border-t border-dashed border-slate-100 pt-3 text-xs">
                                <span className="font-semibold text-neutral-600">Total Pedido</span>
                                <span className="font-black text-sm text-blue-600">$ {order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Shopping Cart Sticky Trigger/Drawer Controller */}
              {cart.length > 0 && activeTab === 'catalog' && (
                <div className="bg-white border-t border-neutral-100 p-4 sticky bottom-0 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] text-left">
                  <button 
                    onClick={() => setIsCartOpen(true)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg transition-all flex items-center justify-between px-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <ShoppingBag className="w-5 h-5 text-blue-400" />
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      </div>
                      <span className="font-semibold text-xs tracking-tight">Ver mi Carrito de Compras</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-xs text-blue-400">
                      <span>Total: </span>
                      <span className="text-sm font-black text-white">$ {cartTotal.toFixed(2)}</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. Sliding Modal Cart Checkout Overlay inside Client screen */}
        {isCartOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            <div className="w-full bg-white rounded-t-3xl p-5 flex flex-col max-h-[85%] overflow-y-auto space-y-4 shadow-2xl select-none text-left animate-slide-up">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  <h4 className="font-extrabold text-neutral-800 text-sm leading-none">Mi Carrito</h4>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-full cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>

              {/* Items checklist */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] scrollbar-none pr-1">
                {cart.map((item) => (
                  <div 
                    key={item.product.id}
                    className="flex justify-between items-center gap-2 bg-neutral-50 p-2 rounded-xl border border-neutral-100"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <img 
                        src={item.product.imageUrl} 
                        alt={item.product.name} 
                        className="w-10 h-10 object-cover rounded-lg shrink-0 border border-neutral-100"
                      />
                      <div className="min-w-0">
                        <h6 className="text-[11px] font-extrabold text-slate-800 truncate leading-tight">{item.product.name}</h6>
                        <span className="text-[10px] text-slate-400">$ {item.product.price.toFixed(2)} c/u</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-white border border-neutral-200 rounded-lg py-0.5 px-1 justify-between">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-4 h-4 text-neutral-500 hover:bg-neutral-100 rounded flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-[11px] font-black w-5 text-center text-neutral-700">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-4 h-4 text-neutral-500 hover:bg-neutral-100 rounded flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery info form */}
              <form onSubmit={handlePlaceOrder} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-500 uppercase tracking-wide mb-1">Dirección de Entrega *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-blue-600 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Calle Las Palmeras 123, Miraflores..."
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-neutral-800 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-500 uppercase tracking-wide mb-1">Instrucciones / Notas adicionales</label>
                  <input 
                    type="text" 
                    placeholder="Timbre malogrado, llamar / dejar portería..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-neutral-800"
                  />
                </div>

                <div className="border-t border-neutral-100 pt-3 space-y-3">
                  <div className="flex justify-between text-xs text-neutral-400 font-medium pb-1">
                    <span>Costo de envío:</span>
                    <span className="text-emerald-600 font-bold uppercase text-[10px]">Gratis</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-800 font-bold">
                    <span>Monto Total a Cancelar</span>
                    <span className="text-base font-black text-blue-600">$ {cartTotal.toFixed(2)}</span>
                  </div>

                  {systemError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs flex gap-2 items-center">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{systemError}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-650 bg-emerald-650 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? 'Validando Stock...' : 'Confirmar Pedido'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Seguir Seleccionando
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
