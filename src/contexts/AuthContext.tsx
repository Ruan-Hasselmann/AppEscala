// src/contexts/AuthContext.tsx
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { createPerson, getPersonById } from "@/src/services/authPeople";
import { auth } from "@/src/services/firebase";

import { SystemRole } from "../constants/role";

/* =========================
   TYPES
========================= */

export type AppUser = {
  uid: string;
  email: string;
  name: string;
  role: SystemRole;
  personId: string;
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
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/* =========================
   PROVIDER
========================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const person = await waitForPerson(firebaseUser.uid);

        if (!person) {
          setUser(null);
          setLoading(false);
          return;
        }

        // 🔐 REGRA DE PAPEL DO SISTEMA
        const systemRole = resolveSystemRole(person);

        setUser({
          uid: person.uid,
          email: person.email,
          name: person.name,
          role: systemRole,
          personId: person.id,
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

  /* =========================
     ACTIONS
  ========================= */

  async function login(email: string, password: string) {
    await auth.signInWithEmailAndPassword(
      email.trim().toLowerCase(),
      password
    );
  }

  async function register({ name, email, password }: RegisterInput) {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const cred = await auth.createUserWithEmailAndPassword(
      cleanEmail,
      password
    );

    if (!cred.user) return;

    await cred.user.updateProfile({ displayName: cleanName });

    await createPerson({
      uid: cred.user.uid,
      name: cleanName,
      email: cleanEmail,
      role: "member", // 🔥 SEMPRE MEMBER NA CRIAÇÃO
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

  async function refreshUser() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    const person = await getPersonById(firebaseUser.uid);
    if (!person) return;

    setUser({
      uid: person.uid,
      email: person.email,
      name: person.name,
      role: person.role,
      personId: person.id,
    });
  }

  function resolveSystemRole(person: any): SystemRole {
    // 🔒 Admin nunca perde privilégio
    if (person.role === "admin") {
      return "admin";
    }

    // 🔥 Se for líder em QUALQUER ministério → leader
    const isLeader = person.ministries?.some(
      (m: any) => m.role === "leader"
    );

    if (isLeader) {
      return "leader";
    }

    return "member";
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
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
