// นำเข้าข้อมูลจาก CSV ที่ export จาก Google Sheet เดิม -> Firestore
import Papa from 'papaparse'
import { doc, writeBatch } from 'firebase/firestore'
import { db, COL } from '../firebase'
import { normalizeRole, summarizeItems } from './api'
import { splitOrderLines } from '../lib/format'
import type { OrderItem } from '../types'

export type ImportKind = 'users' | 'patients' | 'fluids' | 'appointments' | 'dispenses'

export const IMPORT_LABELS: Record<ImportKind, string> = {
  users: 'ผู้ใช้ (Users)',
  patients: 'ผู้ป่วย (Patients)',
  fluids: 'ชนิดน้ำยา (Fluids)',
  appointments: 'นัดหมาย (Appointments)',
  dispenses: 'รายการจ่าย (Dispenses)',
}

type Row = Record<string, string>

function pick(keys: Record<string, number>, aliases: string[], values: string[], fallbackIndex?: number): string {
  for (const alias of aliases) {
    const norm = alias.trim().toLowerCase().replace(/[\s-]+/g, '_')
    if (Object.prototype.hasOwnProperty.call(keys, norm)) return values[keys[norm]] ?? ''
  }
  if (typeof fallbackIndex === 'number') return values[fallbackIndex] ?? ''
  return ''
}

function buildKeyMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  headers.forEach((h, i) => {
    // ตัด BOM (U+FEFF) ที่ Google Sheets ใส่มาในหัวคอลัมน์แรกของไฟล์ CSV
    const norm = String(h || '').replace(/\uFEFF/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_')
    if (norm) map[norm] = i
  })
  return map
}

export interface Mapped {
  id: string
  data: Record<string, unknown>
}

function mapRow(kind: ImportKind, row: Row, headers: string[], keys: Record<string, number>): Mapped | null {
  const values = headers.map((h) => row[h] ?? '')
  const get = (aliases: string[], fallbackIndex?: number) => pick(keys, aliases, values, fallbackIndex)

  if (kind === 'users') {
    const username = get(['Username', 'ชื่อผู้ใช้'], 0).trim()
    if (!username) return null
    return {
      id: username,
      data: {
        username,
        password: get(['Password', 'รหัสผ่าน'], 1).trim(),
        name: get(['ชื่อ-สกุล', 'Name', 'ชื่อ'], 2),
        role: normalizeRole(get(['บทบาท', 'Role'], 3)),
        createdDate: get(['วันที่สร้าง', 'Created Date', 'Created_Date'], 4),
      },
    }
  }

  if (kind === 'patients') {
    const hn = get(['HN'], 0).trim()
    if (!hn) return null
    const status = (get(['สถานะ', 'Status'], 6) || 'active').trim().toLowerCase()
    return {
      id: hn,
      data: {
        hn,
        name: get(['ชื่อ-สกุล', 'Name'], 1),
        phone: get(['เบอร์โทร', 'Phone'], 2),
        treatmentRights: get(['สิทธิการรักษา', 'Treatment Rights'], 3),
        note: get(['หมายเหตุ', 'Note'], 4),
        registeredDate: get(['วันที่ลงทะเบียน', 'Registered Date'], 5),
        status: status === 'inactive' ? 'inactive' : 'active',
        inactiveNote: get(['หมายเหตุ Inactive', 'Inactive Note', 'เหตุผล Inactive'], 7),
      },
    }
  }

  if (kind === 'fluids') {
    const code = get(['Code', 'รหัสน้ำยา'], 0).trim()
    if (!code) return null
    const name = get(['Name', 'ชื่อน้ำยา'], 1).trim()
    const priceRaw = get(['Price', 'ราคา'], 5).trim()
    return {
      id: code,
      data: {
        code,
        name,
        labelName: get(['Label_Name', 'Label Name'], 2).trim() || name,
        ingredient: get(['Ingredient', 'ส่วนผสม', 'รายละเอียด'], 3).trim(),
        conc: get(['Conc', 'Concentration', 'ความเข้มข้น'], 4).trim(),
        price: priceRaw === '' ? '' : Number(priceRaw.replace(/,/g, '')),
        addedDate: get(['Added_Date', 'วันที่เพิ่ม'], 6),
      },
    }
  }

  if (kind === 'appointments') {
    const id = get(['รหัสนัด', 'id', 'Appointment ID'], 0).trim()
    if (!id) return null
    return {
      id,
      data: {
        id,
        hn: get(['HN'], 1).trim(),
        name: get(['ชื่อ-สกุล', 'Name'], 2),
        date: get(['วันที่นัด', 'Date'], 3),
        time: get(['เวลา', 'Time'], 4),
        status: get(['สถานะ', 'Status'], 5) || 'pending',
        note: get(['หมายเหตุ', 'Note'], 6),
        dispenseId: get(['รหัสรายการจ่าย', 'Dispense ID', 'dispenseId'], 7),
      },
    }
  }

  // dispenses — แปลง string น้ำยา/จำนวน (มี prefix "1. ...") เป็น array
  const id = get(['รหัสรายการ', 'id', 'Order ID'], 0).trim()
  if (!id) return null
  const fluidStr = get(['ชนิดน้ำยา', 'Fluid Type'], 4)
  const qtyStr = get(['จำนวน', 'Quantity'], 5)
  const fluidLines = splitOrderLines(fluidStr)
  const qtyLines = splitOrderLines(qtyStr)
  const maxLen = Math.max(fluidLines.length, qtyLines.length)
  const items: OrderItem[] = []
  for (let i = 0; i < maxLen; i++) {
    if (!fluidLines[i] && !qtyLines[i]) continue
    items.push({ fluidType: fluidLines[i] || '', quantity: qtyLines[i] || '' })
  }
  if (!items.length && (fluidStr.trim() || qtyStr.trim())) {
    items.push({ fluidType: fluidStr.trim(), quantity: qtyStr.trim() })
  }
  // เก็บ summary ไว้ใน item array เท่านั้น (mapDispense จะ derive string ตอนแสดงผล)
  void summarizeItems
  return {
    id,
    data: {
      id,
      orderDate: get(['วันที่สั่ง', 'Order Date'], 1),
      hn: get(['HN'], 2).trim(),
      name: get(['ชื่อ-สกุล', 'Name'], 3),
      items,
      orderedBy: get(['ผู้สั่งจ่าย', 'Ordered By'], 6),
      note: get(['หมายเหตุ', 'Note'], 7),
      status: (get(['สถานะ', 'Status'], 8) || 'pending').trim().toLowerCase(),
      dispensedDate: get(['วันที่จ่ายจริง', 'Dispensed Date'], 9),
      dispensedBy: get(['ผู้จ่าย', 'Dispensed By'], 10),
      nextAppointment: get(['วันนัดครั้งต่อไป', 'Next Appointment'], 11),
      nextTime: get(['เวลานัด', 'Next Time'], 12),
    },
  }
}

