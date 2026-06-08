// โมดัลยืนยันการจ่ายยา (พอร์ตจาก openDispenseDialog)
import { Swal } from './swal'
import type { Dispense } from '../types'
import { getOrderFluidNames, splitOrderLines } from './format'

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// คืนค่า: null = ยกเลิก, string = บันทึก (อาจเป็นค่าว่าง = ไม่มีหมายเหตุ)
export async function openDispenseDialog(order: Dispense): Promise<string | null> {
  const fluids = getOrderFluidNames(order).map(esc).join('<br>') || '-'
  const qty = splitOrderLines(order.quantity).map(esc).join('<br>') || '-'
  const result = await Swal.fire({
    width: 720,
    title: '',
    html: `<div class="dispense-dialog">
      <div class="dispense-dialog__hero">
        <div class="dispense-dialog__hero-icon">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="dispense-dialog__eyebrow">ตรวจสอบก่อนบันทึกการจ่าย</div>
        <h3 class="dispense-dialog__title">ยืนยันการจ่ายยา</h3>
        <p class="dispense-dialog__subtitle">ตรวจสอบข้อมูลผู้ป่วยและรายการน้ำยาให้เรียบร้อยก่อนกดยืนยัน เพื่อบันทึกประวัติการจ่ายเข้าระบบ</p>
      </div>
      <div class="dispense-dialog__content">
        <div class="dispense-dialog__summary">
          <div class="dispense-dialog__card">
            <span class="dispense-dialog__label">ผู้ป่วย</span>
            <div class="dispense-dialog__value">${esc(order.name)}</div>
          </div>
          <div class="dispense-dialog__card">
            <span class="dispense-dialog__label">ชนิดน้ำยา</span>
            <div class="dispense-dialog__value">${fluids}</div>
          </div>
          <div class="dispense-dialog__card">
            <span class="dispense-dialog__label">จำนวนที่จ่าย</span>
            <div class="dispense-dialog__value dispense-dialog__value--qty text-base leading-relaxed">${qty}</div>
          </div>
        </div>
        <div class="dispense-dialog__note-box">
          <label class="dispense-dialog__note-label" for="dispNote">
            <span>บันทึกเพิ่มเติม</span>
            <span class="dispense-dialog__note-hint">ไม่บังคับ</span>
          </label>
          <textarea id="dispNote" class="dispense-dialog__textarea" rows="4" placeholder="เช่น เบิก lot, ผู้รับยา, หรือหมายเหตุเพิ่มเติม"></textarea>
          <div class="dispense-dialog__footer">ข้อมูลในช่องนี้จะถูกบันทึกแนบกับประวัติการจ่ายของรายการนี้</div>
        </div>
      </div>
    </div>`,
    showCancelButton: true,
    confirmButtonText: '✓ ยืนยันจ่าย',
    cancelButtonText: 'ยกเลิก',
    buttonsStyling: false,
    focusConfirm: false,
    customClass: {
      popup: 'dispense-swal-popup',
      title: 'dispense-swal-title',
      htmlContainer: 'dispense-swal-html',
      actions: 'dispense-swal-actions',
      confirmButton: 'dispense-swal-confirm',
      cancelButton: 'dispense-swal-cancel',
    },
    didOpen: () => {
      const noteEl = document.getElementById('dispNote') as HTMLTextAreaElement | null
      if (noteEl) noteEl.focus()
    },
    preConfirm: () => (document.getElementById('dispNote') as HTMLTextAreaElement).value,
  })
  if (!result.isConfirmed) return null
  return String(result.value || '')
}
