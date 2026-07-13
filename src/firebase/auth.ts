import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
} from "firebase/auth";
import { auth, isFirebaseActive } from "./firebase";
import { UserProfile, UserRole } from "../models/types";

/**
 * Registers a new user with an email and password.
 * Integrates with Firebase Auth when active, or local storage.
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  name: string,
  role: UserRole = "siswa"
): Promise<UserProfile> {
  if (isFirebaseActive && auth) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await fbUpdateProfile(userCredential.user, { displayName: name });

      const profile: UserProfile = {
        uid: userCredential.user.uid,
        name,
        email,
        role,
        createdAt: new Date().toISOString(),
      };

      // Persist profile to local storage for quick access
      localStorage.setItem(`profile_${profile.uid}`, JSON.stringify(profile));
      return profile;
    } catch (error) {
      console.error("Firebase registration failed:", error);
      throw error;
    }
  } else {
    // Fallback registration
    const uid = `siswa_${Date.now()}`;
    const profile: UserProfile = {
      uid,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    };
    
    // Save locally
    localStorage.setItem(`profile_${uid}`, JSON.stringify(profile));
    localStorage.setItem("pkl_current_user", JSON.stringify(profile));
    return profile;
  }
}

/**
 * Logs in a user using an email and password.
 * Integrates with Firebase Auth when active, or local storage.
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  if (isFirebaseActive && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;

      // Check if we have a stored profile for this UID
      const savedProfile = localStorage.getItem(`profile_${firebaseUser.uid}`);
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        localStorage.setItem("pkl_current_user", JSON.stringify(profile));
        return profile;
      }

      // If no stored profile exists, determine role and build it
      let role: UserRole = "siswa";
      if (email.includes("guru") || email === "sergiusnono80@guru.smk.belajar.id") {
        role = "pembimbing";
      } else if (email.includes("admin")) {
        role = "admin";
      }

      const profile: UserProfile = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "Pengguna PKL",
        email: firebaseUser.email || email,
        role,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(`profile_${firebaseUser.uid}`, JSON.stringify(profile));
      localStorage.setItem("pkl_current_user", JSON.stringify(profile));
      return profile;
    } catch (error) {
      console.error("Firebase login failed:", error);
      throw error;
    }
  } else {
    // Fallback login: search seed accounts or create simulated profile
    let role: UserRole = "siswa";
    let name = "Siswa Sanjaya Bajawa";

    if (email === "sergiusnono80@guru.smk.belajar.id" || email.includes("guru")) {
      role = "pembimbing";
      name = "Drs. Sergius Nono";
    } else if (email.includes("admin")) {
      role = "admin";
      name = "Admin PKL SMKS Sanjaya";
    }

    const profile: UserProfile = {
      uid: `mock_uid_${Date.now()}`,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("pkl_current_user", JSON.stringify(profile));
    return profile;
  }
}

/**
 * Logs out the current user session.
 */
export async function logoutUser(): Promise<void> {
  if (isFirebaseActive && auth) {
    await fbSignOut(auth);
  }
  localStorage.removeItem("pkl_current_user");
}
