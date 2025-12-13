import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSsE8YVxUcsSIheaaqmtOJnnBveGgxC2g",
  authDomain: "comunicacao-templo.firebaseapp.com",
  projectId: "comunicacao-templo",
  storageBucket: "comunicacao-templo.firebasestorage.app",
  messagingSenderId: "814075436126",
  appId: "1:814075436126:web:09ac373ec473d22f7568cf"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

console.log("🔥 Firebase COMPAT inicializado");
