// ป้ายสถานะต่าง ๆ (พอร์ตจาก index.html)
import type { Patient } from '../types'
import { isPatientInactive } from '../lib/dashboard'

export function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') return <span className="status-pending px-2 py-0.5 rounded-md text-xs font-medium">⏰ รอจ่าย</span>
  if (status === 'dispensed') return <span className="status-dispensed px-2 py-0.5 rounded-md text-xs font-medium">✓ จ่ายแล้ว</span>
  return <span className="status-cancelled px-2 py-0.5 rounded-md text-xs font-medium">✗ ยกเลิก</span>
}

export function PatientStatusBadge({ patient }: { patient: Patient }) {
  if (isPatientInactive(patient)) {
    return <span className="text-[11px] px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">Inactive</span>
  }
  return <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">Active</span>
}

export function AppointmentBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil === 0) return <span className="status-urgent px-2 py-0.5 rounded-md text-xs font-medium">วันนี้</span>
  if (daysUntil < 0) return <span className="status-cancelled px-2 py-0.5 rounded-md text-xs font-medium">เลยนัด</span>
  if (daysUntil <= 3) return <span className="status-today px-2 py-0.5 rounded-md text-xs font-medium">อีก {daysUntil} วัน</span>
  return <span className="status-pending px-2 py-0.5 rounded-md text-xs font-medium">อีก {daysUntil} วัน</span>
}
