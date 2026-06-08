// ฟังก์ชัน format/helper พอร์ตจาก index.html (เกือบ verbatim)
import type { Dispense, Fluid, OrderItem } from '../types'

export function formatThaiDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`
}

export function formatThaiDateTime(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return formatThaiDate(dateStr) + ' ' + date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export function formatPrice(value: number | string | null | undefined): string {
  if (value === '' || value === null || typeof value === 'undefined') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return number.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getFluidDisplayName(fluid?: Partial<Fluid>): string {
  return fluid?.labelName || fluid?.name || ''
}

export function getFluidOptionLabel(fluid?: Partial<Fluid>): string {
  return [fluid?.code, getFluidDisplayName(fluid), fluid?.conc].filter(Boolean).join(' • ')
}

export function splitOrderLines(value: unknown): string[] {
  return String(value || '')
    .split(/\n+/)
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

export function getOrderItems(order: Partial<Dispense> = {}): OrderItem[] {
  if (Array.isArray(order.items) && order.items.length) {
    return order.items
      .map((item) => ({
        fluidType: String(item.fluidType || '').trim(),
        quantity: String(item.quantity || '').trim(),
      }))
      .filter((item) => item.fluidType || item.quantity)
  }
  const fluidLines = splitOrderLines(order.fluidType)
  const quantityLines = splitOrderLines(order.quantity)
  const maxLength = Math.max(fluidLines.length, quantityLines.length)
  const items: OrderItem[] = []
  for (let i = 0; i < maxLength; i++) {
    if (!fluidLines[i] && !quantityLines[i]) continue
    items.push({ fluidType: fluidLines[i] || '', quantity: quantityLines[i] || '' })
  }
  return items.length ? items : [{ fluidType: '', quantity: '' }]
}

export function formatOrderItemsText(orderOrItems: OrderItem[] | Partial<Dispense> = []): string {
  const items = Array.isArray(orderOrItems) ? orderOrItems : getOrderItems(orderOrItems)
  return (items || [])
    .filter((item) => item.fluidType || item.quantity)
    .map((item) => `${item.fluidType || '-'} × ${item.quantity || '-'}`)
    .join(', ')
}

export function getOrderFluidNames(orderOrItems: OrderItem[] | Partial<Dispense> = []): string[] {
  const items = Array.isArray(orderOrItems) ? orderOrItems : getOrderItems(orderOrItems)
  return items.filter((item) => item.fluidType || item.quantity).map((item) => item.fluidType || '-')
}

export function formatNextAppointmentLabel(order: Partial<Dispense> = {}): string {
  if (!order.nextAppointment) return 'ยังไม่ได้ระบุวันนัดถัดไป'
  return `${formatThaiDate(order.nextAppointment)}${order.nextTime ? ` ${order.nextTime}` : ''}`
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function normalizeHN(value: unknown): string {
  return String(value ?? '').trim()
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'รอจ่าย',
  dispensed: 'จ่ายแล้ว',
  cancelled: 'ยกเลิก',
}
