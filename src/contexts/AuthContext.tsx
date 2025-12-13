import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { AppUser } from "../types/User";


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
    console.log("🔐 Tentando login:", email);
    await auth.signInWithEmailAndPassword(email, password);
    console.log("✅ Login OK");
  }


  async function logout() {
    await auth.signOut();
    setUser(null);
  }


  useEffect(() => {
    console.log("👂 Registrando auth listener (compat)");

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log("🔄 Auth mudou:", firebaseUser?.uid);

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const ref = db.collection("users").doc(firebaseUser.uid);
      const snap = await ref.get();

      if (snap.exists) {
        setUser(snap.data() as AppUser);
      } else {
        const newUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          name: firebaseUser.email ?? "Usuário",
          role: "MEMBER",
        };

        await ref.set(newUser);
        setUser(newUser);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);


  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
