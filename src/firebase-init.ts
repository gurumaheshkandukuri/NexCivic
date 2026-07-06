import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
    GET = "get",
    WRITE = "write",
    DELETE = "delete",
    LIST = "list",
}

export const handleFirestoreError = (error: any, type: OperationType, path: string) => {
    console.error(`Firestore error during ${type} operation at ${path}:`, error);
};
