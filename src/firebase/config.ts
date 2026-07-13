/**
 * Safe Firebase Initialization.
 * Supports fallback to local storage if Firebase credentials are not yet configured.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

let app;
let auth: any = null;
let db: any = null;
let isFirebaseActive = false;

// Check if there is a valid Firebase API Key
const hasValidConfig =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.trim() !== "" &&
  firebaseConfig.apiKey !== "MY_GEMINI_API_KEY"; // exclude template placeholders

if (hasValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    // Explicitly pass the firestoreDatabaseId if configured
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    isFirebaseActive = true;
    console.log("🔥 Firebase initialized successfully for PKL SANJAYA BAJAWA!");
  } catch (error) {
    console.error("⚠️ Failed to initialize real Firebase, using local fallback mode:", error);
  }
} else {
  console.info(
    "📝 Firebase is in PREPARATION mode. All operations will use local-first secure state engine, " +
      "which is structurally identical to Firestore and ready for seamless database swap."
  );
}

export { auth, db, isFirebaseActive };
export default app;
