// โมดัลดูประวัติผู้ป่วยแบบเร็ว (พอร์ตจาก quickViewHistory/renderQuickHistoryModal)
import { Swal } from './swal'
import { getPatientHistory } from '../services/dispenses'
import { getOrderFluidNames, splitOrderLines } from './format'

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function quickViewHistory(hn: string, name: string) {
  Swal.fire({ title: 'กำลังโหลด...', didOpen: () => Swal.showLoading(), allowOutsideClick: false })
  const res = await getPatientHistory(hn)
  Swal.close()
  if (res.status !== 'success') {
    Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message || 'โหลดประวัติไม่สำเร็จ' })
    return
  }
  const records = res.data || []
  if (!records.length) {
    Swal.fire({ icon: 'info', title: 'ยังไม่มีประวัติ', text: `ผู้ป่วย ${name} ยังไม่เคยรับน้ำยา` })
    return
  }
  const rows = records
    .map((o) => {
      const status = o.status === 'dispensed' ? '✓ จ่ายแล้ว' : o.status === 'pending' ? '⏰ รอจ่าย' : '✗ ยกเลิก'
      const fluids = getOrderFluidNames(o).map(esc).join('<br>') || '-'
      const qty = splitOrderLines(o.quantity).map(esc).join('<br>') || '-'
      return `<tr>
        <td class="py-1 px-2">${esc(o.orderDateOnly)}</td>
        <td class="py-1 px-2">${fluids}</td>
        <td class="py-1 px-2 text-center">${qty}</td>
        <td class="py-1 px-2">${status}</td>
      </tr>`
    })
    .join('')
  Swal.fire({
    title: `ประวัติของ ${esc(name)}`,
    html: `<div class="text-left text-sm">
      <p class="text-slate-600 mb-3">HN: ${esc(hn)} | รวม ${records.length} รายการ</p>
      <div class="max-h-80 overflow-y-auto border rounded">
        <table class="w-full text-xs">
          <thead class="bg-slate-100 sticky top-0">
            <tr><th class="py-2 px-2 text-left">วันที่</th><th class="py-2 px-2 text-left">น้ำยา</th><th class="py-2 px-2">จำนวน</th><th class="py-2 px-2 text-left">สถานะ</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`,
    width: 600,
    confirmButtonColor: '#0891b2',
  })
}
