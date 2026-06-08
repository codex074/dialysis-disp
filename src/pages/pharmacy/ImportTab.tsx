// แท็บนำเข้าข้อมูลจาก CSV (admin) — อัปโหลดไฟล์ CSV ที่ export จาก Google Sheet เดิม
import { useMemo, useState } from 'react'
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

export default function ImportTab() {
  const { refresh } = useData()
  const [kind, setKind] = useState<ImportKind>('users')
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  // พรีวิวแบบ dry-run (ไม่เขียน Firestore) เพื่อให้ตรวจหัวตาราง/การแมปก่อนนำเข้า
  const preview = useMemo(() => {
    if (!csvText.trim()) return null
    try {
      return parseCsv(kind, csvText)
    } catch {
      return null
    }
  }, [kind, csvText])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result || ''))
    reader.readAsText(file, 'UTF-8')
  }

  async function runImport() {
    if (!csvText.trim()) {
      Swal.fire({ icon: 'warning', title: 'ยังไม่มีข้อมูล', text: 'กรุณาอัปโหลดไฟล์ CSV หรือวางข้อความ CSV ก่อน', confirmButtonColor: '#0891b2' })
      return
    }
    const confirm = await Swal.fire({
      title: `นำเข้า ${IMPORT_LABELS[kind]}?`,
      text: 'ระบบจะเขียนทับเอกสารที่มี id ซ้ำกัน (merge) ลงใน Firestore',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'นำเข้า',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0891b2',
    })
    if (!confirm.isConfirmed) return
    setImporting(true)
    const res = await importCsv(kind, csvText)
    setImporting(false)
    setLastResult(res.message)
    if (res.status === 'success') {
      Swal.fire({ icon: 'success', title: 'นำเข้าสำเร็จ', text: res.message, confirmButtonColor: '#0891b2' })
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'นำเข้าไม่สำเร็จ', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <h3 className="text-slate-800 font-semibold">นำเข้าข้อมูลจาก Google Sheet (CSV)</h3>
        <p className="text-xs text-slate-500 mt-1">Export แต่ละชีตจาก Google Sheets เป็น CSV (ไฟล์ → ดาวน์โหลด → CSV) แล้วอัปโหลดทีละชนิด</p>
      </div>
      <div className="p-5 space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          แนะนำลำดับการนำเข้า: <b>Users → Patients → Fluids → Appointments → Dispenses</b> และตรวจสอบว่าหัวตาราง (แถวแรก) ตรงกับชีตเดิม
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชนิดข้อมูล</label>
            <select value={kind} onChange={(e) => { setKind(e.target.value as ImportKind); setLastResult(null) }} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
              {KINDS.map((k) => <option key={k} value={k}>{IMPORT_LABELS[k]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ไฟล์ CSV</label>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200" />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          คอลัมน์ที่รองรับสำหรับ <b>{IMPORT_LABELS[kind]}</b>:
          <div className="mt-1 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-words">{COLUMN_HINTS[kind]}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">หรือวางข้อความ CSV {fileName && <span className="text-slate-400">({fileName})</span>}</label>
          <textarea rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="วางเนื้อหา CSV ที่นี่ (แถวแรกเป็นหัวตาราง)" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs" />
        </div>

        {preview && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm">
            {preview.mapped.length === 0 ? (
              <p className="text-rose-600">⚠️ แมปข้อมูลไม่ได้ — ตรวจสอบว่าหัวตาราง (แถวแรก) ตรงกับชนิด "{IMPORT_LABELS[kind]}"</p>
            ) : (
              <p className="text-emerald-700">
                ✓ พร้อมนำเข้า <b>{preview.mapped.length}</b> รายการ — ตัวอย่าง id:{' '}
                <span className="font-mono text-xs">{preview.mapped.slice(0, 5).map((m) => m.id).join(', ')}{preview.mapped.length > 5 ? ' …' : ''}</span>
              </p>
            )}
          </div>
        )}

        {lastResult && <p className="text-sm text-slate-600">ผลล่าสุด: {lastResult}</p>}

        <div className="flex gap-3">
          <button onClick={runImport} disabled={importing} className="btn-success px-6 py-3 rounded-lg font-medium shadow-md disabled:opacity-60">
            {importing ? 'กำลังนำเข้า...' : `นำเข้า ${IMPORT_LABELS[kind]}`}
          </button>
          <button onClick={() => { setCsvText(''); setFileName(''); setLastResult(null) }} className="px-6 py-3 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">ล้าง</button>
        </div>
      </div>
    </div>
  )
}
