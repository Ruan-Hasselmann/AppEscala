import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";

/* =========================
   TYPES
========================= */

export type AppUser = {
  personId: string;
  uid: string;
  email: string;
  name: string;
  role: "admin" | "leader" | "member";
  ministryIds: string[];
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export type UserProfile = Omit<AppUser, "uid" | "email">;

/* =========================
   CONTEXT
========================= */

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/* =========================
   PROVIDER
========================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     LOGIN
  ========================= */

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    // listener resolve
  }

  /* =========================
     LOGOUT
  ========================= */

  async function logout() {
    await signOut(auth);
  }

  /* =========================
     HELPER: aguarda perfil
  ========================= */

  async function waitForUserProfile(
    uid: string,
    retries = 6,
    delay = 500
  ): Promise<UserProfile | null> {
    for (let i = 0; i < retries; i++) {
      const snap = await getDoc(doc(db, "users", uid));

      if (snap.exists()) {
        return snap.data() as UserProfile;
      }

      await new Promise((res) => setTimeout(res, delay));
    }

    return null;
  }

  /* =========================
     AUTH LISTENER (única fonte)
  ========================= */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // 🔒 Não autenticado
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // ✅ A PARTIR DAQUI firebaseUser É GARANTIDO
      const profile = await waitForUserProfile(firebaseUser.uid);

      if (!profile) {
        console.error("❌ Perfil não encontrado após tentativas");
        setUser(null);
        setLoading(false);
        return;
      }

      setUser({
        ...profile,
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? "",
      });

      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================
   HOOK
========================= */

export function useAuth() {
  return useContext(AuthContext);
}
