// แท็บประวัติการจ่ายยา (จ่ายแล้ว/ยกเลิก) + ลบรายการ — พอร์ตจาก #ptab-content-dispensed
import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext'
import { deleteDispense } from '../../services/dispenses'
import { getOrderFluidNames, splitOrderLines } from '../../lib/format'
import { getPaginationData } from '../../lib/pagination'
import { Swal, toastSuccess } from '../../lib/swal'
import Pagination from '../../components/Pagination'

export default function DispensedTab() {
  const { orders, refresh } = useData()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return orders
      .filter((o) => o.status !== 'pending')
      .filter((o) => !s || o.hn.toLowerCase().includes(s) || (o.name || '').toLowerCase().includes(s))
  }, [orders, search])

  const pagination = getPaginationData(filtered, page)

  async function doDelete(id: string) {
    const result = await Swal.fire({
      title: 'ลบรายการ?',
      text: 'การลบไม่สามารถย้อนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    })
    if (!result.isConfirmed) return
    const res = await deleteDispense(id)
    if (res.status === 'success') {
      toastSuccess(res.message || 'ลบรายการเรียบร้อย')
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-slate-800 font-semibold">ประวัติการจ่ายยา</h3>
        <div className="relative">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="ค้นหา HN หรือชื่อ..." className="px-3 py-1.5 pr-10 text-sm rounded-lg border border-slate-200 bg-white" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-600 uppercase">
              <th className="px-4 py-3">วันที่จ่าย</th>
              <th className="px-4 py-3">HN</th>
              <th className="px-4 py-3">ชื่อ-สกุล</th>
              <th className="px-4 py-3">น้ำยา</th>
              <th className="px-4 py-3">จำนวน</th>
              <th className="px-4 py-3">ผู้จ่าย</th>
              <th className="px-4 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.totalItems === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">ยังไม่มีข้อมูล</td></tr>
            ) : (
              pagination.items.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{o.dispenseDate || o.orderDate}</td>
                  <td className="px-4 py-3 font-medium text-cyan-700">{o.hn}</td>
                  <td className="px-4 py-3 text-slate-700">{o.name}</td>
                  <td className="px-4 py-3 text-slate-600">{getOrderFluidNames(o).map((n, i) => <div key={i} className="mb-1 last:mb-0">{n}</div>)}</td>
                  <td className="px-4 py-3 font-medium">{splitOrderLines(o.quantity).map((q, i) => <div key={i}>{q}</div>)}</td>
                  <td className="px-4 py-3 text-slate-500">{o.dispenser || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      {o.status === 'dispensed' ? (
                        <span className="status-dispensed px-2 py-0.5 rounded-md text-xs font-medium">✓ จ่ายแล้ว</span>
                      ) : (
                        <span className="status-cancelled px-2 py-0.5 rounded-md text-xs font-medium">✗ ยกเลิก</span>
                      )}
                      <button onClick={() => doDelete(o.id)} className="text-red-500 hover:text-red-700" title="ลบ">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
                      </button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="px-5 py-4 border-t border-emerald-100 bg-slate-50">
          <Pagination data={pagination} onChange={(d) => setPage((p) => p + d)} />
        </div>
      )}
    </div>
  )
}
