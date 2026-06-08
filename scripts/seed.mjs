// สร้างผู้ใช้ admin เริ่มต้น (admin / admin123) ถ้ายังไม่มี
// ใช้เมื่อยังไม่มีไฟล์ Users CSV จากระบบเดิม — รันด้วย: npm run seed
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { initializeApp } from 'firebase/app'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

const SALT = 'dialysis_salt_2026'

function loadEnv() {
  let raw = ''
  try {
    raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  } catch {
    console.error('ไม่พบไฟล์ .env — กรุณาคัดลอก .env.example เป็น .env แล้วกรอกค่า Firebase ก่อน')
    process.exit(1)
  }
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(String(password) + SALT)
  const digest = await webcrypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const env = loadEnv()
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const db = getFirestore(app)

const ref = doc(db, 'users', 'admin')
if ((await getDoc(ref)).exists()) {
  console.log('มีผู้ใช้ admin อยู่แล้ว — ไม่ทำอะไร')
} else {
  await setDoc(ref, {
    username: 'admin',
    password: await hashPassword('admin123'),
    name: 'ผู้ดูแลระบบ',
    role: 'admin',
    createdDate: new Date().toISOString().slice(0, 10),
  })
  console.log('สร้างผู้ใช้ admin เรียบร้อย (username: admin / password: admin123)')
  console.log('⚠️  กรุณาเปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบครั้งแรก')
}
process.exit(0)
