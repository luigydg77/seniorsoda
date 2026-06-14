import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// Base de datos local deshabilitada por solicitud del usuario
// const DB_FILE = path.join(process.cwd(), "db.json");

interface Product {
  id: string;
  name: string;
  category: 'Gaseosas' | 'Jugos' | 'Aguas y Energizantes';
  price: number;
  originalPrice: number;
  packSize: number;
  unitType: string;
  stock: number;
  imageUrl: string;
  description: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

type OrderStatus = 'Pendiente' | 'Preparando' | 'En Camino' | 'Entregado' | 'Cancelado';

interface Order {
  id: string;
  whatsappNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  deliveryAddress: string;
  notes?: string;
}

// Initial default data if db.json doesn't exist
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Coca-Cola Original 3L",
    category: "Gaseosas",
    price: 32.40,
    originalPrice: 36.00,
    packSize: 6,
    unitType: "Botellas 3L",
    stock: 40,
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80",
    description: "Paquete de 6 botellas familiares de Coca-Cola de 3 Litros. ¡Ideal para tiendas y restaurantes!"
  },
  {
    id: "prod-2",
    name: "Inca Kola 2.25L",
    category: "Gaseosas",
    price: 23.80,
    originalPrice: 28.00,
    packSize: 6,
    unitType: "Botellas 2.25L",
    stock: 35,
    imageUrl: "https://images.unsplash.com/photo-1625772291427-39f7040dc411?w=500&auto=format&fit=crop&q=80",
    description: "Paquete de 6 botellas retornables de Inca Kola de 2.25 Litros."
  },
  {
    id: "prod-3",
    name: "Fanta Naranja Cans",
    category: "Gaseosas",
    price: 19.20,
    originalPrice: 24.00,
    packSize: 24,
    unitType: "Latas",
    stock: 50,
    imageUrl: "https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=500&auto=format&fit=crop&q=80",
    description: "Caja de 24 latas de Fanta Naranja de 355ml. Bebidas listas para refrigerar."
  },
  {
    id: "prod-4",
    name: "Frugos del Valle Durazno 1L",
    category: "Jugos",
    price: 18.70,
    originalPrice: 22.00,
    packSize: 12,
    unitType: "Botellas 1L",
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80",
    description: "Caja de 12 botellas de un litro de néctar de durazno premium."
  },
  {
    id: "prod-5",
    name: "Petit Jugo de Naranja 250ml",
    category: "Jugos",
    price: 12.00,
    originalPrice: 15.00,
    packSize: 24,
    unitType: "Jugos Pequeños",
    stock: 45,
    imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80",
    description: "Caja de 24 juguitos pequeños de naranja de 250ml, perfectos para loncheras y tiendas."
  },
  {
    id: "prod-6",
    name: "Jugo de Manzana Express 330ml",
    category: "Jugos",
    price: 15.30,
    originalPrice: 18.00,
    packSize: 12,
    unitType: "Latas de Jugo",
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
    description: "Caja de 12 latas de zumo de manzana verde fresca prensado en frío."
  },
  {
    id: "prod-7",
    name: "Agua Alpina sin gas 600ml",
    category: "Aguas y Energizantes",
    price: 9.60,
    originalPrice: 12.00,
    packSize: 24,
    unitType: "Botellas sin gas",
    stock: 80,
    imageUrl: "https://images.unsplash.com/photo-1608885898957-a599fb16ec17?w=500&auto=format&fit=crop&q=80",
    description: "Paquete de 24 botellas de agua purificada de 600ml. Hidratación al por mayor."
  },
  {
    id: "prod-8",
    name: "Red Bull Energy Drink 250ml",
    category: "Aguas y Energizantes",
    price: 48.00,
    originalPrice: 60.00,
    packSize: 24,
    unitType: "Latas",
    stock: 20,
    imageUrl: "https://images.unsplash.com/photo-1622543953490-0b7ce3535d74?w=500&auto=format&fit=crop&q=80",
    description: "Caja de 24 latas de bebida energizante de 250ml para vitalizar cuerpo y mente."
  }
];

interface UserProfile {
  phoneNumber: string;
  fullName: string;
  role: 'admin' | 'cliente';
  createdAt: string;
}

