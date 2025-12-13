import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";

type Role = "admin" | "leader" | "member";

type AppUser = {
  uid: string;
  name: string;
  role: Role;
  ministryId?: string;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function login(email: string, password: string) {
    console.log("🟡 [AUTH] login() chamado");
    await signInWithEmailAndPassword(auth, email, password);
    console.log("🟢 [AUTH] Firebase autenticou");
  }

  useEffect(() => {
    console.log("🔵 [AUTH] Registrando onAuthStateChanged");

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🟣 [AUTH] onAuthStateChanged disparou");
      console.log("👤 firebaseUser:", firebaseUser?.uid);

      if (!firebaseUser) {
        console.log("⚪ [AUTH] Nenhum usuário logado");
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        console.log("📥 [AUTH] Buscando Firestore users/", firebaseUser.uid);

        const snap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!snap.exists()) {
          console.log("❌ [AUTH] Documento não existe");
          await signOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        const data = snap.data();
        console.log("✅ [AUTH] Dados Firestore:", data);

        setUser({
          uid: firebaseUser.uid,
          name: data.name,
          role: String(data.role).toLowerCase() as Role,
          ministryId: data.ministryId,
        });

        console.log("🟢 [AUTH] user setado com sucesso");
      } catch (err) {
        console.error("🔴 [AUTH] Erro:", err);
        await signOut(auth);
        setUser(null);
      } finally {
        setLoading(false);
        console.log("🔚 [AUTH] loading = false");
      }
    });

    return unsub;
  }, []);

  async function logout() {
    console.log("👋 [AUTH] logout");
    await signOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
