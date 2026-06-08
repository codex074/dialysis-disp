// overlay โหลดข้อมูล (พอร์ตจาก #loadingOverlay)
export default function Loading({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="loader"></div>
        <p className="text-cyan-700 font-medium">กำลังโหลด...</p>
      </div>
    </div>
  )
}