// Lógica de persistencia local (db.json) deshabilitada para usar Firebase directo
// interface DataStore { ... }
// function loadData() { ... }
// function saveData() { ... }

// Inicializar Firebase si el archivo de configuración existe y es válido
let firebaseApp: any = null;
let firestoreDb: any = null;

try {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyCN_3w-mFt8C-S5UtsH3tcsYjjql0HhYlU",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0811460767.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0811460767",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0811460767.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "261757690929",
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "1:261757690929:web:d48bd23e6856b46e68e110",
  };

  const databaseId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-db71a3a9-1e1c-4a7f-a876-74501d4de4c9";

  if (config.projectId && config.projectId !== "" && !config.projectId.includes("TU_PROJECT_ID")) {
    firebaseApp = initializeApp(config);
    firestoreDb = getFirestore(firebaseApp, databaseId);
    console.log(`🔥 Firebase configurado -> Proyecto: ${config.projectId}, Database: ${databaseId}`);
  }
} catch (err) {
  console.error("Error al inicializar Firebase en el Servidor Express:", err);
}

// Semilla de datos si la colección de Firebase está vacía
async function seedFirebaseIfNeeded() {
  if (!firestoreDb) return;
  try {
    const productsCol = collection(firestoreDb, "products");
    const snapshot = await getDocs(productsCol);
    if (snapshot.empty) {
      console.log("🌱 Sembrando DEFAULT_PRODUCTS iniciales en Cloud Firestore...");
      for (const prod of DEFAULT_PRODUCTS) {
        await setDoc(doc(firestoreDb, "products", prod.id), prod);
      }
      console.log("✅ ¡Productos sembrados con éxito en Cloud Firestore!");
    }
  } catch (error) {
    console.error("Error sembrando datos en Firebase:", error);
  }
}

async function findUserByPhone(phone: string): Promise<UserProfile | null> {
  if (!firestoreDb) return null;
  try {
    const docRef = doc(firestoreDb, "users", phone.trim().toLowerCase());
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  } catch (err) {
    console.error("Error buscando usuario en Firestore:", err);
    return null;
  }
}

async function saveUserProfile(user: UserProfile): Promise<void> {
  if (!firestoreDb) return;
  try {
    const docRef = doc(firestoreDb, "users", user.phoneNumber.trim().toLowerCase());
    await setDoc(docRef, user);
  } catch (err) {
    console.error("Error guardando usuario en Firestore:", err);
  }
}

async function getProducts(): Promise<Product[]> {
  if (!firestoreDb) return DEFAULT_PRODUCTS;
  try {
    const col = collection(firestoreDb, "products");
    const snap = await getDocs(col);
    const list: Product[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as Product);
    });
    return list.length > 0 ? list.sort((a, b) => a.id.localeCompare(b.id)) : DEFAULT_PRODUCTS;
  } catch (err) {
    console.error("Error al obtener productos de Firestore:", err);
    return DEFAULT_PRODUCTS;
  }
}

async function saveProduct(product: Product): Promise<void> {
  if (!firestoreDb) return;
  try {
    await setDoc(doc(firestoreDb, "products", product.id), product);
  } catch (err) {
    console.error("Error guardando producto en Firestore:", err);
  }
}

async function removeProduct(id: string): Promise<void> {
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, "products", id));
  } catch (err) {
    console.error("Error eliminando producto de Firestore:", err);
  }
}

async function getOrders(): Promise<Order[]> {
  if (!firestoreDb) return [];
  try {
    const col = collection(firestoreDb, "orders");
    const snap = await getDocs(col);
    const list: Order[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as Order);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Error al obtener pedidos de Firestore:", err);
    return [];
  }
}

async function saveOrder(order: Order): Promise<void> {
  if (!firestoreDb) return;
  try {
    await setDoc(doc(firestoreDb, "orders", order.id), order);
  } catch (err) {
    console.error("Error guardando pedido en Firestore:", err);
  }
}

