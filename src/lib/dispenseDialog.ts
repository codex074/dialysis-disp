// โมดัลยืนยันการจ่ายยา — แก้ไขรายการน้ำยา/จำนวนได้ก่อนยืนยัน (พอร์ตจาก openDispenseDialog)
import { Swal } from './swal'
import type { Dispense, Fluid, OrderItem } from '../types'
import { getOrderItems, getFluidOptionLabel } from './format'

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export interface DispenseDialogResult {
  note: string
  items: OrderItem[]
}

function fluidOptionsHtml(fluids: Fluid[], selected: string): string {
  const labels = fluids.map((f) => getFluidOptionLabel(f)).filter(Boolean)
  const parts = ['<option value="">— เลือกชนิดน้ำยา —</option>']
  // เก็บค่าน้ำยาเดิมที่อาจไม่อยู่ในรายการน้ำยาปัจจุบันไว้ ไม่ให้หาย
  if (selected && !labels.includes(selected)) {
    parts.push(`<option value="${esc(selected)}" selected>${esc(selected)}</option>`)
  }
  for (const label of labels) {
    parts.push(`<option value="${esc(label)}" ${label === selected ? 'selected' : ''}>${esc(label)}</option>`)
  }
  return parts.join('')
}

function itemRowHtml(fluids: Fluid[], item: { fluidType?: string; quantity?: string | number }): string {
  return `<div class="disp-row flex items-start gap-2 mb-2" data-row>
    <select class="disp-fluid flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700" aria-label="ชนิดน้ำยา">${fluidOptionsHtml(fluids, String(item.fluidType || ''))}</select>
    <input type="number" min="1" class="disp-qty w-24 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700" value="${esc(item.quantity ?? '')}" placeholder="จำนวน" aria-label="จำนวน">
    <button type="button" class="disp-remove shrink-0 grid place-items-center w-10 h-[38px] rounded-lg text-red-500 hover:bg-red-50" data-remove aria-label="ลบรายการ">✕</button>
  </div>`
}

// คืนค่า: null = ยกเลิก, object = ยืนยัน (พร้อมรายการน้ำยาที่อาจถูกแก้ไข + หมายเหตุ)
export async function openDispenseDialog(order: Dispense, fluids: Fluid[] = []): Promise<DispenseDialogResult | null> {
  const items = getOrderItems(order).filter((it) => it.fluidType || it.quantity)
  const initial = items.length ? items : [{ fluidType: '', quantity: '' }]
  const rowsHtml = initial.map((it) => itemRowHtml(fluids, it)).join('')
  const emptyRowHtml = itemRowHtml(fluids, { fluidType: '', quantity: '' })

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
        <p class="dispense-dialog__subtitle">ตรวจสอบ/แก้ไขรายการน้ำยาและจำนวนให้เรียบร้อยก่อนกดยืนยัน เพื่อบันทึกประวัติการจ่ายเข้าระบบ</p>
      </div>
      <div class="dispense-dialog__content">
        <div class="dispense-dialog__card" style="margin-bottom:1rem">
          <span class="dispense-dialog__label">ผู้ป่วย</span>
          <div class="dispense-dialog__value">${esc(order.name)}${order.hn ? ` <span style="color:#64748b;font-size:0.85em">(HN: ${esc(order.hn)})</span>` : ''}</div>
        </div>
        <div class="dispense-dialog__card" style="margin-bottom:1rem">
          <div class="flex items-center justify-between mb-2">
            <span class="dispense-dialog__label">รายการน้ำยาที่จ่าย</span>
            <span class="text-xs text-slate-400">แก้ไขชนิด/จำนวนได้</span>
          </div>
          <div id="dispItems">${rowsHtml}</div>
          <button type="button" id="dispAddItem" class="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-medium">+ เพิ่มรายการน้ำยา</button>
        </div>
        <div class="dispense-dialog__note-box">
          <label class="dispense-dialog__note-label" for="dispNote">
            <span>บันทึกเพิ่มเติม</span>
            <span class="dispense-dialog__note-hint">ไม่บังคับ</span>
          </label>
          <textarea id="dispNote" class="dispense-dialog__textarea" rows="3" placeholder="เช่น เบิก lot, ผู้รับยา, หรือหมายเหตุเพิ่มเติม"></textarea>
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
      const container = document.getElementById('dispItems')
      const wireRemove = (root: ParentNode) => {
        root.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((btn) => {
          if (btn.dataset.wired) return
          btn.dataset.wired = '1'
          btn.addEventListener('click', () => {
            if (!container) return
            if (container.querySelectorAll('[data-row]').length > 1) btn.closest('[data-row]')?.remove()
          })
        })
      }
      if (container) wireRemove(container)
      document.getElementById('dispAddItem')?.addEventListener('click', () => {
        if (!container) return
        const tmp = document.createElement('div')
        tmp.innerHTML = emptyRowHtml
        const row = tmp.firstElementChild as HTMLElement | null
        if (row) {
          container.appendChild(row)
          wireRemove(row)
        }
      })
    },
    preConfirm: () => {
      const rows = Array.from(document.querySelectorAll('#dispItems [data-row]'))
      const collected = rows
        .map((r) => ({
          fluidType: (r.querySelector('.disp-fluid') as HTMLSelectElement).value.trim(),
          quantity: (r.querySelector('.disp-qty') as HTMLInputElement).value.trim(),
        }))
        .filter((it) => it.fluidType || it.quantity)
      if (!collected.length) {
        Swal.showValidationMessage('กรุณาเพิ่มรายการน้ำยาอย่างน้อย 1 รายการ')
        return false
      }
      for (const it of collected) {
        if (!it.fluidType) {
          Swal.showValidationMessage('กรุณาเลือกชนิดน้ำยาให้ครบทุกรายการ')
          return false
        }
        const q = Number(it.quantity)
        if (!q || q < 1) {
          Swal.showValidationMessage('กรุณาระบุจำนวนให้ถูกต้องทุกรายการ')
          return false
        }
      }
      const note = (document.getElementById('dispNote') as HTMLTextAreaElement).value
      return { note, items: collected }
    },
  })
  if (!result.isConfirmed || !result.value) return null
  return result.value as DispenseDialogResult
}
