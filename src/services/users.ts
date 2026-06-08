// จัดการผู้ใช้ (เฉพาะ admin) — พอร์ตจาก Code.gs
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db, COL } from '../firebase'
import { hashPassword } from '../lib/hash'
import { formatDate, normalizeRole } from './api'
import { verifyToken } from './auth'
import type { ServiceResult, UserDoc } from '../types'

export interface UserListItem {
  username: string
  name: string
  fullName: string
  role: string
  createdDate: string
}

async function requireAdmin(token: string) {
  const verify = await verifyToken(token)
  if (verify.status !== 'success' || !verify.user) return verify
  if (verify.user.role !== 'admin') return { status: 'error' as const, message: 'ไม่มีสิทธิ์' }
  return verify
}

export async function getUsers(token: string): Promise<ServiceResult<UserListItem[]>> {
  const verify = await requireAdmin(token)
  if (verify.status !== 'success') return verify
  const snap = await getDocs(collection(db, COL.users))
  const users: UserListItem[] = snap.docs
    .map((d) => d.data() as UserDoc)
    .map((u) => ({
      username: u.username,
      name: u.name,
      fullName: u.name,
      role: normalizeRole(u.role),
      createdDate: u.createdDate ? formatDate(u.createdDate) : '',
    }))
    .filter((u) => u.username)
    .sort((a, b) => a.username.localeCompare(b.username))
  return { status: 'success', data: users }
}

export async function addUser(
  userData: { username?: string; password?: string; name?: string; fullName?: string; role?: string },
  token: string,
): Promise<ServiceResult> {
  try {
    const verify = await requireAdmin(token)
    if (verify.status !== 'success') return verify
    const username = String(userData.username || '').trim()
    if (!username) return { status: 'error', message: 'กรุณากรอก Username' }
    if ((await getDoc(doc(db, COL.users, username))).exists()) {
      return { status: 'error', message: 'Username นี้มีอยู่แล้ว' }
    }
    if (!String(userData.password || '')) return { status: 'error', message: 'กรุณากรอกรหัสผ่าน' }
    const newDoc: UserDoc = {
      username,
      password: await hashPassword(userData.password || ''),
      name: userData.name || userData.fullName || '',
      role: normalizeRole(userData.role),
      createdDate: formatDate(new Date()),
    }
    await setDoc(doc(db, COL.users, username), newDoc)
    return { status: 'success', message: 'เพิ่มผู้ใช้เรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function deleteUser(username: string, token: string): Promise<ServiceResult> {
  try {
    const verify = await requireAdmin(token)
    if (verify.status !== 'success') return verify
    if (username === verify.user!.username) return { status: 'error', message: 'ไม่สามารถลบบัญชีของตัวเองได้' }
    if (!(await getDoc(doc(db, COL.users, username))).exists()) {
      return { status: 'error', message: 'ไม่พบผู้ใช้' }
    }
    await deleteDoc(doc(db, COL.users, username))
    return { status: 'success', message: 'ลบผู้ใช้เรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function resetUserPassword(token: string, username: string, newPassword: string): Promise<ServiceResult> {
  try {
    const verify = await requireAdmin(token)
    if (verify.status !== 'success') return verify
    if (!newPassword || newPassword.length < 4) {
      return { status: 'error', message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }
    }
    if (!(await getDoc(doc(db, COL.users, username))).exists()) {
      return { status: 'error', message: 'ไม่พบผู้ใช้' }
    }
    await updateDoc(doc(db, COL.users, username), { password: await hashPassword(newPassword) })
    return { status: 'success', message: 'รีเซ็ตรหัสผ่านเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}
