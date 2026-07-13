import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, UserRole } from "../models/types";
import { auth, isFirebaseActive } from "../firebase/config";
import { pklService } from "../services/pklService";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
} from "firebase/auth";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebase: boolean;
  loginAsRole: (role: UserRole, email?: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Seed Users (Stored in local storage or simulated)
const SEED_USERS: Record<string, UserProfile> = {
  "siswa@smksanjaya.sch.id": {
    uid: "siswa_sanjaya_123",
    name: "Siswa Sanjaya Bajawa",
    email: "siswa@smksanjaya.sch.id",
    role: "siswa",
    nisn: "0081234567",
    kelas: "XII TKJ (Teknik Komputer & Jaringan)",
    tempatPkl: "Dinas Kominfo Ngada",
    tempatPklId: "p1",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    tahunAjaran: "2025/2026 - Genap",
    createdAt: new Date().toISOString(),
  },
  "sergiusnono80@guru.smk.belajar.id": {
    uid: "pembimbing_sergius_456",
    name: "Drs. Sergius Nono",
    email: "sergiusnono80@guru.smk.belajar.id",
    role: "pembimbing",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    createdAt: new Date().toISOString(),
  },
  "penyelia@mitra.com": {
    uid: "penyelia_mitra_999",
    name: "Yosef Sanjaya (Penyelia)",
    email: "penyelia@mitra.com",
    role: "industri",
    tempatPkl: "Sanjaya Motor Bajawa",
    tempatPklId: "p3",
    photoURL: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200",
    createdAt: new Date().toISOString(),
  },
  "wasosergio@gmail.com": {
    uid: "admin_pkl_789",
    name: "Admin PKL SMKS Sanjaya",
    email: "wasosergio@gmail.com",
    role: "admin",
    photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200",
    createdAt: new Date().toISOString(),
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // If Firebase is active, listen to auth state changes
    if (isFirebaseActive && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Check database first
          let dbProfile: UserProfile | undefined;
          try {
            const allProfiles = await pklService.getAllUserProfiles();
            dbProfile = allProfiles.find(p => p.email.toLowerCase() === (firebaseUser.email || "").toLowerCase());
          } catch (e) {}

          const localProfileStr = localStorage.getItem(`profile_${firebaseUser.uid}`);
          let profile: UserProfile;

          if (dbProfile) {
            profile = {
              ...dbProfile,
              uid: firebaseUser.uid,
              photoURL: firebaseUser.photoURL || dbProfile.photoURL,
            };
          } else if (localProfileStr) {
            profile = JSON.parse(localProfileStr);
          } else {
            // Determine role by email
            const email = firebaseUser.email || "";
            let role: UserRole = "siswa";
            if (email.includes("guru") || email === "sergiusnono80@guru.smk.belajar.id") {
              role = "pembimbing";
            } else if (email.includes("admin") || email === "wasosergio@gmail.com") {
              role = "admin";
            }

            profile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "Pengguna PKL",
              email: email,
              role: role,
              photoURL: firebaseUser.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };

            // Seed with fields if it's our target guru
            if (email === "sergiusnono80@guru.smk.belajar.id") {
              profile.name = "Drs. Sergius Nono";
            } else if (role === "siswa") {
              profile.nisn = "0081234567";
              profile.kelas = "XII TKJ";
              profile.tempatPkl = "Dinas Kominfo Ngada";
            }
          }

          localStorage.setItem(`profile_${firebaseUser.uid}`, JSON.stringify(profile));
          setUser(profile);
        } else {
          // If no Firebase Auth user, check if we have a saved mock/local session in localStorage
          const savedUser = localStorage.getItem("pkl_current_user");
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Fallback: Check local storage for persistent mock session
      const savedUser = localStorage.getItem("pkl_current_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        // Automatically pre-log in as Drs. Sergius Nono by default so the supervisor role is shown
        // but let's keep it clean: let them start on the Login screen and pick a role.
        setUser(null);
      }
      // Introduce a slight artificial delay to show off the gorgeous loading screen!
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const loginAsRole = async (role: UserRole, customEmail?: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      let selectedEmail = customEmail || "";
      if (!selectedEmail) {
        if (role === "siswa") selectedEmail = "siswa@smksanjaya.sch.id";
        else if (role === "pembimbing") selectedEmail = "sergiusnono80@guru.smk.belajar.id";
        else if (role === "industri") selectedEmail = "penyelia@mitra.com";
        else selectedEmail = "wasosergio@gmail.com";
      }

      // Check if there is an existing database profile with this email first!
      let dbProfile: UserProfile | undefined;
      try {
        const allProfiles = await pklService.getAllUserProfiles();
        dbProfile = allProfiles.find(p => p.email.toLowerCase() === selectedEmail.toLowerCase());
      } catch (e) {}

      const seedProfile = dbProfile || SEED_USERS[selectedEmail] || {
        uid: `user_${Date.now()}`,
        name: `Pengguna ${role}`,
        email: selectedEmail,
        role: role,
        createdAt: new Date().toISOString(),
      };

      // Persistence
      localStorage.setItem("pkl_current_user", JSON.stringify(seedProfile));
      setUser(seedProfile);
      return seedProfile;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<UserProfile> => {
    if (!isFirebaseActive || !auth) {
      // If Firebase is inactive, emulate Google Login by logging in as the supervisor (Drs. Sergius Nono)
      return loginAsRole("pembimbing", "sergiusnono80@guru.smk.belajar.id");
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check database first
      let dbProfile: UserProfile | undefined;
      try {
        const allProfiles = await pklService.getAllUserProfiles();
        dbProfile = allProfiles.find(p => p.email.toLowerCase() === (firebaseUser.email || "").toLowerCase());
      } catch (e) {}

      const localProfileStr = localStorage.getItem(`profile_${firebaseUser.uid}`);
      let profile: UserProfile;

      if (dbProfile) {
        profile = {
          ...dbProfile,
          uid: firebaseUser.uid,
          photoURL: firebaseUser.photoURL || dbProfile.photoURL,
        };
      } else if (localProfileStr) {
        profile = JSON.parse(localProfileStr);
      } else {
        const email = firebaseUser.email || "";
        let role: UserRole = "siswa";
        if (email.includes("guru") || email === "sergiusnono80@guru.smk.belajar.id") {
          role = "pembimbing";
        } else if (email.includes("admin") || email === "wasosergio@gmail.com") {
          role = "admin";
        }

        profile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "Pengguna PKL",
          email: email,
          role: role,
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };

        if (email === "sergiusnono80@guru.smk.belajar.id") {
          profile.name = "Drs. Sergius Nono";
        } else if (role === "siswa") {
          profile.nisn = "0081234567";
          profile.kelas = "XII TKJ";
          profile.tempatPkl = "Dinas Kominfo Ngada";
        }
      }

      localStorage.setItem(`profile_${firebaseUser.uid}`, JSON.stringify(profile));
      setUser(profile);
      return profile;
    } catch (error) {
      console.error("Error logging in with Google:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      if (isFirebaseActive && auth) {
        await fbSignOut(auth);
      }
      localStorage.removeItem("pkl_current_user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
    if (!user) throw new Error("No authenticated user");

    const updated = { ...user, ...profileData };
    setUser(updated);

    if (isFirebaseActive) {
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updated));
    } else {
      localStorage.setItem("pkl_current_user", JSON.stringify(updated));
    }

    // Update in general seed lists too
    if (SEED_USERS[user.email]) {
      SEED_USERS[user.email] = updated as UserProfile;
    }

    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebase: isFirebaseActive,
        loginAsRole,
        loginWithGoogle,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
