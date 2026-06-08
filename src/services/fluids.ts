// จัดการชนิดน้ำยา — พอร์ตจาก Code.gs
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db, COL } from '../firebase'
import { formatDate } from './api'
import type { Fluid, ServiceResult } from '../types'

function mapFluid(data: Record<string, unknown>): Fluid {
  const priceRaw = data.price
  return {
    code: String(data.code || '').trim(),
    name: String(data.name || '').trim(),
    labelName: String(data.labelName || data.name || '').trim(),
    ingredient: String(data.ingredient || '').trim(),
    conc: String(data.conc || '').trim(),
    price: priceRaw === '' || priceRaw === null || typeof priceRaw === 'undefined' ? '' : Number(priceRaw),
    addedDate: data.addedDate ? formatDate(data.addedDate as string) : '',
  }
}

export async function getFluidsData(): Promise<Fluid[]> {
  const snap = await getDocs(collection(db, COL.fluids))
  return snap.docs
    .map((d) => mapFluid(d.data()))
    .filter((f) => f.code)
    .sort((a, b) => a.code.localeCompare(b.code))
}

export async function getFluids(): Promise<ServiceResult<Fluid[]>> {
  try {
    return { status: 'success', data: await getFluidsData() }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function addFluid(fluid: Partial<Fluid>): Promise<ServiceResult> {
  try {
    const code = String(fluid.code || '').trim()
    const priceRaw = fluid.price
    const price = priceRaw === '' || priceRaw === null || typeof priceRaw === 'undefined' ? '' : Number(priceRaw)
    if (!code) return { status: 'error', message: 'กรุณากรอกรหัสน้ำยา' }
    if (!String(fluid.name || '').trim()) return { status: 'error', message: 'กรุณากรอกชื่อเต็มของผลิตภัณฑ์' }
    if (!String(fluid.labelName || '').trim()) return { status: 'error', message: 'กรุณากรอกชื่อสำหรับแสดงผล' }
    if (price !== '' && isNaN(price as number)) return { status: 'error', message: 'กรุณากรอกราคาเป็นตัวเลข' }
    if ((await getDoc(doc(db, COL.fluids, code))).exists()) {
      return { status: 'error', message: 'รหัสน้ำยานี้มีอยู่แล้ว' }
    }
    const record: Fluid = {
      code,
      name: String(fluid.name || '').trim(),
      labelName: String(fluid.labelName || '').trim(),
      ingredient: String(fluid.ingredient || '').trim(),
      conc: String(fluid.conc || '').trim(),
      price,
      addedDate: formatDate(new Date()),
    }
    await setDoc(doc(db, COL.fluids, code), record)
    return { status: 'success', message: 'เพิ่มชนิดน้ำยาเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}

export async function deleteFluid(code: string): Promise<ServiceResult> {
  try {
    if (!(await getDoc(doc(db, COL.fluids, code))).exists()) {
      return { status: 'error', message: 'ไม่พบน้ำยา' }
    }
    await deleteDoc(doc(db, COL.fluids, code))
    return { status: 'success', message: 'ลบข้อมูลเรียบร้อย' }
  } catch (err) {
    return { status: 'error', message: String(err) }
  }
}
