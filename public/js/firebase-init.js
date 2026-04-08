import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyATg_w5VJIKnwI_Br_1k86jdwoFcq6EHxY",
  authDomain: "tourgo-a8ca9.firebaseapp.com",
  projectId: "tourgo-a8ca9",
  storageBucket: "tourgo-a8ca9.firebasestorage.app",
  messagingSenderId: "797991116667",
  appId: "1:797991116667:web:d64ba93a4dfdddfe41e7de",
  measurementId: "G-KW6KJCMEN4",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

isSupported().then((ok) => {
  if (ok) getAnalytics(app);
});
