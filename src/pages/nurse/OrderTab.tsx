// แท็บสั่งจ่ายน้ำยา (ORDER) — พอร์ตจาก #ntab-content-order
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import type { Dispense, OrderItem, Patient } from '../../types'
import { createDispenseOrder, updateOrder } from '../../services/dispenses'
import { buildClientNurseDashboard, isPatientInactive } from '../../lib/dashboard'
import { formatThaiDate, getOrderItems, getOrderFluidNames } from '../../lib/format'
import { buildNurseAppointmentQueue, getLatestReusableOrder, getPatientOrders, type QueueItem } from '../../lib/orders'
import { getPaginationData } from '../../lib/pagination'
import { Swal, toastError, toastSuccess } from '../../lib/swal'
import { quickViewHistory } from '../../lib/historyModal'
import FluidCombo from '../../components/FluidCombo'
import PatientPicker, { findPatientsByQuery } from '../../components/PatientPicker'
import Pagination from '../../components/Pagination'
import { AppointmentBadge, PatientStatusBadge, StatusBadge } from '../../components/badges'

const EMPTY_ITEM: OrderItem = { fluidType: '', quantity: '' }

export default function OrderTab({
  prefillHN,
  onConsumePrefill,
  onRegisterNew,
}: {
  prefillHN: string
  onConsumePrefill: () => void
  onRegisterNew: (hn: string) => void
}) {
  const { user } = useAuth()
  const { patients, fluids, orders, appointments, refresh } = useData()

  const [searchText, setSearchText] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [items, setItems] = useState<OrderItem[]>([{ ...EMPTY_ITEM }])
  const [orderNurse, setOrderNurse] = useState(user?.fullName || '')
  const [orderNote, setOrderNote] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('09:00')
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [recentPage, setRecentPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const dashboard = useMemo(() => buildClientNurseDashboard(orders, patients), [orders, patients])
  const queue = useMemo(() => buildNurseAppointmentQueue(appointments, patients, orders), [appointments, patients, orders])
  const recentPagination = useMemo(() => getPaginationData(orders, recentPage), [orders, recentPage])
  const quickHistory = useMemo(() => (patient ? getPatientOrders(orders, patient.hn).slice(0, 5) : []), [orders, patient])

  // เติมฟอร์มจาก prefill HN (ข้ามมาจากหน้าลงทะเบียน)
  useEffect(() => {
    if (!prefillHN) return
    const found = patients.find((p) => p.hn === prefillHN)
    if (found) selectPatient(found)
    onConsumePrefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillHN, patients])

  function resetForm() {
    setItems([{ ...EMPTY_ITEM }])
    setOrderNurse(user?.fullName || '')
    setOrderNote('')
    setNextDate('')
    setNextTime('09:00')
    setMode('create')
    setEditingOrderId(null)
  }

  function selectPatient(p: Patient) {
    setPatient(p)
    setSearchText(`${p.hn} - ${p.name}`)
    if (mode !== 'edit') resetForm()
    if (isPatientInactive(p)) {
      toastError('ผู้ป่วยถูกตั้งเป็น Inactive ไม่สามารถสั่งจ่ายใหม่ได้')
    }
  }

  function handleSearch() {
    const q = searchText.trim()
    if (!q) {
      toastError('กรุณากรอก HN')
      return
    }
    const matches = findPatientsByQuery(patients, q)
    if (matches.length === 1) {
      selectPatient(matches[0])
    } else if (matches.length > 1) {
      toastError('พบหลายรายการ กรุณาระบุ HN หรือชื่อให้ชัดเจนขึ้น')
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่พบผู้ป่วย',
        text: 'ต้องการลงทะเบียนผู้ป่วยใหม่หรือไม่?',
        showCancelButton: true,
        confirmButtonText: 'ลงทะเบียนใหม่',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0891b2',
      }).then((r) => {
        if (r.isConfirmed) onRegisterNew(q)
      })
    }
  }

  function applyTemplate(order: Dispense | null, opts: { nextAppointment?: string; nextTime?: string } = {}) {
    if (!order) {
      toastError('ยังไม่มีประวัติคำสั่งสำหรับผู้ป่วยรายนี้')
      return false
    }
    setItems(getOrderItems(order))
    setOrderNurse(order.nurse || user?.fullName || '')
    setOrderNote(order.nurseNote || order.note || '')
    setNextDate(opts.nextAppointment || '')
    setNextTime(opts.nextTime || '09:00')
    return true
  }

  function pickAppointment(item: QueueItem) {
    const p = patients.find((x) => x.hn === item.hn)
    if (p && isPatientInactive(p)) {
      toastError('ผู้ป่วยถูกตั้งเป็น Inactive ไม่สามารถสั่งจ่ายใหม่ได้')
      return
    }
    const target = p || ({ hn: item.hn, name: item.name, phone: '', treatmentRights: '', note: '', registeredDate: '', status: 'active', inactiveNote: '' } as Patient)
    setMode('create')
    setPatient(target)
    setSearchText(`${target.hn} - ${target.name}`)
    const tmpl = getLatestReusableOrder(orders, item.hn, item.dispenseId)
    if (applyTemplate(tmpl, { nextAppointment: item.date || '', nextTime: item.time || '09:00' })) {
      toastSuccess('ดึงข้อมูลคำสั่งเดิมมาใส่ฟอร์มแล้ว')
    }
  }

  function startEditOrder(order: Dispense) {
    if (order.status !== 'pending') {
      toastError('แก้ไขได้เฉพาะใบสั่งที่ยังรอจ่ายเท่านั้น')
      return
    }
    const matched = patients.find((p) => p.hn === order.hn) || ({ hn: order.hn, name: order.name, phone: '', treatmentRights: '', note: '', registeredDate: '', status: 'active', inactiveNote: '' } as Patient)
    setMode('edit')
    setEditingOrderId(order.id)
    setPatient(matched)
    setSearchText(`${matched.hn} - ${matched.name}`)
    setItems(getOrderItems(order))
    setOrderNurse(order.nurse || user?.fullName || '')
    setOrderNote(order.nurseNote || order.note || '')
    setNextDate(order.nextAppointment || '')
    setNextTime(order.nextTime || '09:00')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setPatient(null)
    setSearchText('')
    resetForm()
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!patient) {
      toastError('กรุณาเลือกผู้ป่วยก่อน')
      return
    }
    if (isPatientInactive(patient)) {
      toastError('ผู้ป่วยถูกตั้งเป็น Inactive ไม่สามารถสั่งจ่ายใหม่ได้')
      return
    }
    const cleaned = items.filter((it) => it.fluidType || it.quantity)
    if (!cleaned.length) {
      toastError('กรุณาเพิ่มรายการน้ำยาอย่างน้อย 1 รายการ')
      return
    }
    if (cleaned.some((it) => !it.fluidType || !Number(it.quantity) || Number(it.quantity) < 1)) {
      toastError('กรุณาเลือกชนิดน้ำยาและจำนวนให้ครบทุกแถว')
      return
    }
    const data: Partial<Dispense> = {
      hn: patient.hn,
      name: patient.name,
      items: cleaned,
      orderedBy: orderNurse.trim(),
      nurse: orderNurse.trim(),
      note: orderNote.trim(),
      nextAppointment: nextDate,
      nextTime,
    }
    const confirm = await Swal.fire({
      title: mode === 'edit' ? 'ยืนยันบันทึกการแก้ไข?' : 'ยืนยันสั่งจ่าย?',
      html: `<div class="text-left">
        <p><b>ผู้ป่วย:</b> ${patient.name}</p>
        <p><b>HN:</b> ${patient.hn}</p>
        <div class="mt-2"><b>รายการน้ำยา:</b><div class="mt-1 space-y-1">${cleaned.map((it) => `<div>${it.fluidType || '-'} × ${it.quantity || '-'}</div>`).join('')}</div></div>
        ${nextDate ? `<p class="text-amber-600 mt-2"><b>นัดครั้งต่อไป:</b> ${formatThaiDate(nextDate)} ${nextTime}</p>` : ''}
        <p class="mt-3 text-cyan-600 text-sm">${mode === 'edit' ? 'ระบบจะอัปเดตเฉพาะใบสั่งที่ยังรอจ่ายอยู่' : 'ใบสั่งจะถูกส่งไปยังห้องจ่าย'}</p>
      </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: mode === 'edit' ? 'บันทึกการแก้ไข' : 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0891b2',
    })
    if (!confirm.isConfirmed) return
    setSubmitting(true)
    const res = mode === 'edit' && editingOrderId ? await updateOrder(editingOrderId, data) : await createDispenseOrder(data)
    setSubmitting(false)
    if (res.status === 'success') {
      Swal.fire({ icon: 'success', title: mode === 'edit' ? 'บันทึกการแก้ไขเรียบร้อย' : 'ส่งใบสั่งเรียบร้อย', text: res.message, timer: 2000, showConfirmButton: false })
      cancelForm()
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  const showOrderForm = patient && !isPatientInactive(patient)

  return (
    <div className="slide-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-gradient-1 rounded-2xl p-4 text-white card-hover shadow">
          <p className="text-white/80 text-xs">ผู้ป่วยทั้งหมด</p>
          <p className="text-2xl font-bold mt-1">{dashboard.totalPatients}</p>
        </div>
        <div className="stat-gradient-2 rounded-2xl p-4 text-white card-hover shadow">
          <p className="text-white/80 text-xs">รอห้องจ่ายดำเนินการ</p>
          <p className="text-2xl font-bold mt-1">{dashboard.pendingCount}</p>
        </div>
        <div className="stat-gradient-3 rounded-2xl p-4 text-white card-hover shadow">
          <p className="text-white/80 text-xs">สั่งจ่ายวันนี้</p>
          <p className="text-2xl font-bold mt-1">{dashboard.todayOrderCount}</p>
        </div>
      </div>

      {/* Appointment panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <AppointmentPanel
          title="ผู้ป่วยนัดวันนี้"
          subtitle="เลือกจากรายการเพื่อเริ่มสั่งจ่ายได้ทันที"
          headerClass="from-rose-50 to-orange-50"
          countClass="bg-rose-100 text-rose-700"
          items={queue.today}
          emptyText="ยังไม่มีนัดวันนี้"
          onPick={pickAppointment}
          onHistory={(hn, name) => quickViewHistory(hn, name)}
        />
        <AppointmentPanel
          title="ผู้ป่วยใกล้ถึงนัด"
          subtitle="แสดงนัดที่กำลังจะมาถึงภายใน 7 วัน"
          headerClass="from-amber-50 to-yellow-50"
          countClass="bg-amber-100 text-amber-700"
          items={queue.upcoming}
          emptyText="ยังไม่มีนัดใกล้ถึง"
          onPick={pickAppointment}
          onHistory={(hn, name) => quickViewHistory(hn, name)}
        />
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-visible mb-6 relative z-30">
        <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
          <h3 className="text-slate-800 font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            ค้นหาผู้ป่วย
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">HN หรือ ชื่อ-สกุล</label>
              <PatientPicker
                patients={patients}
                value={searchText}
                disabled={mode === 'edit'}
                onChange={(t) => {
                  setSearchText(t)
                  if (mode !== 'edit') setPatient(null)
                }}
                onSelect={selectPatient}
              />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleSearch} disabled={mode === 'edit'} className="btn-primary flex-1 px-4 py-2.5 rounded-lg font-medium disabled:opacity-60">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  ค้นหา
                </span>
              </button>
              <button onClick={() => onRegisterNew('')} disabled={mode === 'edit'} className="px-4 py-2.5 rounded-lg font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-60" title="ลงทะเบียนใหม่">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </button>
            </div>
          </div>

          {patient && (
            <div className="mt-4 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl slide-down">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-cyan-700 font-medium">พบผู้ป่วย</p>
                  <p className="text-lg font-bold text-slate-800">{patient.name}</p>
                  <p className="text-sm text-slate-600">HN: {patient.hn} • โทร: {patient.phone || '-'}</p>
                  <p className="text-sm text-slate-600">สิทธิการรักษา: {patient.treatmentRights || '-'}</p>
                  <div className="mt-2"><PatientStatusBadge patient={patient} /></div>
                  <p className="text-xs text-slate-500 mt-1">
                    {isPatientInactive(patient)
                      ? `Inactive: ${patient.inactiveNote || '-'}${patient.note ? ` • หมายเหตุ: ${patient.note}` : ''}`
                      : patient.note || ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => quickViewHistory(patient.hn, patient.name)} className="text-xs px-3 py-1.5 bg-white rounded-lg text-cyan-700 hover:bg-cyan-50 border border-cyan-200 font-medium">ดูประวัติ</button>
                </div>
              </div>

              {quickHistory.length > 0 && (
                <div className="mt-4 rounded-xl border border-cyan-200 bg-white/80 overflow-hidden">
                  <div className="px-4 py-3 border-b border-cyan-100">
                    <p className="text-sm font-semibold text-slate-800">คำสั่ง/ประวัติล่าสุด</p>
                    <p className="text-xs text-slate-500 mt-1">กดใช้รายการเดิมเพื่อเติมฟอร์มสั่งจ่ายอัตโนมัติ</p>
                  </div>
                  <div className="divide-y divide-cyan-100">
                    {quickHistory.map((order) => (
                      <div key={order.id} className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={order.status} />
                            <span className="text-xs text-slate-500">{order.orderDate || '-'}</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-800 mt-2">{getOrderFluidNames(order).map((n, i) => <div key={i}>{n}</div>)}</div>
                          <p className="text-xs text-slate-500 mt-1">ผู้สั่ง: {order.nurse || '-'}{order.nextAppointment ? ` • นัดถัดไป ${formatThaiDate(order.nextAppointment)} ${order.nextTime || ''}` : ''}</p>
                          {order.note && <p className="text-xs text-slate-500 mt-1">หมายเหตุ: {order.note}</p>}
                        </div>
                        <button onClick={() => { if (applyTemplate(getLatestReusableOrder(orders, order.hn, order.id))) toastSuccess('ดึงข้อมูลคำสั่งเดิมมาใส่ฟอร์มแล้ว') }} className="text-xs px-3 py-2 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 font-medium">
                          ใช้รายการนี้
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order form */}
      {showOrderForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden mb-6 slide-in">
          <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
            <h3 className="text-slate-800 font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <span>{mode === 'edit' ? 'แก้ไขใบสั่งจ่าย' : 'สั่งจ่ายน้ำยา'}</span>
            </h3>
            <p className="mt-1 text-xs text-cyan-700">กรอกข้อมูลใบสั่งเพื่อส่งต่อให้ห้องจ่ายยา</p>
          </div>
          <form onSubmit={submitOrder} className="p-5 space-y-4">
            {mode === 'edit' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                กำลังแก้ไขใบสั่งจ่ายที่ยังไม่ถูกจ่าย ขณะนี้จะยังไม่สามารถเปลี่ยนผู้ป่วยของรายการนี้ได้
              </div>
            )}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-sm font-medium text-slate-700">รายการน้ำยา *</label>
                <button type="button" onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 font-medium">
                  + เพิ่มชนิดน้ำยา
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-3 items-end">
                      <FluidCombo
                        fluids={fluids}
                        index={index}
                        value={String(item.fluidType)}
                        onChange={(val) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, fluidType: val } : it)))}
                      />
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">จำนวน</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.quantity}
                          placeholder="เช่น 60"
                          onChange={(e) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: e.target.value } : it)))}
                          className="order-qty-input w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))}
                        className={`px-3 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 text-sm font-medium ${items.length === 1 ? 'invisible' : ''}`}
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">สามารถเพิ่มน้ำยาได้หลายชนิดในใบสั่งเดียว โดยระบุจำนวนแยกแต่ละชนิด</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ผู้สั่งจากห้องตรวจ</label>
              <input type="text" value={orderNurse} onChange={(e) => setOrderNurse(e.target.value)} placeholder="ชื่อผู้สั่ง" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
              <textarea rows={2} value={orderNote} onChange={(e) => setOrderNote(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <h4 className="font-semibold text-amber-800">นัดรับครั้งต่อไป (ไม่บังคับ)</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-amber-700 mb-1">วันที่นัด</label>
                  <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-amber-700 mb-1">เวลานัด</label>
                  <input type="time" value={nextTime} onChange={(e) => setNextTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1 px-6 py-3 rounded-lg font-medium shadow-md disabled:opacity-60">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>{mode === 'edit' ? 'บันทึกการแก้ไข' : 'ส่งใบสั่งจ่าย'}</span>
                </span>
              </button>
              <button type="button" onClick={cancelForm} className="px-6 py-3 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">ยกเลิก</button>
            </div>
          </form>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
          <h3 className="text-slate-800 font-semibold">รายการสั่งจ่ายล่าสุด</h3>
        </div>
        {recentPagination.totalItems === 0 ? (
          <div className="text-center py-8 text-slate-400">ยังไม่มีรายการ</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentPagination.items.map((o) => (
              <div key={o.id} className="px-5 py-3 hover:bg-slate-50 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-slate-500">{o.orderDate}</span>
                  </div>
                  <p className="font-medium text-slate-800">{o.name}</p>
                  <div className="text-xs text-slate-500">HN: {o.hn} • {getOrderFluidNames(o).join(', ')}</div>
                  {o.nurse && <p className="text-xs text-slate-400">ห้องตรวจ: {o.nurse}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {o.status === 'pending' ? (
                    <button onClick={() => startEditOrder(o)} className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium">แก้ไขใบสั่ง</button>
                  ) : (
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400">แก้ไขไม่ได้</span>
                  )}
                </div>
              </div>
            ))}
            {recentPagination.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
                <Pagination data={recentPagination} onChange={(d) => setRecentPage((p) => p + d)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AppointmentPanel({
  title,
  subtitle,
  headerClass,
  countClass,
  items,
  emptyText,
  onPick,
  onHistory,
}: {
  title: string
  subtitle: string
  headerClass: string
  countClass: string
  items: QueueItem[]
  emptyText: string
  onPick: (item: QueueItem) => void
  onHistory: (hn: string, name: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden">
      <div className={`px-5 py-4 border-b border-cyan-100 bg-gradient-to-r ${headerClass} flex items-center justify-between gap-3 flex-wrap`}>
        <div>
          <h3 className="text-slate-800 font-semibold">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${countClass}`}>{items.length} ราย</span>
      </div>
      <div className="p-3 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-400">{emptyText}</div>
        ) : (
          items.map((item) => (
            <div key={`${item.id}`} className={`rounded-xl border ${item.daysUntil === 0 ? 'border-rose-200 bg-rose-50/70' : 'border-amber-200 bg-amber-50/70'} p-4`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AppointmentBadge daysUntil={item.daysUntil} />
                    <span className="text-xs text-slate-500">{formatThaiDate(item.date)}{item.time ? ` • ${item.time}` : ''}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-2">{item.patient.name || item.name}</p>
                  <p className="text-xs text-slate-500 mt-1">HN: {item.patient.hn || item.hn}{item.patient.phone ? ` • โทร: ${item.patient.phone}` : ''}</p>
                  <p className="text-xs text-slate-500 mt-1">สิทธิ: {item.patient.treatmentRights || 'ไม่ระบุ'}</p>
                  <p className="text-xs text-slate-600 mt-2">
                    {item.latestOrder ? `ล่าสุด: ${getOrderFluidNames(item.latestOrder).join(', ')} (${item.latestOrder.orderDateOnly || item.latestOrder.orderDate || '-'})` : 'ยังไม่มีประวัติคำสั่งเดิม'}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => onPick(item)} className="text-xs px-3 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 font-medium">เลือกมาสั่งจ่าย</button>
                  <button type="button" onClick={() => onHistory(item.hn, item.patient.name || item.name)} className="text-xs px-3 py-2 rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-medium">ดูประวัติ</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
