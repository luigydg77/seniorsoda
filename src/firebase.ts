/// <reference types="vite/client" />

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

/**
 * CONFIGURACIÓN DE FIREBASE
 * 
 * Se obtienen automáticamente las credenciales asignadas por AI Studio.
 * Si deseas usar tu propia cuenta, edita este objeto o define tus variables .env.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "TU_API_KEY_AQUÍ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "TU_AUTH_DOMAIN_AQUÍ",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "TU_PROJECT_ID_AQUÍ",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "TU_STORAGE_BUCKET_AQUÍ",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "TU_MESSAGING_SENDER_ID_AQUÍ",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "TU_APP_ID_AQUÍ",
  databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined
};

// Comprobar si las credenciales son válidas y no son placeholders por defecto
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey !== "TU_API_KEY_AQUÍ" &&
    firebaseConfig.projectId !== "TU_PROJECT_ID_AQUÍ" &&
    firebaseConfig.apiKey !== "" &&
    firebaseConfig.projectId !== ""
  );
};

// Inicializar la aplicación de Firebase
let app;
if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
  }
}

export const firebaseApp = app;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app, firebaseConfig.databaseId) : null;


/**
 * Validador de conexión para ayudar a depurar si las credenciales son válidas.
 */
export async function testFirebaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseConfigured() || !db) {
    return { 
      success: false, 
      message: "Firebase no está configurado de forma correcta o faltan las credenciales." 
    };
  }
  try {
    // Intenta leer un documento ficticio del servidor para verificar acceso del cliente
    await getDocFromServer(doc(db, "test", "connection"));
    return { success: true, message: "¡Conectado exitosamente a Firebase Firestore!" };
  } catch (error: any) {
    console.warn("Prueba de conexión a Firestore:", error.message);
    if (error.message && error.message.includes("is offline")) {
      return { success: false, message: "El cliente está desconectado o sin internet." };
    }
    // Si da un error de permiso o no encontrado pero se comunica, es una respuesta válida del servidor
    return { 
      success: true, 
      message: `Comunicación verificada con Firebase (Servidor respondió: ${error.code || error.message})` 
    };
  }
}
