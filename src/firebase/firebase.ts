import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

let app: any;
let auth: any = null;
let db: any = null;
let isFirebaseActive = false;

// Trik sakti gabungan env untuk browser & server
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || (process.env?.VITE_FIREBASE_API_KEY) || "",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || (process.env?.VITE_FIREBASE_AUTH_DOMAIN) || "",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || (process.env?.VITE_FIREBASE_PROJECT_ID) || "",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || (process.env?.VITE_FIREBASE_STORAGE_BUCKET) || "",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || (process.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || "",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || (process.env?.VITE_FIREBASE_APP_ID) || "",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || (process.env?.VITE_FIREBASE_MEASUREMENT_ID) || ""
};

const hasValidConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.trim() !== "" &&
  !firebaseConfig.apiKey.includes("...");

if (hasValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log("🔥 Firebase initialized successfully from .env!");
  } catch (error) {
    console.error("⚠️ Failed to initialize Firebase:", error);
  }
} else {
  console.info("📝 firebase.ts loaded in Preparation / Fallback mode.");
}

export { app, auth, db, isFirebaseActive };
export default app;