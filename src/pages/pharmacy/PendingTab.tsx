// แท็บรายการรอจ่าย — กดจ่าย/ยกเลิก (พอร์ตจาก #ptab-content-pending)
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import type { Dispense } from '../../types'
import { cancelDispenseOrder, confirmDispense } from '../../services/dispenses'
import { formatNextAppointmentLabel, getOrderFluidNames } from '../../lib/format'
import { openDispenseDialog } from '../../lib/dispenseDialog'
import { Swal, toastSuccess } from '../../lib/swal'

export default function PendingTab() {
  const { user } = useAuth()
  const { orders, refresh } = useData()
  const pendingOrders = orders.filter((o) => o.status === 'pending')

  async function dispense(order: Dispense) {
    const note = await openDispenseDialog(order)
    if (note === null || !user) return
    const res = await confirmDispense(order.id, user, note)
    if (res.status === 'success') {
      Swal.fire({ icon: 'success', title: 'จ่ายยาเรียบร้อย', timer: 1800, showConfirmButton: false })
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  async function cancel(order: Dispense) {
    const result = await Swal.fire({
      title: 'ยกเลิกรายการ?',
      input: 'text',
      inputLabel: 'เหตุผล',
      inputPlaceholder: 'เช่น ผู้ป่วยไม่มารับ',
      showCancelButton: true,
      confirmButtonText: 'ยกเลิกรายการ',
      cancelButtonText: 'ย้อนกลับ',
      confirmButtonColor: '#f59e0b',
    })
    if (!result.isConfirmed) return
    const res = await cancelDispenseOrder(order.id, String(result.value || ''))
    if (res.status === 'success') {
      toastSuccess(res.message || 'ยกเลิกรายการเรียบร้อย')
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-slate-800 font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          รายการรอจ่าย (ผู้ป่วยมารับแล้วกดจ่าย)
        </h3>
        <button onClick={refresh} className="text-xs px-3 py-1.5 bg-white rounded-lg text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          รีเฟรช
        </button>
      </div>
      {pendingOrders.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-16 h-16 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
          <p>ไม่มีรายการรอจ่าย</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pendingOrders.map((o) => (
            <div key={o.id} className="p-4 hover:bg-slate-50 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="status-pending px-2 py-0.5 rounded-md text-xs font-medium">รอจ่าย</span>
                    <span className="text-xs text-slate-500">{o.orderDate}</span>
                  </div>
                  <p className="font-medium text-slate-800">{o.name} <span className="text-xs text-slate-400">(HN: {o.hn})</span></p>
                  <div className="text-sm text-slate-600">{getOrderFluidNames(o).map((n, i) => <div key={i}>{n}</div>)}</div>
                  <p className="text-xs text-amber-700 mt-1">นัดถัดไป: {formatNextAppointmentLabel(o)}</p>
                  {o.nurse && <p className="text-xs text-slate-400">ห้องตรวจ: {o.nurse}</p>}
                  {o.nurseNote && <p className="text-xs text-slate-500 italic">"{o.nurseNote}"</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => dispense(o)} className="btn-success px-4 py-2 rounded-lg text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    จ่ายยา
                  </span>
                </button>
                <button onClick={() => cancel(o)} className="px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100">ยกเลิก</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
