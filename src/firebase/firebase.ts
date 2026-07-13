import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

let app;
let auth: any = null;
let db: any = null;
let isFirebaseActive = false;

const hasValidConfig =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.trim() !== "" &&
  firebaseConfig.apiKey !== "MY_GEMINI_API_KEY";

if (hasValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    isFirebaseActive = true;
    console.log("🔥 Firebase (firebase.ts) initialized successfully!");
  } catch (error) {
    console.error("⚠️ Failed to initialize Firebase in firebase.ts:", error);
  }
} else {
  console.info("📝 firebase.ts loaded in Preparation / Fallback mode.");
}

export { app, auth, db, isFirebaseActive };
export default app;
