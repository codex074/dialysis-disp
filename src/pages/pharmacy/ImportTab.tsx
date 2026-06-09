// แท็บนำเข้าข้อมูลจาก CSV (admin) — อัปโหลดไฟล์ CSV ที่ export จาก Google Sheet เดิม
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { importCsv, parseCsv, IMPORT_LABELS, type ImportKind } from '../../services/importCsv'
import { Swal } from '../../lib/swal'

const KINDS: ImportKind[] = ['users', 'patients', 'fluids', 'appointments', 'dispenses']

const COLUMN_HINTS: Record<ImportKind, string> = {
  users: 'Username, Password, ชื่อ-สกุล, บทบาท, วันที่สร้าง',
  patients: 'HN, ชื่อ-สกุล, เบอร์โทร, สิทธิการรักษา, หมายเหตุ, วันที่ลงทะเบียน, สถานะ, หมายเหตุ Inactive',
  fluids: 'Code, Name, Label_Name, Ingredient, Conc, Price, Added_Date',
  appointments: 'รหัสนัด, HN, ชื่อ-สกุล, วันที่นัด, เวลา, สถานะ, หมายเหตุ, รหัสรายการจ่าย',
  dispenses: 'รหัสรายการ, วันที่สั่ง, HN, ชื่อ-สกุล, ชนิดน้ำยา, จำนวน, ผู้สั่งจ่าย, หมายเหตุ, สถานะ, วันที่จ่ายจริง, ผู้จ่าย, วันนัดครั้งต่อไป',
}

type SlotStatus = 'idle' | 'ready' | 'importing' | 'success' | 'error'

interface Slot {
  text: string
  fileName: string
  status: SlotStatus
  message: string
  count: number
}

const emptySlot = (): Slot => ({ text: '', fileName: '', status: 'idle', message: '', count: 0 })

export default function ImportTab() {
  const { refresh } = useData()
  const [slots, setSlots] = useState<Record<ImportKind, Slot>>(() =>
    Object.fromEntries(KINDS.map((k) => [k, emptySlot()])) as Record<ImportKind, Slot>,
  )
  const [running, setRunning] = useState(false)

  function updateSlot(kind: ImportKind, patch: Partial<Slot>) {
    setSlots((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }))
  }

  function handleFile(kind: ImportKind, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      try {
        const { mapped } = parseCsv(kind, text)
        updateSlot(kind, {
          text,
          fileName: file.name,
          status: mapped.length > 0 ? 'ready' : 'error',
          message: mapped.length > 0 ? `พร้อมนำเข้า ${mapped.length} รายการ` : 'แมปหัวตารางไม่ได้',
          count: mapped.length,
        })
      } catch {
        updateSlot(kind, { text, fileName: file.name, status: 'error', message: 'ไฟล์ไม่ถูกต้อง', count: 0 })
      }
    }
    reader.readAsText(file, 'UTF-8')
    // reset input เพื่อให้เลือกไฟล์เดิมซ้ำได้
    e.target.value = ''
  }

  function clearSlot(kind: ImportKind) {
    setSlots((prev) => ({ ...prev, [kind]: emptySlot() }))
  }

  const readyKinds = KINDS.filter((k) => slots[k].status === 'ready')

  async function runAll() {
    if (!readyKinds.length) return
    const confirm = await Swal.fire({
      title: 'นำเข้าข้อมูลทั้งหมด?',
      html: readyKinds.map((k) => `• ${IMPORT_LABELS[k]} (${slots[k].count} รายการ)`).join('<br/>'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'นำเข้า',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0891b2',
    })
    if (!confirm.isConfirmed) return

    setRunning(true)
    let hasError = false

    // รันตามลำดับที่กำหนด (KINDS) เพื่อให้ FK ถูกต้อง
    for (const kind of KINDS) {
      if (slots[kind].status !== 'ready') continue
      updateSlot(kind, { status: 'importing', message: 'กำลังนำเข้า…' })
      const res = await importCsv(kind, slots[kind].text)
      if (res.status === 'success') {
        updateSlot(kind, { status: 'success', message: res.message ?? 'สำเร็จ' })
      } else {
        updateSlot(kind, { status: 'error', message: res.message ?? 'ผิดพลาด' })
        hasError = true
      }
    }

    setRunning(false)
    await refresh()

    Swal.fire({
      icon: hasError ? 'warning' : 'success',
      title: hasError ? 'นำเข้าบางรายการไม่สำเร็จ' : 'นำเข้าสำเร็จทั้งหมด',
      text: hasError ? 'ตรวจสอบรายการที่แสดงสัญลักษณ์ ❌' : 'ข้อมูลทุกชนิดถูกนำเข้าเรียบร้อยแล้ว',
      confirmButtonColor: '#0891b2',
    })
  }

  const statusIcon: Record<SlotStatus, string> = {
    idle: '○',
    ready: '✓',
    importing: '⏳',
    success: '✅',
    error: '❌',
  }

  const statusColor: Record<SlotStatus, string> = {
    idle: 'text-slate-400',
    ready: 'text-emerald-600',
    importing: 'text-amber-500',
    success: 'text-emerald-600',
    error: 'text-rose-600',
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <h3 className="text-slate-800 font-semibold">นำเข้าข้อมูลจาก Google Sheet (CSV)</h3>
        <p className="text-xs text-slate-500 mt-1">
          อัปโหลดไฟล์ CSV ได้ทีละชนิดหรือทั้งหมดพร้อมกัน — ระบบจะนำเข้าตามลำดับที่ถูกต้องให้อัตโนมัติ
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ลำดับการนำเข้า: <b>Users → Patients → Fluids → Appointments → Dispenses</b> (ระบบจัดให้อัตโนมัติ)
        </div>

        {/* slot ทีละชนิด */}
        <div className="space-y-3">
          {KINDS.map((kind, idx) => {
            const slot = slots[kind]
            return (
              <div key={kind} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex items-start gap-3">
                  <span className="text-slate-400 text-sm font-mono w-5 shrink-0 pt-0.5">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 text-sm">{IMPORT_LABELS[kind]}</span>
                      {slot.status !== 'idle' && (
                        <span className={`text-xs font-medium ${statusColor[slot.status]}`}>
                          {statusIcon[slot.status]} {slot.message}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">{COLUMN_HINTS[kind]}</p>
                    {slot.fileName && (
                      <p className="text-xs text-slate-500 mt-1">📎 {slot.fileName}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg font-medium ${slot.status === 'importing' || running ? 'bg-slate-200 text-slate-400 pointer-events-none' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                      {slot.status === 'ready' || slot.status === 'success' ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        disabled={running}
                        onChange={(e) => handleFile(kind, e)}
                      />
                    </label>
                    {slot.status !== 'idle' && !running && (
                      <button
                        onClick={() => clearSlot(kind)}
                        className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                        title="ล้าง"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ปุ่มหลัก */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={runAll}
            disabled={running || readyKinds.length === 0}
            className="btn-success px-6 py-3 rounded-lg font-medium shadow-md disabled:opacity-50"
          >
            {running
              ? 'กำลังนำเข้า…'
              : readyKinds.length > 0
              ? `นำเข้าทั้งหมด (${readyKinds.length} ชนิด)`
              : 'เลือกไฟล์ CSV ก่อน'}
          </button>
          {!running && readyKinds.length > 0 && (
            <button
              onClick={() => setSlots(Object.fromEntries(KINDS.map((k) => [k, emptySlot()])) as Record<ImportKind, Slot>)}
              className="px-6 py-3 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
