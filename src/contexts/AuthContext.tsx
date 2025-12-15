import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc
} from "firebase/firestore";
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
     LOGIN MANUAL
  ========================= */

  async function login(email: string, password: string) {
    console.log("🔐 AuthContext.login chamado");
    console.log("📧 email:", email);

    setLoading(true);

    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Firebase Auth OK:", cred.user.uid);

    const snap = await getDoc(doc(db, "users", cred.user.uid));
    console.log("📄 users doc existe?", snap.exists());

    if (!snap.exists()) {
      console.error("❌ Documento users não existe");
      await signOut(auth);
      setLoading(false);
      throw new Error("Perfil não encontrado");
    }

    setUser({
      uid: cred.user.uid,
      ...(snap.data() as any),
    });

    console.log("👤 User setado no context");

    setLoading(false);
  }


  /* =========================
     LOGOUT
  ========================= */

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  /* =========================
     AUTH LISTENER
  ========================= */

  useEffect(() => {
    console.log("🔄 AuthContext montado");

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("👀 onAuthStateChanged:", firebaseUser?.uid);

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      console.log("📄 users doc (listener) existe?", snap.exists());

      if (!snap.exists()) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser({
        uid: firebaseUser.uid,
        ...(snap.data() as any),
      });

      console.log("👤 User restaurado pelo listener");
      setLoading(false);
    });

    return unsub;
  }, []);


  /* =========================
     PROVIDER EXPORT
  ========================= */

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
