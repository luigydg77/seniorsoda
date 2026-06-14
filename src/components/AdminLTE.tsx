import React, { useState } from 'react';
import { 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Truck, 
  XOctagon, 
  Plus, 
  Minus, 
  Edit, 
  Trash2, 
  RefreshCcw, 
  PlusCircle, 
  Search, 
  Database,
  Grid,
  TrendingDown,
  ChevronRight,
  Sparkles,
  DollarSign,
  Smartphone,
  Menu,
  X
} from 'lucide-react';
import { isFirebaseConfigured, testFirebaseConnection } from '../firebase';

import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Product, Order, OrderStatus, UserProfile } from '../types';
import MobileClient from './MobileClient';

interface AdminLTEProps {
  products: Product[];
  orders: Order[];
  onRefresh: () => void;
  whatsappUser: string;
  setWhatsappUser: (phone: string) => void;
  currentUser: UserProfile;
  onLogout: () => void;
}

export default function AdminLTE({ 
  products, 
  orders, 
  onRefresh, 
  whatsappUser, 
  setWhatsappUser,
  currentUser,
  onLogout
}: AdminLTEProps) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const isClientOnly = currentUser.role === 'cliente';
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'analytics' | 'client'>(
    isClientOnly ? 'client' : 'orders'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingFirebase, setTestingFirebase] = useState(false);

  // Custom visual confirm & alert modals states
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAlertInfo, setShowAlertInfo] = useState<string | null>(null);

  
  // Search state
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | OrderStatus>('Todos');

  // New product form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Gaseosas' | 'Jugos' | 'Aguas y Energizantes'>('Gaseosas');
  const [formPrice, setFormPrice] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState('');
  const [formPackSize, setFormPackSize] = useState('6');
  const [formUnitType, setFormUnitType] = useState('Latas');
  const [formStock, setFormStock] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTestFirebase = async () => {
    setTestingFirebase(true);
    setFirebaseTestResult(null);
    try {
      const res = await testFirebaseConnection();
      setFirebaseTestResult(res);
    } catch (err: any) {
      setFirebaseTestResult({ success: false, message: err.message || "Error al conectar." });
    } finally {
      setTestingFirebase(false);
    }
  };

  // Edit inline state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editOriginalPrice, setEditOriginalPrice] = useState<number>(0);
  const [editPackSize, setEditPackSize] = useState<number>(6);
  const [editUnitType, setEditUnitType] = useState<string>('Latas');

  // Status transitions
  const handleOrderStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error al actualizar estado del pedido', err);
    }
  };

  // Quick live stock adjustment (+/- 5 or 1)
  const adjustStock = async (product: Product, amount: number) => {
    const newStock = Math.max(0, product.stock + amount);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error al ajustar el inventario', err);
    }
  };

  // Update product price & stock in editing mode
  const handleSaveProductEdit = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          price: editPrice, 
          stock: editStock,
          originalPrice: editOriginalPrice,
          packSize: editPackSize,
          unitType: editUnitType
        })
      });
      if (res.ok) {
        setEditingProductId(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Error al actualizar datos del producto', err);
    }
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
  };

  const executeDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error al borrar producto', err);
    } finally {
      setProductToDelete(null);
    }
  };

  // Create Product handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice || !formStock) {
      setFormError('Nombre, precio y stock son campos requeridos.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const pData = {
        name: formName,
        category: formCategory,
        price: parseFloat(formPrice),
        originalPrice: parseFloat(formOriginalPrice) || parseFloat(formPrice),
        packSize: parseInt(formPackSize, 10) || 6,
        unitType: formUnitType || 'Latas',
        stock: parseInt(formStock, 10),
        imageUrl: formImageUrl || undefined,
        description: formDescription
      };

      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pData)
      });

      if (!res.ok) {
        throw new Error('Error al registrar artículo');
      }

      // Reset form on success
      setFormName('');
      setFormPrice('');
      setFormOriginalPrice('');
      setFormPackSize('6');
      setFormUnitType('Latas');
      setFormStock('');
      setFormImageUrl('');
      setFormDescription('');
      setShowAddForm(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hard system reset
  const handleResetDatabase = () => {
    setShowResetConfirm(true);
  };

  const executeResetDatabase = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset`, { method: 'POST' });
      if (res.ok) {
        onRefresh();
        setShowAlertInfo('La base de datos se ha restaurado correctamente a sus valores iniciales.');
      }
    } catch (err) {
      console.error('Error al resetear la base de datos', err);
    } finally {
      setShowResetConfirm(false);
    }
  };

  // KPI calculations
  const totalSalesFromDelivered = orders
    .filter(o => o.status === 'Entregado')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingCount = orders.filter(o => o.status === 'Pendiente').length;
  const inRouteCount = orders.filter(o => o.status === 'En Camino' || o.status === 'Preparando').length;
  const lowStockCount = products.filter(p => p.stock <= 5).length;

  // Recharts calculations
  // 1. Stock per category
  const categoryStock = products.reduce((acc: any, p) => {
    const found = acc.find((item: any) => item.name === p.category);
    if (found) {
      found.Stock += p.stock;
    } else {
      acc.push({ name: p.category, Stock: p.stock });
    }
    return acc;
  }, []);

  // 2. Sales per category (from delivered orders)
  const categorySales = orders
    .filter(o => o.status === 'Entregado')
    .reduce((acc: any, o) => {
      o.items.forEach(item => {
        const matchingProduct = products.find(p => p.id === item.productId);
        const categoryLabel = matchingProduct ? matchingProduct.category : 'Otros';
        const found = acc.find((x: any) => x.name === categoryLabel);
        if (found) {
          found.Monto += item.quantity * item.price;
        } else {
          acc.push({ name: categoryLabel, Monto: item.quantity * item.price });
        }
      });
      return acc;
    }, []);

  // Ensure all categories have a value in Sales chart even if $ 0
  ['Gaseosas', 'Jugos', 'Aguas y Energizantes'].forEach(cat => {
    if (!categorySales.find((x: any) => x.name === cat)) {
      categorySales.push({ name: cat, Monto: 0 });
    }
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'Todos') return true;
    return o.status === statusFilter;
  });

  // Filter products by search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="flex-1 bg-neutral-100 min-h-screen font-sans text-neutral-800 flex flex-col">
      {/* AdminLTE Navbar top header for mobile screens */}
      <div className="md:hidden flex items-center justify-between bg-[#222d32] text-white px-4 py-3 shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-[#1a2226] rounded transition-colors"
            title="Menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5 text-yellow-500" /> : <Menu className="w-5 h-5 text-yellow-500" />}
          </button>
          <span className="font-extrabold text-xs tracking-wider uppercase text-yellow-500">Refresco Express</span>
        </div>
      </div>
      {/* AdminLTE Navbar top header */}
      

      {/* Main split work space */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Mobile Sidebar backdrop overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* AdminLTE Left Control Sidebar */}
        <aside className={`fixed inset-y-0 left-0 w-60 bg-[#222d32] shrink-0 text-gray-300 flex flex-col justify-between select-none z-40 transform transition-transform duration-300 md:relative md:translate-x-0 md:z-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-4 space-y-5">
            {/* User visual profile card */}
            <div className="flex items-center gap-3 bg-[#1a2226] p-3 rounded-lg border-l-4 border-yellow-500">
              <div className="w-9 h-9 bg-yellow-500 text-slate-900 rounded-full flex items-center justify-center font-black text-sm shadow-sm select-none">
                {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden min-w-0">
                <span className="block text-xs font-black text-white hover:text-yellow-400 transition-colors truncate leading-tight">
                  {currentUser?.fullName}
                </span>
                <span className="text-[9.5px] uppercase font-bold text-gray-400 block tracking-wide mt-0.5">
                  {currentUser?.role === 'admin' ? '👑 Administrador' : '👤 Cliente'}
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase px-2">MENÚ PRINCIPAL</span>
              
              <button 
                onClick={() => { setActiveTab('client'); onRefresh(); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'client' ? 'bg-[#1e282c] text-white border-r-4 border-yellow-500' : 'hover:bg-[#1a2226] hover:text-white'}`}
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-yellow-400" />
                  <span>Catálogo de Clientes</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              {!isClientOnly && (
                <>
                  <button 
                    onClick={() => { setActiveTab('orders'); onRefresh(); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-[#1e282c] text-white border-r-4 border-[#3c8dbc]' : 'hover:bg-[#1a2226] hover:text-white'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="w-4 h-4 text-[#3c8dbc]" />
                      <span>Pedidos Recibidos</span>
                    </div>
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-orange-500 text-white font-bold text-[9px] rounded-full">{pendingCount}</span>
                    )}
                  </button>

                  <button 
                    onClick={() => { setActiveTab('inventory'); onRefresh(); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'inventory' ? 'bg-[#1e282c] text-white border-r-4 border-[#3c8dbc]' : 'hover:bg-[#1a2226] hover:text-white'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4 text-emerald-400" />
                      <span>Control de Inventario</span>
                    </div>
                    {lowStockCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-500 text-white font-bold text-[9px] rounded-full animate-bounce">{lowStockCount} !</span>
                    )}
                  </button>

                  <button 
                    onClick={() => { setActiveTab('analytics'); onRefresh(); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-[#1e282c] text-white border-r-4 border-[#3c8dbc]' : 'hover:bg-[#1a2226] hover:text-white'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                      <span>Métricas y Análisis</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                </>
              )}
            </div>

            {/* Firebase Status Card - Admin-only */}
            {!isClientOnly && (
              <div className="mt-4 mx-2 p-3 rounded-lg bg-[#1a2226] border border-gray-800 text-xs text-slate-300 animate-fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[10px] text-gray-500 tracking-wider">CANAL DE DATOS</span>
                  {isFirebaseConfigured() ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                      Firebase
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono bg-amber-500/10 text-amber-500 border border-amber-500/25">
                      Local JSON
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 leading-snug mb-2.5">
                  {isFirebaseConfigured() 
                    ? "Sincronizado vía Cloud Firestore." 
                    : "Usando base de datos interna local. Configura Firebase para producción."}
                </p>
                <button
                  onClick={() => {
                    setFirebaseTestResult(null);
                    setShowFirebaseModal(true);
                  }}
                  className="w-full text-center py-1.5 bg-sky-600/20 hover:bg-sky-600/35 text-sky-400 border border-sky-500/30 hover:border-sky-500/50 rounded text-[10px] font-bold transition-all cursor-pointer"
                >
                  {isFirebaseConfigured() ? "Probar Conexión Firebase ⚡" : "Conectar Firebase ⚡"}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 text-center space-y-3.5">
            <button
              onClick={onLogout}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wide rounded shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
            >
              Cerrar Sesión ↩
            </button>
            <div className="opacity-60">
              Diseño AdminLTE 2.4.18<br />
              React v19 • Vite • TailWind
            </div>
          </div>
        </aside>

        {/* Content Body Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          
          {/* 1. Header KPIs Cards (Classic AdminLTE widgets) */}
          {activeTab !== 'client' && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Stat Box 1: Revenue */}
              <div className="bg-emerald-500 rounded-lg shadow-sm text-white flex justify-between overflow-hidden relative group/kpi">
                <div className="p-4.5 z-10">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-100 opacity-90">Ventas Entregadas</span>
                  <h3 className="text-2xl font-black mt-1">$ {totalSalesFromDelivered.toFixed(2)}</h3>
                  <p className="text-[10px] text-emerald-50 mt-1 cursor-pointer" onClick={() => setActiveTab('analytics')}>Ver datos reales →</p>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 text-white shrink-0 group-hover/kpi:scale-110 transition-transform duration-200">
                  <DollarSign className="w-16 h-16 stroke-[1]" />
                </div>
              </div>

              {/* Stat Box 2: Pending Orders */}
              <div className="bg-amber-500 rounded-lg shadow-sm text-neutral-900 flex justify-between overflow-hidden relative group/kpi">
                <div className="p-4.5 z-10">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-950 opacity-85">Órdenes Pendientes</span>
                  <h3 className="text-2xl font-black mt-1">{pendingCount}</h3>
                  <p className="text-[10px] text-amber-950/80 mt-1 cursor-pointer" onClick={() => setActiveTab('orders')}>Requieren aprobación urgente</p>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-25 text-neutral-900 shrink-0 group-hover/kpi:scale-110 transition-transform duration-200">
                  <Clock className="w-16 h-16 stroke-[1]" />
                </div>
              </div>

              {/* Stat Box 3: In Prep Route */}
              <div className="bg-blue-500 rounded-lg shadow-sm text-white flex justify-between overflow-hidden relative group/kpi">
                <div className="p-4.5 z-10">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-100 opacity-95">Preparación & Ruta</span>
                  <h3 className="text-2xl font-black mt-1">{inRouteCount}</h3>
                  <p className="text-[10px] text-blue-50 mt-1">Pedidos saliendo del almacén</p>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 text-white shrink-0 group-hover/kpi:scale-110 transition-transform duration-200">
                  <Truck className="w-16 h-16 stroke-[1]" />
                </div>
              </div>

              {/* Stat Box 4: Low Stock Alert */}
              <div className="bg-rose-500 rounded-lg shadow-sm text-white flex justify-between overflow-hidden relative group/kpi">
                <div className="p-4.5 z-10">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-rose-100 opacity-90">Stock Bajo Alerta</span>
                  <h3 className="text-2xl font-black mt-1">{lowStockCount}</h3>
                  <p className="text-[10px] text-rose-100 mt-1 cursor-pointer" onClick={() => setActiveTab('inventory')}>Artículos con stock ≤ 5</p>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 text-white shrink-0 group-hover/kpi:scale-110 transition-transform duration-200">
                  <AlertTriangle className="w-16 h-16 stroke-[1]" />
                </div>
              </div>
            </section>
          )}

          {/* 2. Primary Tabs View panels */}
          
          {/* TAB 0: CUSTOMER CATALOG MODULE */}
          {activeTab === 'client' && (
            <MobileClient 
              products={products}
              orders={orders}
              onOrderPlaced={onRefresh}
              whatsappUser={whatsappUser}
              setWhatsappUser={setWhatsappUser}
            />
          )}

          {/* TAB 1: ORDERS MONITORING */}
          {activeTab === 'orders' && (
            <div className="bg-white border-t-4 border-[#3c8dbc] rounded-lg shadow-sm">
              <div className="p-5 border-b border-neutral-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                    <Grid className="w-5 h-5 text-[#3c8dbc]" />
                    <span>Control Real-Time de Pedidos de Refrescos</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">Modifica los estados de los pedidos recibidos en tiempo real por el canal integrado de WhatsApp.</p>
                </div>

                {/* Filter statuses buttons */}
                <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-lg md:self-end shrink-0 max-w-full">
                  {(['Todos', 'Pendiente', 'Preparando', 'En Camino', 'Entregado', 'Cancelado'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-md text-[10.5px] font-black tracking-tight transition-all cursor-pointer ${statusFilter === f ? 'bg-[#3c8dbc] text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                      <th className="p-4 font-black">Código</th>
                      <th className="p-4 font-black">Canal WhatsApp</th>
                      <th className="p-4 font-black">Detalle de Bebidas</th>
                      <th className="p-4 font-black text-right">Monto</th>
                      <th className="p-4 font-black">Dirección de Entrega / Notas</th>
                      <th className="p-4 font-black">Estado del Envío</th>
                      <th className="p-4 font-black text-center">Acciones Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-neutral-400">
                          <ShoppingBag className="w-12 h-12 text-neutral-200 mx-auto mb-2" />
                          <p className="font-semibold text-neutral-500 text-sm">No se encontraron pedidos con este filtro</p>
                          <p className="text-xs text-neutral-400">Prueba realizando una compra ficticia en el smartphone de la izquierda.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => {
                        let badgeColor = "bg-neutral-100 text-neutral-600";
                        if (order.status === 'Pendiente') badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                        if (order.status === 'Preparando') badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
                        if (order.status === 'En Camino') badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
                        if (order.status === 'Entregado') badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-250";
                        if (order.status === 'Cancelado') badgeColor = "bg-rose-100 text-rose-800 border-rose-200";

                        return (
                          <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="p-4 font-black text-neutral-900">{order.id}</td>
                            <td className="p-4">
                              <a 
                                href={`https://wa.me/503${order.whatsappNumber}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 hover:underline font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-250 px-2 py-1 rounded"
                                title="Abrir chat en WhatsApp"
                              >
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                                +503 {order.whatsappNumber}
                              </a>
                            </td>
                            <td className="p-4 py-3 space-y-1">
                              {order.items.map((item, id) => (
                                <div key={id} className="font-semibold text-neutral-700">
                                  {item.quantity}x <span className="font-medium text-neutral-600">{item.productName}</span>
                                </div>
                              ))}
                            </td>
                            <td className="p-4 text-right font-black text-neutral-900 text-sm">$ {order.total.toFixed(2)}</td>
                            <td className="p-4">
                              <p className="font-bold text-neutral-700 max-w-[200px] truncate">{order.deliveryAddress}</p>
                              {order.notes && (
                                <p className="text-[11px] text-neutral-400 italic max-w-[200px] truncate">"{order.notes}"</p>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-1.5">
                                {order.status === 'Pendiente' && (
                                  <button 
                                    onClick={() => handleOrderStatusUpdate(order.id, 'Preparando')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded text-[10.5px] cursor-pointer"
                                  >
                                    Preparar
                                  </button>
                                )}
                                {order.status === 'Preparando' && (
                                  <button 
                                    onClick={() => handleOrderStatusUpdate(order.id, 'En Camino')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-2.5 py-1.5 rounded text-[10.5px] cursor-pointer"
                                  >
                                    Despachar
                                  </button>
                                )}
                                {order.status === 'En Camino' && (
                                  <button 
                                    onClick={() => handleOrderStatusUpdate(order.id, 'Entregado')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded text-[10.5px] cursor-pointer"
                                  >
                                    Entregar
                                  </button>
                                )}
                                {order.status !== 'Entregado' && order.status !== 'Cancelado' && (
                                  <button 
                                    onClick={() => handleOrderStatusUpdate(order.id, 'Cancelado')}
                                    className="bg-rose-50 hover:bg-rose-100 hover:border-rose-300 border border-rose-200 text-rose-600 font-medium px-2 py-1 rounded text-[10.5px] cursor-pointer"
                                    title="Cancela la orden y devuelve automáticamente los productos al stock"
                                  >
                                    Cancelar
                                  </button>
                                )}
                                {(order.status === 'Entregado' || order.status === 'Cancelado') && (
                                  <span className="text-neutral-400 text-[11px] font-medium italic">Pedido completado</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY STOCK MANAGEMENT */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              
              {/* Add form toggled container */}
              {showAddForm && (
                <div className="bg-white border-t-4 border-emerald-500 rounded-lg shadow-sm p-5 animate-slide-up">
                  <h4 className="font-extrabold text-sm text-neutral-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <PlusCircle className="w-5 h-5 text-emerald-500" />
                    <span>Agregar Nueva Bebida al Catálogo</span>
                  </h4>
                  <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Nombre de la Bebida *</label>
                      <input 
                        type="text"
                        placeholder="Inca Kola sin Azúcar 1.5L"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Categoría de Almacén *</label>
                      <select 
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as any)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                      >
                        <option value="Gaseosas">Gaseosas</option>
                        <option value="Jugos">Jugos</option>
                        <option value="Aguas y Energizantes">Aguas y Energizantes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Precio de Lista Original ($) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="18.00"
                        required
                        value={formOriginalPrice}
                        onChange={(e) => setFormOriginalPrice(e.target.value)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3c8dbc] mb-1">Precio Mayorista Oferta ($) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="15.30"
                        required
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none ring-1 ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Tamaño del Paquete (e.g. 6, 12, 24) *</label>
                      <input 
                        type="number"
                        placeholder="12"
                        required
                        value={formPackSize}
                        onChange={(e) => setFormPackSize(e.target.value)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Tipo de Presentación (e.g. Latas, Botellas 1L) *</label>
                      <input 
                        type="text"
                        placeholder="Latas de Jugo"
                        required
                        value={formUnitType}
                        onChange={(e) => setFormUnitType(e.target.value)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Stock Inicial de Paquetes *</label>
                      <input 
                        type="number"
                        placeholder="45"
                        required
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-500 mb-1">URL de Imagen (Opcional - Imagen de Unsplash por defecto)</label>
                      <input 
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Breve Descripción</label>
                      <input 
                        type="text"
                        placeholder="Presentación descartable helada..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                      />
                    </div>

                    {formError && (
                      <div className="md:col-span-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs">
                        {formError}
                      </div>
                    )}

                    <div className="md:col-span-4 flex justify-end gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                      >
                        {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Inventory Table Grid wrapper */}
              <div className="bg-white border-t-4 border-emerald-500 rounded-lg shadow-sm">
                <div className="p-5 border-b border-neutral-100 flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Gestión Física de Stocks</h3>
                    <span className="px-2.5 py-0.5 bg-neutral-100 rounded text-[11px] font-bold text-neutral-500">Total ítems: {products.length}</span>
                  </div>

                  <div className="flex gap-4 items-center">
                    {/* Search inside inventory */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Filtrar bebida..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="text-xs pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    {!showAddForm && (
                      <button 
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-xs shadow transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir Bebida</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                        <th className="p-4 font-black">Bebida / Presentación</th>
                        <th className="p-4 font-black">Categoría</th>
                        <th className="p-4 font-black text-center">Configura Paquete</th>
                        <th className="p-4 font-black text-right">Lista ($)</th>
                        <th className="p-4 font-black text-right">Mayorista ($)</th>
                        <th className="p-4 font-black text-center">Stock Actual (Paquetes)</th>
                        <th className="p-4 font-black text-center">Ajuste Manual Rápido</th>
                        <th className="p-4 font-black text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-neutral-400">
                            No se encontraron artículos en el inventario.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map(p => {
                          const isEditing = editingProductId === p.id;
                          const isLow = p.stock <= 5;

                          return (
                            <tr key={p.id} className={`hover:bg-neutral-50/50 transition-colors ${isLow ? 'bg-rose-50/30' : ''}`}>
                              <td className="p-4 flex items-center gap-3">
                                <img 
                                  src={p.imageUrl} 
                                  alt={p.name} 
                                  className="w-10 h-10 object-cover rounded-lg border border-neutral-200"
                                />
                                <div>
                                  <h6 className="font-extrabold text-neutral-900 text-xs">{p.name}</h6>
                                  <p className="text-[10.5px] text-neutral-400 line-clamp-1">{p.description || 'Sin descripción'}</p>
                                  <span className="text-[9.5px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                                    📦 {p.packSize || 6} {p.unitType || 'Unidades'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="font-bold text-[10px] uppercase tracking-wide bg-neutral-100 border text-neutral-600 px-2.5 py-0.5 rounded-full">
                                  {p.category}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                {isEditing ? (
                                  <div className="flex gap-1 items-center justify-center">
                                    <input 
                                      type="number" 
                                      value={editPackSize}
                                      onChange={(e) => setEditPackSize(parseInt(e.target.value, 10) || 1)}
                                      className="w-10 text-[11px] p-1 bg-white border border-neutral-300 rounded text-center font-bold"
                                      title="Unidades por paquete"
                                      placeholder="6"
                                    />
                                    <input 
                                      type="text" 
                                      value={editUnitType}
                                      onChange={(e) => setEditUnitType(e.target.value)}
                                      className="w-16 text-[11px] p-1 bg-white border border-neutral-300 rounded text-center"
                                      title="Tipo de envase"
                                      placeholder="Latas"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-gray-500 font-medium">x{p.packSize || 6} {p.unitType || 'Unidades'}</span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                {isEditing ? (
                                  <div className="relative inline-block w-16">
                                    <span className="absolute left-1 top-1 text-neutral-400 text-[9px]">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={editOriginalPrice}
                                      onChange={(e) => setEditOriginalPrice(parseFloat(e.target.value) || 0)}
                                      className="w-full text-[11px] p-1 pl-4 bg-white border border-neutral-300 rounded text-right font-bold text-gray-400"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-neutral-400 line-through font-mono">${(p.originalPrice || p.price).toFixed(2)}</span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                {isEditing ? (
                                  <div className="relative inline-block w-16">
                                    <span className="absolute left-1 top-1 text-neutral-400 text-[9px]">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={editPrice}
                                      onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                                      className="w-full text-[11px] p-1 pl-4 bg-white border border-neutral-300 rounded text-right font-black text-blue-600"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-extrabold text-blue-600 font-mono">${p.price.toFixed(2)}</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    value={editStock}
                                    onChange={(e) => setEditStock(parseInt(e.target.value, 10) || 0)}
                                    className="w-14 text-[11px] p-1 bg-white border border-neutral-300 rounded text-center font-bold"
                                  />
                                ) : (
                                  <span className={`px-2 py-1 rounded-full text-[10.5px] font-black ${isLow ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 'bg-neutral-100 text-neutral-700'}`}>
                                    {p.stock} paquetes
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center items-center gap-1.5">
                                  <button 
                                    onClick={() => adjustStock(p, -5)}
                                    className="w-6 h-6 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded font-bold cursor-pointer flex items-center justify-center text-[10px]"
                                    title="Restar 5 paquetes"
                                  >
                                    -5
                                  </button>
                                  <button 
                                    onClick={() => adjustStock(p, -1)}
                                    className="w-6 h-6 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded font-bold cursor-pointer flex items-center justify-center text-[10px]"
                                    title="Restar 1 paquete"
                                  >
                                    -1
                                  </button>
                                  <button 
                                    onClick={() => adjustStock(p, 1)}
                                    className="w-6 h-6 bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded font-bold cursor-pointer flex items-center justify-center text-[10px]"
                                    title="Sumar 1 paquete"
                                  >
                                    +1
                                  </button>
                                  <button 
                                    onClick={() => adjustStock(p, 5)}
                                    className="w-6 h-6 bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded font-bold cursor-pointer flex items-center justify-center text-[10px]"
                                    title="Sumar 5 paquetes"
                                  >
                                    +5
                                  </button>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <button 
                                        onClick={() => handleSaveProductEdit(p.id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded-md text-[10px] cursor-pointer"
                                      >
                                        Listo
                                      </button>
                                      <button 
                                        onClick={() => setEditingProductId(null)}
                                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold px-2 py-1 rounded-md text-[10px] cursor-pointer"
                                        type="button"
                                      >
                                        Atrás
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => {
                                          setEditingProductId(p.id);
                                          setEditStock(p.stock);
                                          setEditPrice(p.price);
                                          setEditOriginalPrice(p.originalPrice || p.price);
                                          setEditPackSize(p.packSize || 6);
                                          setEditUnitType(p.unitType || 'Latas');
                                        }}
                                        className="p-1 px-2 border border-neutral-200 hover:border-neutral-300 text-neutral-500 hover:text-neutral-700 bg-white hover:bg-neutral-50 rounded text-[11px]"
                                        title="Editar precio y stock directamente"
                                      >
                                        Editar
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteProduct(p.id)}
                                        className="p-1 px-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded shrink-0"
                                        title="Eliminar de catálogo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STATS & ANALYTICS CHART */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {/* Chart item 1: Stock levels breakdown */}
              <div className="bg-white border-t-4 border-yellow-500 rounded-lg shadow-sm p-5 space-y-4">
                <div>
                  <h4 className="font-extrabold text-[#323232] text-xs uppercase tracking-widest">Nivel de Stock Absoluto por Categoría</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Suma física total en almacén.</p>
                </div>
                <div className="h-72 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryStock} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke="#a3a3a3" />
                      <YAxis stroke="#a3a3a3" />
                      <Tooltip formatter={(value) => [`${value} unidades`, 'Stock Físico']} />
                      <Legend />
                      <Bar dataKey="Stock" fill="#3c8dbc" radius={[4, 4, 0, 0]}>
                        {categoryStock.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart item 2: Revenue per category */}
              <div className="bg-white border-t-4 border-emerald-500 rounded-lg shadow-sm p-5 space-y-4">
                <div>
                  <h4 className="font-extrabold text-[#323232] text-xs uppercase tracking-widest">Ingresos Totales Recaudados ($)</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Calculado en base a órdenes en estado "Entregado".</p>
                </div>
                
                <div className="h-72 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categorySales} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke="#a3a3a3" />
                      <YAxis stroke="#a3a3a3" />
                      <Tooltip formatter={(value) => [`$ ${Number(value).toFixed(2)}`, 'Monto de Ventas']} />
                      <Legend />
                      <Bar dataKey="Monto" fill="#10b981" radius={[4, 4, 0, 0]}>
                        {categorySales.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grid 3: Live updates dashboard checklist */}
              <div className="bg-white border-t-4 border-blue-500 rounded-lg shadow-sm p-4 col-span-1 md:col-span-2 space-y-3.5">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h4 className="font-extrabold text-[#323232] text-xs uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                    <span>Tutorial de Interacción en Tiempo Real</span>
                  </h4>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 font-bold rounded">Simuladores Activos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-neutral-600 leading-relaxed">
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <strong className="text-neutral-800 block mb-1">1. Solicitar Refrescos</strong>
                    Ingresa en la pestaña "Catálogo de Clientes" usando un WhatsApp ficticio, arma tu carrito y envíalo.
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <strong className="text-neutral-800 block mb-1">2. Alertas de Admin</strong>
                    El pedido aparecerá inmediatamente en la pestaña "Pedidos Recibidos" con avisos reactivos de inventario.
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <strong className="text-neutral-800 block mb-1">3. Ruta de Envío</strong>
                    Cambia el estado del pedido a "Preparando" o "En Camino" para que el cliente pueda ver su tracking.
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <strong className="text-neutral-800 block mb-1">4. Refund del Cancelar</strong>
                    Si cancelas una orden, verás cómo el stock del producto regresa instantáneamente en la pestaña "Control de Inventario".
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 5. Firebase Setup and Connection Helper Modal */}
      {showFirebaseModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90%] border border-neutral-200">
            {/* Header */}
            <div className="bg-[#222d32] text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-yellow-500 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">
                    Conexión Firebase Firestore
                  </h3>
                  <span className="text-[10px] text-gray-400">⚡ Preparado y listo para producción</span>
                </div>
              </div>
              <button 
                onClick={() => setShowFirebaseModal(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-neutral-700 text-xs text-left">
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col space-y-2">
                <span className="font-bold text-neutral-800 text-xs block">Estado de Configuración Actual:</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isFirebaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className="font-bold text-neutral-900 text-[11px]">
                    {isFirebaseConfigured() ? '¡Firebase Configurado! (Detectado)' : 'Cliente Local Activo (db.json)'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-snug">
                  {isFirebaseConfigured() 
                    ? 'Hemos detectado tus credenciales de Firebase de forma exitosa en el cliente.' 
                    : 'Aún no se han configurado credenciales. El sistema está operando con almacenamiento local. Puedes colocar tus claves de Firebase directamente para migrar en producción.'}
                </p>
              </div>

              {/* Instructions */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-1 text-slate-800">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>¿Cómo conectar tu propia base de datos?</span>
                </h4>
                <p className="text-neutral-600 leading-relaxed text-[11px]">
                  Sigue estos simples pasos para conectar tu propio proyecto de Firebase en la nube:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-[11px] pl-1 text-neutral-600">
                  <li>
                    Ingresa a tu <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold hover:underline">Consola de Firebase</a> y crea un nuevo proyecto.
                  </li>
                  <li>
                    Inicializa <strong>Firestore Database</strong> en tu consola en modo de prueba (elige la región física más cercana).
                  </li>
                  <li>
                    Ve a la <strong>Configuración de Proyecto</strong> (ícono de engrane arriba a la izquierda) y en la sección de Aplicaciones, registra una <strong>Aplicación Web</strong> para obtener tus claves.
                  </li>
                  <li>
                    Abre el archivo <code className="bg-neutral-100 px-1 border rounded text-[10px] text-rose-600">src/firebase.ts</code> en tu editor y reemplaza las propiedades de <code className="bg-neutral-100 px-1 border text-rose-600 text-[10px]">firebaseConfig</code>, o agrégalas en tu archivo de variables de entorno <code className="bg-neutral-100 px-1 border text-rose-600 text-[10px]">.env</code>.
                  </li>
                </ol>
              </div>

              {/* Test section */}
              <div className="pt-3 border-t">
                <h4 className="font-bold text-neutral-900 text-xs mb-2 uppercase tracking-wide text-left">Probar Conexión</h4>
                
                <button
                  onClick={handleTestFirebase}
                  disabled={testingFirebase || !isFirebaseConfigured()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#3c8dbc] hover:bg-[#357ebd] disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold rounded-lg transition-all cursor-pointer shadow-sm text-xs"
                >
                  {testingFirebase ? (
                    <>
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      <span>Verificando conexión en el servidor...</span>
                    </>
                  ) : (
                    <span>Validar mi Configuración de Firebase Now ⚡</span>
                  )}
                </button>

                {!isFirebaseConfigured() && (
                  <p className="text-[10px] text-amber-500 mt-1.5 text-center">
                    ⚠️ Primero debes colocar las credenciales en <code className="bg-neutral-100 px-1 border rounded text-[10px] text-[10px]">firebase.ts</code> para poder probar.
                  </p>
                )}

                {firebaseTestResult && (
                  <div className={`mt-3 p-3.5 rounded-lg border text-[11px] flex items-start gap-2.5 ${firebaseTestResult.success ? 'bg-emerald-50 border-emerald-200 text-neutral-800' : 'bg-rose-50 border-rose-200 text-neutral-800'}`}>
                    {firebaseTestResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="block font-bold">{firebaseTestResult.success ? 'Conexión Exitosa' : 'Fallo en la Conexión'}</strong>
                      <p className="mt-0.5 text-neutral-600 font-mono text-[10px]">{firebaseTestResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-neutral-50 px-6 py-4 border-t flex justify-between items-center shrink-0">
              <span className="text-[10px] text-neutral-400">Bebidas & Inventarios</span>
              <button
                onClick={() => setShowFirebaseModal(false)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Product */}
      {productToDelete !== null && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-neutral-200">
            <div className="flex items-center gap-3 text-amber-500 mb-4 justify-start">
              <AlertTriangle className="w-8 h-8 shrink-0 text-amber-500" />
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-neutral-950">
                Confirmar Eliminación
              </h3>
            </div>
            <p className="text-neutral-600 text-xs leading-relaxed mb-6">
              ¿Estás seguro de que quieres eliminar este producto del inventario? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDeleteProduct(productToDelete)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for resetting database */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-neutral-200">
            <div className="flex items-center gap-3 text-amber-500 mb-4 justify-start">
              <AlertTriangle className="w-8 h-8 shrink-0 text-amber-500 animate-bounce" />
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-neutral-950">
                Reiniciar Catálogo
              </h3>
            </div>
            <p className="text-neutral-600 text-xs leading-relaxed mb-6">
              ¿Deseas restaurar el catálogo predeterminado y borrar el historial de pruebas? Esta acción restablecerá todo el inventario y pedidos.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeResetDatabase}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Info/Alert Dialog */}
      {showAlertInfo !== null && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-neutral-200">
            <div className="flex items-center gap-3 text-emerald-500 mb-4 justify-start">
              <CheckCircle className="w-8 h-8 shrink-0 text-emerald-500" />
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-neutral-950">
                Operación Exitosa
              </h3>
            </div>
            <p className="text-neutral-600 text-xs leading-relaxed mb-6">
              {showAlertInfo}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAlertInfo(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
