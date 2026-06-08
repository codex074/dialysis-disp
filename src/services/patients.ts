// จัดการผู้ป่วย — พอร์ตจาก Code.gs
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db, COL } from '../firebase'
import { formatDate, normalizeHN } from './api'
import type { Patient, ServiceResult } from '../types'

function mapPatient(data: Record<string, unknown>): Patient {
  const status = String(data.status || 'active').toLowerCase()
  return {
    hn: normalizeHN(data.hn),
    name: String(data.name || ''),
    phone: String(data.phone || ''),
    treatmentRights: String(data.treatmentRights || ''),
    note: String(data.note || ''),
    registeredDate: data.registeredDate ? formatDate(data.registeredDate as string) : '',
    status: status === 'inactive' ? 'inactive' : 'active',
    inactiveNote: String(data.inactiveNote || ''),
  }
}

export async function getPatientsData(): Promise<Patient[]> {
  const snap = await getDocs(collection(db, COL.patients))
  return snap.docs
    .map((d) => mapPatient(d.data()))
    .filter((p) => p.hn)
    .sort((a, b) => a.hn.localeCompare(b.hn))
}

export async function getPatients(): Promise<ServiceResult<Patient[]>> {
  try {
    return { status: 'success', data: await getPatientsData() }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function addPatient(patient: Partial<Patient>): Promise<ServiceResult> {
  try {
    const hn = normalizeHN(patient.hn)
    if (!hn) return { status: 'error', message: 'กรุณากรอก HN' }
    if (patient.status === 'inactive' && !String(patient.inactiveNote || '').trim()) {
      return { status: 'error', message: 'กรุณาระบุหมายเหตุเมื่อปิดใช้งานผู้ป่วย' }
    }
    if ((await getDoc(doc(db, COL.patients, hn))).exists()) {
      return { status: 'error', message: 'HN นี้มีอยู่ในระบบแล้ว' }
    }
    const record: Patient = {
      hn,
      name: patient.name || '',
      phone: patient.phone || '',
      treatmentRights: patient.treatmentRights || '',
      note: patient.note || '',
      registeredDate: formatDate(new Date()),
      status: patient.status === 'inactive' ? 'inactive' : 'active',
      inactiveNote: patient.status === 'inactive' ? patient.inactiveNote || '' : '',
    }
    await setDoc(doc(db, COL.patients, hn), record)
    return { status: 'success', message: 'ลงทะเบียนผู้ป่วยเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function updatePatient(originalHn: string, patient: Partial<Patient>): Promise<ServiceResult> {
  try {
    const originalHN = normalizeHN(originalHn)
    const hn = normalizeHN(patient.hn)
    if (!originalHN) return { status: 'error', message: 'ไม่พบ HN เดิมของผู้ป่วย' }
    if (!hn) return { status: 'error', message: 'กรุณากรอก HN' }
    if (!patient.name) return { status: 'error', message: 'กรุณากรอกชื่อ-สกุล' }
    if (patient.status === 'inactive' && !String(patient.inactiveNote || '').trim()) {
      return { status: 'error', message: 'กรุณาระบุหมายเหตุเมื่อปิดใช้งานผู้ป่วย' }
    }
    const originalSnap = await getDoc(doc(db, COL.patients, originalHN))
    if (!originalSnap.exists()) return { status: 'error', message: 'ไม่พบผู้ป่วยที่ต้องการแก้ไข' }
    if (hn !== originalHN && (await getDoc(doc(db, COL.patients, hn))).exists()) {
      return { status: 'error', message: 'HN นี้มีอยู่ในระบบแล้ว' }
    }
    const prev = originalSnap.data() as Patient
    const record: Patient = {
      hn,
      name: patient.name || '',
      phone: patient.phone || '',
      treatmentRights: patient.treatmentRights || '',
      note: patient.note || '',
      registeredDate: prev.registeredDate || formatDate(new Date()),
      status: patient.status === 'inactive' ? 'inactive' : 'active',
      inactiveNote: patient.status === 'inactive' ? patient.inactiveNote || '' : '',
    }
    if (hn !== originalHN) {
      await deleteDoc(doc(db, COL.patients, originalHN))
    }
    await setDoc(doc(db, COL.patients, hn), record)
    await cascadePatientUpdate(originalHN, hn, record.name)
    return { status: 'success', message: 'อัปเดตข้อมูลผู้ป่วยเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

// อัปเดต HN/ชื่อ ในรายการจ่ายและนัด เมื่อข้อมูลผู้ป่วยเปลี่ยน (พอร์ตจาก cascadePatientUpdate_)
async function cascadePatientUpdate(originalHN: string, nextHN: string, nextName: string) {
  const batch = writeBatch(db)
  let count = 0
  const dispenseSnap = await getDocs(collection(db, COL.dispenses))
  dispenseSnap.docs.forEach((d) => {
    if (normalizeHN((d.data() as { hn?: string }).hn) === originalHN) {
      batch.update(d.ref, { hn: nextHN, name: nextName })
      count++
    }
  })
  const apptSnap = await getDocs(collection(db, COL.appointments))
  apptSnap.docs.forEach((d) => {
    if (normalizeHN((d.data() as { hn?: string }).hn) === originalHN) {
      batch.update(d.ref, { hn: nextHN, name: nextName })
      count++
    }
  })
  if (count) await batch.commit()
}

export async function deletePatient(hn: string): Promise<ServiceResult> {
  try {
    const normalizedHN = normalizeHN(hn)
    if (!(await getDoc(doc(db, COL.patients, normalizedHN))).exists()) {
      return { status: 'error', message: 'ไม่พบผู้ป่วย' }
    }
    await deleteDoc(doc(db, COL.patients, normalizedHN))
    return { status: 'success', message: 'ลบข้อมูลเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}
