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
  uid: string;
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
    // NÃO seta user
    // NÃO busca Firestore
    // Listener resolve tudo
  }

  /* =========================
     LOGOUT
  ========================= */

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  /* =========================
     AUTH LISTENER (única fonte)
  ========================= */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid));

      if (!snap.exists()) {
        console.warn("⚠️ Usuário autenticado sem perfil");
        await signOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }

      setUser({
        uid: firebaseUser.uid,
        ...(snap.data() as Omit<AppUser, "uid">),
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
