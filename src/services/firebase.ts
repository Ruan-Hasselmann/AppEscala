// src/services/firebase.ts
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

/* =========================
   FIREBASE CONFIG
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyBSsE8YVxUcsSIheaaqmtOJnnBveGgxC2g",
  authDomain: "comunicacao-templo.firebaseapp.com",
  projectId: "comunicacao-templo",
  storageBucket: "comunicacao-templo.firebasestorage.app",
  messagingSenderId: "814075436126",
  appId: "1:814075436126:web:09ac373ec473d22f7568cf",
};

/* =========================
   INIT (singleton)
========================= */

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("🔥 Firebase COMPAT inicializado");
}

/* =========================
   EXPORTS
========================= */

export const auth = firebase.auth();
export const db = firebase.firestore();

export default firebase;
