// แท็บลงทะเบียน/แก้ไขผู้ป่วย (REGISTER) — พอร์ตจาก #ntab-content-register
import { useEffect, useState } from 'react'
import { useData } from '../../context/DataContext'
import type { Patient } from '../../types'
import { addPatient, updatePatient } from '../../services/patients'
import { isPatientInactive } from '../../lib/dashboard'
import { normalizeHN } from '../../lib/format'
import { Swal, toastSuccess } from '../../lib/swal'
import { quickViewHistory } from '../../lib/historyModal'
import { PatientStatusBadge } from '../../components/badges'

interface FormState {
  hn: string
  name: string
  phone: string
  treatmentRights: string
  note: string
  inactive: boolean
  inactiveNote: string
}

const EMPTY: FormState = { hn: '', name: '', phone: '', treatmentRights: '', note: '', inactive: false, inactiveNote: '' }

export default function RegisterTab({
  prefillHN,
  onConsumePrefill,
  onOrderForPatient,
}: {
  prefillHN: string
  onConsumePrefill: () => void
  onOrderForPatient: (hn: string) => void
}) {
  const { patients, refresh } = useData()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingOriginalHN, setEditingOriginalHN] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!prefillHN) return
    setForm({ ...EMPTY, hn: prefillHN })
    setMode('create')
    onConsumePrefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillHN])

  function resetForm() {
    setForm(EMPTY)
    setMode('create')
    setEditingOriginalHN(null)
  }

  function startEdit(patient: Patient) {
    setMode('edit')
    setEditingOriginalHN(patient.hn)
    setForm({
      hn: patient.hn,
      name: patient.name,
      phone: patient.phone || '',
      treatmentRights: patient.treatmentRights || '',
      note: patient.note || '',
      inactive: isPatientInactive(patient),
      inactiveNote: patient.inactiveNote || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data: Partial<Patient> = {
      hn: normalizeHN(form.hn),
      name: form.name.trim(),
      phone: form.phone.trim(),
      treatmentRights: form.treatmentRights.trim(),
      note: form.note.trim(),
      status: form.inactive ? 'inactive' : 'active',
      inactiveNote: form.inactive ? form.inactiveNote.trim() : '',
    }
    if (form.inactive && !data.inactiveNote) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุหมายเหตุ', text: 'เมื่อกด Inactive ต้องระบุเหตุผล เช่น เสียชีวิต', confirmButtonColor: '#0891b2' })
      return
    }
    if (mode === 'create' && patients.some((p) => normalizeHN(p.hn) === data.hn)) {
      Swal.fire({ icon: 'warning', title: 'HN ซ้ำ', text: 'HN นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง', confirmButtonColor: '#0891b2' })
      return
    }
    setSubmitting(true)
    const res = mode === 'edit' && editingOriginalHN ? await updatePatient(editingOriginalHN, data) : await addPatient(data)
    setSubmitting(false)
    if (res.status !== 'success') {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
      return
    }
    if (mode === 'edit' || data.status === 'inactive') {
      toastSuccess(res.message || 'บันทึกข้อมูลผู้ป่วยเรียบร้อย')
      resetForm()
      await refresh()
    } else {
      const hn = data.hn!
      const r = await Swal.fire({
        icon: 'success',
        title: 'ลงทะเบียนสำเร็จ',
        text: 'ต้องการสั่งจ่ายน้ำยาให้ผู้ป่วยเลยหรือไม่?',
        showCancelButton: true,
        confirmButtonText: 'สั่งจ่ายเลย',
        cancelButtonText: 'ภายหลัง',
        confirmButtonColor: '#0891b2',
      })
      resetForm()
      await refresh()
      if (r.isConfirmed) onOrderForPatient(hn)
    }
  }

  async function toggleInactive(patient: Patient) {
    const nextInactive = !isPatientInactive(patient)
    let inactiveNote = ''
    if (nextInactive) {
      const result = await Swal.fire({
        title: 'ตั้งผู้ป่วยเป็น Inactive?',
        input: 'textarea',
        inputLabel: 'หมายเหตุ Inactive',
        inputPlaceholder: 'เช่น เสียชีวิต',
        inputValue: patient.inactiveNote || '',
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#e11d48',
        inputValidator: (value) => (!String(value || '').trim() ? 'กรุณาระบุหมายเหตุ' : null),
      })
      if (!result.isConfirmed) return
      inactiveNote = String(result.value || '').trim()
    } else {
      const result = await Swal.fire({
        title: 'เปิดใช้งานผู้ป่วยอีกครั้ง?',
        text: `${patient.hn} - ${patient.name}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'เปิด Active',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#059669',
      })
      if (!result.isConfirmed) return
    }
    const res = await updatePatient(patient.hn, {
      hn: patient.hn,
      name: patient.name,
      phone: patient.phone || '',
      treatmentRights: patient.treatmentRights || '',
      note: patient.note || '',
      status: nextInactive ? 'inactive' : 'active',
      inactiveNote,
    })
    if (res.status === 'success') {
      toastSuccess(nextInactive ? 'ตั้งเป็น Inactive แล้ว' : 'เปิด Active แล้ว')
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  const filtered = patients.filter(
    (p) =>
      !search ||
      p.hn.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.inactiveNote || '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="slide-in">
      <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
          <h3 className="text-slate-800 font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            <span>{mode === 'edit' ? 'แก้ไขข้อมูลผู้ป่วย' : 'ลงทะเบียนผู้ป่วยใหม่'}</span>
          </h3>
          <p className="mt-1 text-xs text-cyan-700">{mode === 'edit' ? 'ปรับปรุงข้อมูลผู้ป่วยและบันทึกกลับเข้าสู่ระบบ' : 'บันทึกข้อมูลผู้ป่วยใหม่เข้าสู่ระบบ'}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">HN *</label>
              <input type="text" required value={form.hn} onChange={(e) => setForm({ ...form, hn: e.target.value })} placeholder="เช่น 670001" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="เช่น 081-234-5678" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-สกุล *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น นายสมชาย ใจดี" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">สิทธิการรักษา</label>
            <input type="text" value={form.treatmentRights} onChange={(e) => setForm({ ...form, treatmentRights: e.target.value })} placeholder="เช่น บัตรทอง / ประกันสังคม / ข้าราชการ" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
            <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span>
                <span className="block text-sm font-semibold text-slate-700">Inactive</span>
                <span className="block text-xs text-slate-500 mt-1">ปิดใช้งานผู้ป่วย เช่น เสียชีวิต หรือไม่ติดตามต่อ</span>
              </span>
              <input type="checkbox" checked={form.inactive} onChange={(e) => setForm({ ...form, inactive: e.target.checked })} className="h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
            </label>
            {form.inactive && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ Inactive *</label>
                <textarea rows={2} value={form.inactiveNote} onChange={(e) => setForm({ ...form, inactiveNote: e.target.value })} placeholder="เช่น เสียชีวิต" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white" />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 px-6 py-3 rounded-lg font-medium shadow-md disabled:opacity-60">
              {mode === 'edit' ? 'บันทึกการแก้ไข' : 'ลงทะเบียน'}
            </button>
            <button type="button" onClick={resetForm} className="px-6 py-3 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">{mode === 'edit' ? 'ยกเลิก' : 'ล้างข้อมูล'}</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-slate-800 font-semibold">รายชื่อผู้ป่วย</h3>
          <div className="relative">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา HN หรือชื่อ..." className="px-3 py-1.5 pr-10 text-sm rounded-lg border border-slate-200 bg-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-600 uppercase">
                <th className="px-4 py-3">HN</th>
                <th className="px-4 py-3">ชื่อ-สกุล</th>
                <th className="px-4 py-3">เบอร์โทร</th>
                <th className="px-4 py-3">สิทธิการรักษา</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">ยังไม่มีข้อมูล</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.hn} className={`hover:bg-slate-50 ${isPatientInactive(p) ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{p.hn}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-medium">{p.name}</div>
                      {isPatientInactive(p) && p.inactiveNote && <div className="text-xs text-rose-600 mt-1">หมายเหตุ: {p.inactiveNote}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.treatmentRights || '-'}</td>
                    <td className="px-4 py-3"><PatientStatusBadge patient={p} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => quickViewHistory(p.hn, p.name)} className="text-xs px-3 py-1 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100">ดูประวัติ</button>
                        <button onClick={() => startEdit(p)} className="text-xs px-3 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100">แก้ไข</button>
                        <button onClick={() => toggleInactive(p)} className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">{isPatientInactive(p) ? 'เปิด Active' : 'ตั้ง Inactive'}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
