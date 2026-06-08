// แถบแบ่งหน้า (พอร์ตจาก buildPaginationControls)
import type { Pagination as PaginationData } from '../lib/pagination'

export default function Pagination<T>({ data, onChange }: { data: PaginationData<T>; onChange: (delta: number) => void }) {
  const { page, totalPages, totalItems, start, end } = data
  if (totalItems === 0 || totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-slate-500">แสดง {start}-{end} จาก {totalItems} รายการ</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(-1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ก่อนหน้า
        </button>
        <span className="text-xs text-slate-500">หน้า {page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => onChange(1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ถัดไป
        </button>
      </div>
    </div>
  )
}
