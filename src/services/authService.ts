import { auth } from "../firebase-init";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

export const authService = {
  login: async (email: string, pass: string) => {
    await setPersistence(auth, browserLocalPersistence);
    return signInWithEmailAndPassword(auth, email, pass);
  },
  signup: async (email: string, pass: string) => {
    await setPersistence(auth, browserLocalPersistence);
    return createUserWithEmailAndPassword(auth, email, pass);
  },
  logout: async () => {
    return signOut(auth);
  },
  googleLogin: async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }
};
