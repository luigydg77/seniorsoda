export type Category = 'Todos' | 'Gaseosas' | 'Jugos' | 'Aguas y Energizantes';

export interface Product {
  id: string;
  name: string;
  category: 'Gaseosas' | 'Jugos' | 'Aguas y Energizantes';
  price: number;
  originalPrice: number; // For wholesale discounts
  packSize: number; // e.g., 6, 12, 24
  unitType: string; // e.g. "Latas", "Botellas 3L", "Botellas"
  stock: number;
  imageUrl: string;
  description: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'Pendiente' | 'Preparando' | 'En Camino' | 'Entregado' | 'Cancelado';

export interface Order {
  id: string;
  whatsappNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  deliveryAddress: string;
  notes?: string;
}

export interface UserProfile {
  phoneNumber: string;
  fullName: string;
  role: 'admin' | 'cliente';
  createdAt: string;
}
