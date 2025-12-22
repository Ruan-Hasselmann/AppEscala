// src/contexts/AuthContext.tsx
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { auth } from "@/src/services/firebase";
import { createPerson, getPersonById } from "@/src/services/people";
import { SYSTEM_ROLE_LABEL, SystemRole } from "../constants/role";

/* =========================
   TYPES
========================= */

export { SYSTEM_ROLE_LABEL, SystemRole };

export type AppUser = {
  uid: string;
  email: string;
  name: string;
  role: SystemRole;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log("AUTH STATE CHANGED:", firebaseUser?.uid);

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const person = await waitForPerson(firebaseUser.uid);

        if (!person) {
          console.warn("⚠️ Pessoa ainda não existe no Firestore");
          setUser(null);
          setLoading(false);
          return;
        }

        setUser({
          uid: person.uid,
          email: person.email,
          name: person.name,
          role: person.role,
        });
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  async function login(email: string, password: string) {
    await auth.signInWithEmailAndPassword(
      email.trim().toLowerCase(),
      password
    );
  }

  async function register({ name, email, password }: RegisterInput) {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const cred = await auth.createUserWithEmailAndPassword(cleanEmail, password);
    if (!cred.user) return;

    await cred.user.updateProfile({ displayName: cleanName });

    // ✅ cria Person imediatamente (evita usuário fantasma)
    await createPerson({
      uid: cred.user.uid,
      name: cleanName,
      email: cleanEmail,
      role: "member",
    });
  }

  async function waitForPerson(
    uid: string,
    retries = 6,
    delay = 400
  ) {
    for (let i = 0; i < retries; i++) {
      const person = await getPersonById(uid);

      if (person) return person;

      await new Promise((res) => setTimeout(res, delay));
    }

    return null;
  }

  async function logout() {
    await auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
