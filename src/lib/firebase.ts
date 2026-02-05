import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// NOTE: For a real production app, these should be in environment variables
const firebaseConfig = {
  apiKey: "PLACEHOLDER",
  authDomain: "agenticlightos-demo.firebaseapp.com",
  projectId: "agenticlightos-demo",
  storageBucket: "agenticlightos-demo.firebasestorage.app",
  messagingSenderId: "PLACEHOLDER",
  appId: "PLACEHOLDER"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export default app;
