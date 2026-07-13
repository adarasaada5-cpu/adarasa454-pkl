import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Gunakan object literal langsung untuk memastikan config tidak undefined
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// LOGGING UNTUK DEBUGGING (PENTING: Lihat ini di console browser nanti)
console.log("DEBUG CONFIG API KEY:", firebaseConfig.apiKey ? "ADA" : "KOSONG");

let app;
let auth;
let db;
let isFirebaseActive = false;

// Pastikan pengecekan validasi benar-benar ketat
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "" && !firebaseConfig.apiKey.includes("...")) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log("🔥 Firebase initialized successfully!");
  } catch (error) {
    console.error("⚠️ Failed to initialize Firebase:", error);
  }
} else {
  console.error("❌ Firebase config GAGAL terbaca! Cek Vercel Environment Variables.");
}

export { app, auth, db, isFirebaseActive };
export default app;