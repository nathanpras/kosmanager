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
  writeBatch,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBNcwZ7jlUqO0j2HR6OrzPkdRXcSufcuW4",
  authDomain: "kos-manager-93c43.firebaseapp.com",
  projectId: "kos-manager-93c43",
  storageBucket: "kos-manager-93c43.firebasestorage.app",
  messagingSenderId: "511610972401",
  appId: "1:511610972401:web:29d02183090afd12be2150",
  measurementId: "G-TRGKXQB71N",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export {
  collection, getDocs, doc, addDoc, updateDoc,
  deleteDoc, setDoc, getDoc, query, orderBy, deleteField, writeBatch,
}
