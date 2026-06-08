// แท็บจัดการชนิดน้ำยา — เพิ่ม/ลบ (พอร์ตจาก #ptab-content-fluids)
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import type { Fluid } from '../../types'
import { addFluid, deleteFluid } from '../../services/fluids'
import { formatPrice, getFluidDisplayName } from '../../lib/format'
import { Swal, toastSuccess } from '../../lib/swal'

const EMPTY = { code: '', name: '', labelName: '', ingredient: '', conc: '', price: '' }

export default function FluidsTab() {
  const { fluids, refresh } = useData()
  const [form, setForm] = useState({ ...EMPTY })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await addFluid({
      code: form.code.trim(),
      name: form.name.trim(),
      labelName: form.labelName.trim(),
      ingredient: form.ingredient.trim(),
      conc: form.conc.trim(),
      price: form.price.trim() === '' ? '' : Number(form.price),
    } as Partial<Fluid>)
    setSubmitting(false)
    if (res.status === 'success') {
      toastSuccess(res.message || 'เพิ่มชนิดน้ำยาเรียบร้อย')
      setForm({ ...EMPTY })
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  async function doDelete(code: string) {
    const result = await Swal.fire({ title: 'ลบชนิดน้ำยา?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#ef4444' })
    if (!result.isConfirmed) return
    const res = await deleteFluid(code)
    if (res.status === 'success') {
      toastSuccess(res.message || 'ลบข้อมูลเรียบร้อย')
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h3 className="text-slate-800 font-semibold">เพิ่มชนิดน้ำยาใหม่</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code (รหัสน้ำยา) *</label>
              <input type="text" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="เช่น F004" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name (ชื่อเต็มของผลิตภัณฑ์) *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น Dianeal PD4 1.5% 2000ml" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Label_Name (ชื่อที่ใช้แสดงผล) *</label>
              <input type="text" required value={form.labelName} onChange={(e) => setForm({ ...form, labelName: e.target.value })} placeholder="เช่น Dianeal 1.5%" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conc (ความเข้มข้น)</label>
              <input type="text" value={form.conc} onChange={(e) => setForm({ ...form, conc: e.target.value })} placeholder="เช่น 1.5%" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ingredient (ส่วนผสม)</label>
              <textarea rows={2} value={form.ingredient} onChange={(e) => setForm({ ...form, ingredient: e.target.value })} placeholder="รายละเอียดส่วนผสม" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (ราคา)</label>
              <input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="เช่น 250.00" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-success flex-1 px-6 py-3 rounded-lg font-medium shadow-md disabled:opacity-60">เพิ่มน้ำยา</button>
            <button type="button" onClick={() => setForm({ ...EMPTY })} className="px-6 py-3 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">ล้าง</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h3 className="text-slate-800 font-semibold">รายการชนิดน้ำยา</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-600 uppercase">
                <th className="px-4 py-3">รหัส</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Label_Name</th>
                <th className="px-4 py-3">Ingredient</th>
                <th className="px-4 py-3">Conc</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fluids.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">ยังไม่มีข้อมูล</td></tr>
              ) : (
                fluids.map((f) => (
                  <tr key={f.code} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-cyan-700">{f.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{f.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{getFluidDisplayName(f)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{f.ingredient || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{f.conc || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatPrice(f.price)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => doDelete(f.code)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
