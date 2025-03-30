// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlxdAcy3E3QxrMbc-zmh2krDTcQWe0AV4",
  authDomain: "petpooja-3affd.firebaseapp.com",
  projectId: "petpooja-3affd",
  storageBucket: "petpooja-3affd.firebasestorage.app",
  messagingSenderId: "6302234192",
  appId: "1:6302234192:web:0026b044c082a0bc6a0355"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app)