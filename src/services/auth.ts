// ระบบเข้าสู่ระบบ — เก็บ user ใน Firestore, ไม่ใช้ Firebase Auth (พอร์ตจาก Code.gs)
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db, COL } from '../firebase'
import { hashPassword } from '../lib/hash'
import { decodeToken, encodeToken, normalizeRole } from './api'
import type { ServiceResult, User, UserDoc } from '../types'

const TOKEN_TTL = 8 * 60 * 60 * 1000 // 8 ชั่วโมง

function buildUserPayload(d: UserDoc, token = ''): User {
  return {
    username: d.username,
    name: d.name,
    fullName: d.name,
    role: normalizeRole(d.role),
    token,
  }
}

export async function getUserDoc(username: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, COL.users, String(username).trim()))
  if (!snap.exists()) return null
  return snap.data() as UserDoc
}

export async function login(username: string, password: string): Promise<ServiceResult<User> & { token?: string; user?: User }> {
  try {
    const uname = String(username || '').trim()
    if (!uname) return { status: 'error', message: 'กรุณากรอก Username' }
    const userDoc = await getUserDoc(uname)
    if (!userDoc) return { status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
    const hashedInput = await hashPassword(password)
    if (userDoc.password !== hashedInput) {
      return { status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
    }
    const token = encodeToken(uname)
    return { status: 'success', message: 'เข้าสู่ระบบสำเร็จ', token, user: buildUserPayload(userDoc, token) }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function verifyToken(token: string | null): Promise<ServiceResult<User> & { user?: User }> {
  try {
    if (!token) return { status: 'error', message: 'ไม่พบ token' }
    const decoded = decodeToken(token)
    if (!decoded) return { status: 'error', message: 'Token ไม่ถูกต้อง' }
    if (Date.now() - decoded.timestamp > TOKEN_TTL) {
      return { status: 'error', message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่' }
    }
    const userDoc = await getUserDoc(decoded.username)
    if (!userDoc) return { status: 'error', message: 'ไม่พบผู้ใช้' }
    return { status: 'success', user: buildUserPayload(userDoc, token) }
  } catch {
    return { status: 'error', message: 'Token ไม่ถูกต้อง' }
  }
}

export async function changePassword(oldPassword: string, newPassword: string, token: string): Promise<ServiceResult> {
  try {
    const verify = await verifyToken(token)
    if (verify.status !== 'success' || !verify.user) return verify
    const userDoc = await getUserDoc(verify.user.username)
    if (!userDoc) return { status: 'error', message: 'ไม่พบผู้ใช้' }
    if (userDoc.password !== (await hashPassword(oldPassword))) {
      return { status: 'error', message: 'รหัสผ่านเดิมไม่ถูกต้อง' }
    }
    await updateDoc(doc(db, COL.users, userDoc.username), { password: await hashPassword(newPassword) })
    return { status: 'success', message: 'เปลี่ยนรหัสผ่านเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function updateMyProfile(
  profile: { fullName?: string; name?: string; currentPassword?: string; newPassword?: string },
  token: string,
): Promise<ServiceResult<User> & { user?: User }> {
  try {
    const verify = await verifyToken(token)
    if (verify.status !== 'success' || !verify.user) return verify
    const fullName = String(profile.fullName || profile.name || '').trim()
    if (!fullName) return { status: 'error', message: 'กรุณากรอกชื่อ-สกุล' }
    const currentPassword = String(profile.currentPassword || '')
    const newPassword = String(profile.newPassword || '')
    if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      return { status: 'error', message: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่ให้ครบ' }
    }
    if (newPassword && newPassword.length < 4) {
      return { status: 'error', message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' }
    }
    const userDoc = await getUserDoc(verify.user.username)
    if (!userDoc) return { status: 'error', message: 'ไม่พบผู้ใช้' }
    if (newPassword && userDoc.password !== (await hashPassword(currentPassword))) {
      return { status: 'error', message: 'รหัสผ่านเดิมไม่ถูกต้อง' }
    }
    const update: Partial<UserDoc> = { name: fullName }
    if (newPassword) update.password = await hashPassword(newPassword)
    await updateDoc(doc(db, COL.users, userDoc.username), update)
    return {
      status: 'success',
      message: newPassword ? 'อัปเดตโปรไฟล์และเปลี่ยนรหัสผ่านเรียบร้อย' : 'อัปเดตโปรไฟล์เรียบร้อย',
      user: buildUserPayload({ ...userDoc, name: fullName }, token),
    }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}
