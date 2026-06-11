// จัดการใบสั่งจ่าย + นัดหมาย + ประวัติ — พอร์ตจาก Code.gs
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db, COL } from '../firebase'
import {
  appendRemark,
  formatDate,
  formatDateTime,
  normalizeHN,
  normalizeOrderItems,
  nowDateTime,
  STATUS_CANCELLED,
  STATUS_DISPENSED,
  STATUS_PENDING,
} from './api'
import type { Appointment, Dispense, OrderItem, ServiceResult, User } from '../types'

interface DispenseDoc {
  id: string
  orderDate: string
  hn: string
  name: string
  items: OrderItem[]
  orderedBy: string
  note: string
  status: string
  dispensedDate: string
  dispensedBy: string
  nextAppointment: string
  nextTime: string
}

function mapDispense(data: Partial<DispenseDoc>): Dispense {
  const items = Array.isArray(data.items) ? data.items : []
  const multi = items.length > 1
  const fluidType = items.map((it, i) => (multi ? `${i + 1}. ${it.fluidType}` : `${it.fluidType}`)).join('\n')
  const quantity = items.map((it, i) => (multi ? `${i + 1}. ${it.quantity}` : `${it.quantity}`)).join('\n')
  const orderDate = data.orderDate || ''
  const dispensedDate = data.dispensedDate || ''
  return {
    id: data.id || '',
    orderDate,
    orderDateOnly: orderDate ? orderDate.split(' ')[0] : '',
    hn: normalizeHN(data.hn),
    name: data.name || '',
    fluidType,
    quantity,
    items,
    orderedBy: data.orderedBy || '',
    nurse: data.orderedBy || '',
    note: data.note || '',
    nurseNote: data.note || '',
    status: (data.status as Dispense['status']) || STATUS_PENDING,
    dispensedDate,
    dispenseDate: dispensedDate,
    dispenseDateOnly: dispensedDate ? dispensedDate.split(' ')[0] : '',
    dispensedBy: data.dispensedBy || '',
    dispenser: data.dispensedBy || '',
    nextAppointment: data.nextAppointment || '',
    nextTime: data.nextTime || '',
  }
}

export async function getAllDispenseData(): Promise<Dispense[]> {
  const snap = await getDocs(collection(db, COL.dispenses))
  return snap.docs
    .map((d) => mapDispense(d.data() as DispenseDoc))
    .filter((d) => d.id)
    .sort((a, b) => String(a.orderDate).localeCompare(String(b.orderDate)))
}

