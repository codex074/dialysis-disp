import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// ค่าคอนฟิกอ่านจากไฟล์ .env (ดู .env.example) — กรอกค่าจาก Firebase Console ของคุณเอง
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// ชื่อ collection ใน Firestore (ตรงกับชีตเดิมใน Google Sheets)
export const COL = {
  users: 'users',
  patients: 'patients',
  fluids: 'fluids',
  dispenses: 'dispenses',
  appointments: 'appointments',
} as const
