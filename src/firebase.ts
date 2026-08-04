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
  onSnapshot,
} from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

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
export const auth = getAuth(app)

// Sign in anonymously so Firestore rules dapat mensyaratkan `request.auth != null`.
// Best-effort: kalau provider Anonymous belum diaktifkan di Firebase Console,
// sign-in gagal tapi app tetap jalan (dengan rules lama yang terbuka).
// authReady selalu resolve (tidak pernah reject) supaya app tidak menggantung.
export const authReady: Promise<void> = signInAnonymously(auth)
  .then(() => undefined)
  .catch((e) => {
    console.warn(
      '[KosManager] Anonymous auth gagal — aktifkan provider "Anonymous" di Firebase Console ' +
      '(Authentication > Sign-in method) sebelum deploy firestore.rules yang ketat.',
      e?.code ?? e
    )
  })

export {
  collection, getDocs, doc, addDoc, updateDoc,
  deleteDoc, setDoc, getDoc, query, orderBy, deleteField, writeBatch, onSnapshot,
}