async function resetDatabases(): Promise<void> {
  if (!firestoreDb) return;
  try {
    const productsSnap = await getDocs(collection(firestoreDb, "products"));
    for (const docSnap of productsSnap.docs) {
      await deleteDoc(doc(firestoreDb, "products", docSnap.id));
    }
    const ordersSnap = await getDocs(collection(firestoreDb, "orders"));
    for (const docSnap of ordersSnap.docs) {
      await deleteDoc(doc(firestoreDb, "orders", docSnap.id));
    }
    for (const prod of DEFAULT_PRODUCTS) {
      await setDoc(doc(firestoreDb, "products", prod.id), prod);
    }
    console.log("✅ Firestore reseteado correctamente.");
  } catch (err) {
    console.error("Error reseteando Firestore:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Sembrar datos iniciales si Firebase está configurado
  await seedFirebaseIfNeeded();

  app.use(express.json());

  // API User Login endpoint
  app.post("/api/users/login", async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: "Número de teléfono requerido" });
    }
    try {
      const user = await findUserByPhone(phoneNumber);
      if (user) {
        return res.json({ success: true, user });
      } else {
        return res.status(404).json({ success: false, error: "Usuario no registrado" });
      }
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      return res.status(500).json({ error: "Error en el servidor durante el inicio de sesión" });
    }
  });

  // API User Register endpoint
  app.post("/api/users/register", async (req, res) => {
    const { phoneNumber, fullName } = req.body;
    if (!phoneNumber || !fullName) {
      return res.status(400).json({ error: "Número de teléfono y nombre completo requeridos" });
    }
    try {
      // Check if user already exists
      const existingUser = await findUserByPhone(phoneNumber);
      if (existingUser) {
        return res.status(400).json({ error: "Este número de teléfono ya está registrado" });
      }

      const phoneNorm = phoneNumber.trim().toLowerCase();
      const nameNorm = fullName.trim().toLowerCase();
      let role: 'admin' | 'cliente' = "cliente";
      
      const ADMIN_WORDS = ["admin", "999999999", "admin123", "+51999999999", "123456789"];
      if (ADMIN_WORDS.some(word => phoneNorm.includes(word) || nameNorm.includes(word))) {
        role = "admin";
      }

      const newUser: UserProfile = {
        phoneNumber: phoneNumber.trim(),
        fullName: fullName.trim(),
        role,
        createdAt: new Date().toISOString()
      };

      await saveUserProfile(newUser);
      return res.status(201).json({ success: true, user: newUser });
    } catch (err) {
      console.error("Error al registrar usuario:", err);
      return res.status(500).json({ error: "Error en el servidor al registrar el usuario" });
    }
  });

  // API Products endpoint
  app.get("/api/products", async (req, res) => {
    try {
      const list = await getProducts();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener productos" });
    }
  });

  // Create Product (Admin)
  app.post("/api/products", async (req, res) => {
    const { name, category, price, originalPrice, packSize, unitType, stock, imageUrl, description } = req.body;
    if (!name || !category || typeof price !== "number" || typeof stock !== "number") {
      return res.status(400).json({ error: "Datos de producto inválidos" });
    }
    const newProduct: Product = {
      id: "prod-" + Date.now(),
      name,
      category,
      price,
      originalPrice: typeof originalPrice === "number" ? originalPrice : price,
      packSize: typeof packSize === "number" ? packSize : 6,
      unitType: unitType || "Unidades",
      stock,
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1543257580-7269da773bf5?w=200&auto=format&fit=crop&q=80",
      description: description || ""
    };
    try {
      await saveProduct(newProduct);
      res.status(201).json(newProduct);
    } catch (err) {
      res.status(500).json({ error: "Error al crear producto" });
    }
  });

  // Edit Product / Inventory Update (Admin/Real-time)
  app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const { name, category, price, originalPrice, packSize, unitType, stock, imageUrl, description } = req.body;
    
    try {
      const productsList = await getProducts();
      const originalProduct = productsList.find(p => p.id === id);
      if (!originalProduct) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const updatedProduct: Product = {
        ...originalProduct,
        name: name !== undefined ? name : originalProduct.name,
        category: category !== undefined ? category : originalProduct.category,
        price: price !== undefined ? Number(price) : originalProduct.price,
        originalPrice: originalPrice !== undefined ? Number(originalPrice) : (price !== undefined ? Number(price) : originalProduct.originalPrice),
        packSize: packSize !== undefined ? Number(packSize) : originalProduct.packSize,
        unitType: unitType !== undefined ? unitType : originalProduct.unitType,
        stock: stock !== undefined ? Number(stock) : originalProduct.stock,
        imageUrl: imageUrl !== undefined ? imageUrl : originalProduct.imageUrl,
        description: description !== undefined ? description : originalProduct.description
      };

      await saveProduct(updatedProduct);
      res.json(updatedProduct);
    } catch (err) {
      res.status(500).json({ error: "Error al editar producto" });
    }
  });

  // Delete Product
  app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const productsList = await getProducts();
      const exists = productsList.some(p => p.id === id);
      if (!exists) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      await removeProduct(id);
      res.json({ success: true, message: "Producto eliminado" });
    } catch (err) {
      res.status(500).json({ error: "Error al eliminar producto" });
    }
  });

  // API Orders endpoint
  app.get("/api/orders", async (req, res) => {
    try {
      const list = await getOrders();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener pedidos" });
    }
  });

  // Create Order (Client)
  app.post("/api/orders", async (req, res) => {
    const { whatsappNumber, items, deliveryAddress, notes } = req.body;
    if (!whatsappNumber || !items || !Array.isArray(items) || items.length === 0 || !deliveryAddress) {
      return res.status(400).json({ error: "Información de pedido incompleta" });
    }

    try {
      const productsList = await getProducts();

      // Verify stock first
      for (const item of items) {
        const product = productsList.find(p => p.id === item.productId);
        if (!product) {
          return res.status(400).json({ error: `El producto con ID ${item.productId} no existe` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Stock insuficiente para ${product.name}. Solo quedan ${product.stock} unidades.` });
        }
      }

      // Deduct stock and process items
      const processedItems: OrderItem[] = [];
      let grandTotal = 0;

      for (const item of items) {
        const product = productsList.find(p => p.id === item.productId)!;
        product.stock -= item.quantity;
        grandTotal += product.price * item.quantity;
        processedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          price: product.price
        });
        // Update product stock
        await saveProduct(product);
      }

      const newOrder: Order = {
        id: "PED-" + Math.floor(1000 + Math.random() * 9000),
        whatsappNumber,
        items: processedItems,
        total: Number(grandTotal.toFixed(2)),
        status: "Pendiente",
        createdAt: new Date().toISOString(),
        deliveryAddress,
        notes: notes || ""
      };

      await saveOrder(newOrder);
      res.status(201).json(newOrder);
    } catch (err) {
      res.status(500).json({ error: "Error al crear pedido" });
    }
  });

  // Update Order Status (Admin)
  app.put("/api/orders/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const ordersList = await getOrders();
      const orderIdx = ordersList.findIndex(o => o.id === id);
      if (orderIdx === -1) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      const order = ordersList[orderIdx];
      const oldStatus = order.status;
      const newStatus = status as OrderStatus;

      // Handle inventory refunds if cancelled
      if (newStatus === "Cancelado" && oldStatus !== "Cancelado") {
        const productsList = await getProducts();
        for (const item of order.items) {
          const product = productsList.find(p => p.id === item.productId);
          if (product) {
            product.stock += item.quantity;
            await saveProduct(product);
          }
        }
      } else if (oldStatus === "Cancelado" && newStatus !== "Cancelado") {
        const productsList = await getProducts();
        for (const item of order.items) {
          const product = productsList.find(p => p.id === item.productId);
          if (product) {
            product.stock = Math.max(0, product.stock - item.quantity);
            await saveProduct(product);
          }
        }
      }

      order.status = newStatus;
      await saveOrder(order);
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: "Error al actualizar estado del pedido" });
    }
  });

  // Clean / Reset DB (Helper)
  app.post("/api/reset", async (req, res) => {
    try {
      await resetDatabases();
      res.json({ message: "Base de datos restaurada correctamente" });
    } catch (err) {
      res.status(500).json({ error: "Error al restaurar bases de datos" });
    }
  });

  // Vite preview / dev middleware configuration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
