// helper เกี่ยวกับคำสั่งจ่าย/คิวนัด (พอร์ตจาก index.html)
import type { Appointment, Dispense, Patient } from '../types'
import { getDaysUntil, normalizeHN } from './format'
import { isPatientInactive } from './dashboard'

export function getPatientOrders(orders: Dispense[], hn: string): Dispense[] {
  const normalizedHN = normalizeHN(hn)
  return orders
    .filter((order) => normalizeHN(order.hn) === normalizedHN)
    .sort((a, b) => String(b.orderDate || '').localeCompare(String(a.orderDate || '')))
}

export function getLatestReusableOrder(orders: Dispense[], hn: string, preferredDispenseId = ''): Dispense | null {
  const list = getPatientOrders(orders, hn)
  if (!list.length) return null
  if (preferredDispenseId) {
    const preferred = list.find((o) => o.id === preferredDispenseId)
    if (preferred) return preferred
  }
  return list.find((o) => o.status === 'dispensed') || list.find((o) => o.status === 'pending') || list[0]
}

export interface QueueItem extends Appointment {
  patient: Patient
  daysUntil: number
  latestOrder: Dispense | null
}

export function buildNurseAppointmentQueue(
  appointments: Appointment[],
  patients: Patient[],
  orders: Dispense[],
): { today: QueueItem[]; upcoming: QueueItem[] } {
  const queue = appointments
    .filter((a) => !['completed', 'cancelled', 'dispensed'].includes(String(a.status || '').toLowerCase()))
    .map((a) => {
      const patient =
        patients.find((p) => normalizeHN(p.hn) === normalizeHN(a.hn)) ||
        ({ hn: a.hn, name: a.name, phone: '', treatmentRights: '', note: '', registeredDate: '', status: 'active', inactiveNote: '' } as Patient)
      return { ...a, patient, daysUntil: getDaysUntil(a.date), latestOrder: getLatestReusableOrder(orders, a.hn, a.dispenseId) }
    })
    .filter((a) => !isPatientInactive(a.patient))
    .filter((a) => typeof a.daysUntil === 'number' && a.daysUntil >= 0)
    .sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''))
      if (dateCompare !== 0) return dateCompare
      return String(a.time || '').localeCompare(String(b.time || ''))
    })
  return {
    today: queue.filter((item) => item.daysUntil === 0),
    upcoming: queue.filter((item) => item.daysUntil > 0 && item.daysUntil <= 7),
  }
}