export interface ImportResult {
  status: 'success' | 'error'
  message: string
  count: number
}

// แปลง CSV เป็นเอกสารที่จะเขียน — แบบ dry-run (ไม่แตะ Firestore) ใช้สำหรับพรีวิว/ทดสอบ
export function parseCsv(kind: ImportKind, csvText: string): { mapped: Mapped[]; headers: string[] } {
  const parsed = Papa.parse<Row>(csvText.trim(), { header: true, skipEmptyLines: true })
  const headers = (parsed.meta.fields || []) as string[]
  if (!headers.length) return { mapped: [], headers: [] }
  const keys = buildKeyMap(headers)
  const mapped = parsed.data.map((row) => mapRow(kind, row, headers, keys)).filter((m): m is Mapped => m !== null)
  return { mapped, headers }
}

export async function importCsv(kind: ImportKind, csvText: string): Promise<ImportResult> {
  try {
    const { headers, mapped } = parseCsv(kind, csvText)
    if (!headers.length) return { status: 'error', message: 'ไม่พบหัวตารางใน CSV', count: 0 }
    if (!mapped.length) return { status: 'error', message: 'ไม่พบข้อมูลที่นำเข้าได้ (ตรวจสอบหัวตาราง)', count: 0 }
    const collectionName = COL[kind]

    // เขียนเป็น batch (สูงสุด 450 ต่อ batch)
    const chunkSize = 450
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const batch = writeBatch(db)
      for (const m of mapped.slice(i, i + chunkSize)) {
        batch.set(doc(db, collectionName, m.id), m.data, { merge: true })
      }
      await batch.commit()
    }
    return { status: 'success', message: `นำเข้า ${IMPORT_LABELS[kind]} สำเร็จ ${mapped.length} รายการ`, count: mapped.length }
  } catch (err) {
    return { status: 'error', message: String(err), count: 0 }
  }
}
