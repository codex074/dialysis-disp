// helper ที่ใช้ร่วมกันในชั้น service (เลียนแบบพฤติกรรมใน Code.gs)
import type { DispenseStatus, OrderItem, Role } from '../types'

export const STATUS_PENDING: DispenseStatus = 'pending'
export const STATUS_DISPENSED: DispenseStatus = 'dispensed'
export const STATUS_CANCELLED: DispenseStatus = 'cancelled'

export function normalizeHN(hn: unknown): string {
  return String(hn ?? '').trim()
}

export function normalizeRole(role: unknown): Role {
  const normalized = String(role ?? '').toLowerCase()
  if (normalized === 'admin') return 'admin'
  if (normalized === 'nurse') return 'nurse'
  return 'pharmacist'
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 'yyyy-MM-dd HH:mm' จากเวลาท้องถิ่น (เลียนแบบ formatDate_ ของ GAS)
export function formatDateTime(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 'yyyy-MM-dd'
export function formatDate(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function nowDateTime(): string {
  return formatDateTime(new Date())
}

// ----- token (ฝั่ง client เท่านั้น ไม่ใช้ Firebase Auth) -----
export function encodeToken(username: string): string {
  return btoa(unescape(encodeURIComponent(`${username}:${Date.now()}`)))
}

export function decodeToken(token: string): { username: string; timestamp: number } | null {
  try {
    const decoded = decodeURIComponent(escape(atob(token)))
    const sep = decoded.lastIndexOf(':')
    if (sep === -1) return null
    const username = decoded.substring(0, sep)
    const timestamp = Number(decoded.substring(sep + 1))
    if (!username || !Number.isFinite(timestamp)) return null
    return { username, timestamp }
  } catch {
    return null
  }
}

// แปลง items (array) -> สรุปข้อความตามรูปแบบเดิม
export function summarizeItems(items: OrderItem[]): { fluidType: string; quantity: string } {
  const multi = items.length > 1
  return {
    fluidType: items.map((it, i) => (multi ? `${i + 1}. ${it.fluidType}` : `${it.fluidType}`)).join('\n'),
    quantity: items.map((it, i) => (multi ? `${i + 1}. ${it.quantity}` : `${it.quantity}`)).join('\n'),
  }
}

// ตรวจ/normalize รายการน้ำยา (พอร์ตจาก normalizeOrderItems_)
export function normalizeOrderItems(
  rawItems: OrderItem[],
): { status: 'success'; items: OrderItem[] } | { status: 'error'; message: string } {
  const items = (rawItems || [])
    .map((item) => ({ fluidType: String(item?.fluidType || '').trim(), quantity: Number(item?.quantity) }))
    .filter((item) => item.fluidType || item.quantity)
  if (!items.length) return { status: 'error', message: 'กรุณาเพิ่มรายการน้ำยาอย่างน้อย 1 รายการ' }
  for (const item of items) {
    if (!item.fluidType) return { status: 'error', message: 'กรุณาเลือกชนิดน้ำยาให้ครบทุกรายการ' }
    if (!item.quantity || item.quantity < 1) return { status: 'error', message: 'กรุณาระบุจำนวนน้ำยาให้ถูกต้องทุกรายการ' }
  }
  return { status: 'success', items }
}

export function appendRemark(currentValue: string, prefix: string, text: string): string {
  const trimmed = String(text || '').trim()
  if (!trimmed) return currentValue || ''
  const next = prefix ? prefix + trimmed : trimmed
  return currentValue ? currentValue + '\n' + next : next
}
