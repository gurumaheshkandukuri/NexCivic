import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { createIssue } from "./src/services/issueService.js";

// Initialize using the local .env or hardcoded test keys
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function runTest() {
  try {
    console.log("Signing in...");
    // We need a valid citizen account.
    // We will attempt to login with a test citizen or just use whatever logic.
    // Wait, the API key needs to be loaded. We should use `dotenv` to load `.env`.
    const dotenv = await import('dotenv');
    dotenv.config();

    // Re-init with proper env
    const app2 = initializeApp({
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID
    }, "TestApp2");
    
    const auth2 = getAuth(app2);

    console.log("Please authenticate or test functions directly");

  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTest();