export async function getAllDispenses(): Promise<ServiceResult<Dispense[]>> {
  try {
    const data = await getAllDispenseData()
    return { status: 'success', data: data.reverse() }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function getPendingDispenses(): Promise<ServiceResult<Dispense[]>> {
  const all = await getAllDispenses()
  if (all.status !== 'success') return all
  return { status: 'success', data: (all.data || []).filter((d) => d.status === STATUS_PENDING) }
}

export async function getPatientHistory(hn: string): Promise<ServiceResult<Dispense[]>> {
  try {
    const data = await getAllDispenseData()
    const history = data.filter((d) => d.hn === normalizeHN(hn))
    return { status: 'success', data: history.reverse() }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

// ----- appointments -----
function mapAppointment(data: Record<string, unknown>): Appointment {
  return {
    id: String(data.id || ''),
    hn: normalizeHN(data.hn),
    name: String(data.name || ''),
    date: data.date ? formatDate(data.date as string) : '',
    time: String(data.time || ''),
    status: String(data.status || 'pending'),
    note: String(data.note || ''),
    dispenseId: String(data.dispenseId || ''),
  }
}

export async function getAppointmentsData(): Promise<Appointment[]> {
  const snap = await getDocs(collection(db, COL.appointments))
  return snap.docs.map((d) => mapAppointment(d.data())).filter((a) => a.id)
}

export async function getAppointments(): Promise<ServiceResult<Appointment[]>> {
  try {
    return { status: 'success', data: await getAppointmentsData() }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

async function updateAppointmentStatusByDispense(dispenseId: string, status: string) {
  const q = query(collection(db, COL.appointments), where('dispenseId', '==', dispenseId))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { status })))
}

// พอร์ตจาก syncAppointmentForDispense_
async function syncAppointmentForDispense(dispenseId: string, order: Partial<Dispense>) {
  const q = query(collection(db, COL.appointments), where('dispenseId', '==', dispenseId))
  const snap = await getDocs(q)
  if (!order.nextAppointment) {
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
    return
  }
  const values = {
    hn: normalizeHN(order.hn),
    name: order.name || '',
    date: formatDate(order.nextAppointment),
    time: order.nextTime || '09:00',
    status: 'pending',
    note: 'นัดรับน้ำยาครั้งต่อไป',
    dispenseId,
  }
  if (snap.docs.length) {
    await Promise.all(snap.docs.map((d) => updateDoc(d.ref, values)))
    return
  }
  const id = 'A' + Date.now()
  await setDoc(doc(db, COL.appointments, id), { id, ...values })
}

// ----- orders -----
export async function createDispenseOrder(order: Partial<Dispense>): Promise<ServiceResult & { id?: string }> {
  try {
    const normalized = normalizeOrderItems(order.items || [])
    if (normalized.status !== 'success') return normalized
    const id = 'D' + Date.now()
    const hn = normalizeHN(order.hn)
    const record: DispenseDoc = {
      id,
      orderDate: nowDateTime(),
      hn,
      name: order.name || '',
      items: normalized.items,
      orderedBy: order.orderedBy || 'ห้องตรวจ',
      note: order.note || '',
      status: STATUS_PENDING,
      dispensedDate: '',
      dispensedBy: '',
      nextAppointment: order.nextAppointment ? formatDate(order.nextAppointment) : '',
      nextTime: order.nextAppointment ? order.nextTime || '09:00' : '',
    }
    await setDoc(doc(db, COL.dispenses, id), record)
    if (record.nextAppointment) {
      const apptId = 'A' + Date.now()
      await setDoc(doc(db, COL.appointments, apptId), {
        id: apptId,
        hn,
        name: record.name,
        date: record.nextAppointment,
        time: record.nextTime,
        status: 'pending',
        note: 'นัดรับน้ำยาครั้งต่อไป',
        dispenseId: id,
      })
    }
    return { status: 'success', message: 'สั่งจ่ายเรียบร้อย รอห้องจ่ายยาดำเนินการ', id }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function updateOrder(orderId: string, order: Partial<Dispense>): Promise<ServiceResult> {
  try {
    const ref = doc(db, COL.dispenses, orderId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return { status: 'error', message: 'ไม่พบรายการที่ต้องการแก้ไข' }
    const current = snap.data() as DispenseDoc
    const status = current.status || STATUS_PENDING
    if (status === STATUS_DISPENSED) return { status: 'error', message: 'ไม่สามารถแก้ไขรายการที่จ่ายไปแล้ว' }
    if (status === STATUS_CANCELLED) return { status: 'error', message: 'ไม่สามารถแก้ไขรายการที่ถูกยกเลิกแล้ว' }
    const normalized = normalizeOrderItems(order.items || [])
    if (normalized.status !== 'success') return normalized
    await updateDoc(ref, {
      hn: normalizeHN(order.hn),
      name: order.name || '',
      items: normalized.items,
      orderedBy: order.orderedBy || order.nurse || '',
      note: order.note || '',
      nextAppointment: order.nextAppointment ? formatDate(order.nextAppointment) : '',
      nextTime: order.nextAppointment ? order.nextTime || '09:00' : '',
    })
    await syncAppointmentForDispense(orderId, {
      ...order,
      nextAppointment: order.nextAppointment ? formatDate(order.nextAppointment) : '',
    })
    return { status: 'success', message: 'อัปเดตคำสั่งจ่ายเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function confirmDispense(id: string, user: User, note?: string, items?: OrderItem[]): Promise<ServiceResult & { dispensedBy?: string }> {
  try {
    const ref = doc(db, COL.dispenses, id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return { status: 'error', message: 'ไม่พบรายการ' }
    const current = snap.data() as DispenseDoc
    if (current.status === STATUS_DISPENSED) return { status: 'error', message: 'รายการนี้จ่ายไปแล้ว' }
    if (current.status === STATUS_CANCELLED) return { status: 'error', message: 'รายการนี้ถูกยกเลิก' }
    const update: Partial<DispenseDoc> = {
      status: STATUS_DISPENSED,
      dispensedDate: nowDateTime(),
      dispensedBy: user.name,
    }
    // ถ้ามีการแก้ไขรายการน้ำยา/จำนวนตอนยืนยันจ่าย ให้บันทึกรายการที่แก้แล้ว
    if (items) {
      const normalized = normalizeOrderItems(items)
      if (normalized.status !== 'success') return normalized
      update.items = normalized.items
    }
    if (String(note || '').trim()) update.note = appendRemark(current.note, 'เภสัช: ', note || '')
    await updateDoc(ref, update)
    await updateAppointmentStatusByDispense(id, 'completed')
    return { status: 'success', message: 'บันทึกการจ่ายเรียบร้อย', dispensedBy: user.name }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function cancelDispenseOrder(id: string, reason?: string): Promise<ServiceResult> {
  try {
    const ref = doc(db, COL.dispenses, id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return { status: 'error', message: 'ไม่พบรายการ' }
    const current = snap.data() as DispenseDoc
    if (current.status === STATUS_DISPENSED) return { status: 'error', message: 'ไม่สามารถยกเลิกรายการที่จ่ายไปแล้ว' }
    const update: Partial<DispenseDoc> = { status: STATUS_CANCELLED }
    if (String(reason || '').trim()) update.note = appendRemark(current.note, 'ยกเลิก: ', reason || '')
    await updateDoc(ref, update)
    await updateAppointmentStatusByDispense(id, 'cancelled')
    return { status: 'success', message: 'ยกเลิกรายการเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function deleteDispense(id: string): Promise<ServiceResult> {
  try {
    const ref = doc(db, COL.dispenses, id)
    if (!(await getDoc(ref)).exists()) return { status: 'error', message: 'ไม่พบรายการ' }
    await deleteDoc(ref)
    const q = query(collection(db, COL.appointments), where('dispenseId', '==', id))
    const snap = await getDocs(q)
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
    return { status: 'success', message: 'ลบรายการเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

// ใช้ภายในตอน format วันที่ของ doc (เผื่อบาง path ต้องการ)
export { formatDateTime }
