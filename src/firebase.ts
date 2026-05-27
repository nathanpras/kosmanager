import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  orderBy,
  deleteField,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "kos-manager-93c43.firebaseapp.com",
  projectId: "kos-manager-93c43",
  storageBucket: "kos-manager-93c43.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export {
  collection, getDocs, doc, addDoc, updateDoc,
  deleteDoc, setDoc, getDoc, query, orderBy, deleteField,
}
