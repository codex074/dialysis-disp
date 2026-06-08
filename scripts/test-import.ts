// ทดสอบ logic การ parse CSV จริง (parseCsv/mapRow) แบบ dry-run ไม่แตะ Firestore
import { parseCsv } from '../src/services/importCsv'
import type { OrderItem } from '../src/types'

let failed = 0
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log('  ✅', name)
  } else {
    failed++
    console.log('  ❌', name, extra !== undefined ? JSON.stringify(extra) : '')
  }
}

// 1) Patients พร้อม BOM ที่คอลัมน์แรก (Google Sheets ใส่มาให้)
console.log('Patients (with UTF-8 BOM on first header):')
{
  const csv = '﻿HN,ชื่อ-สกุล,เบอร์โทร,สิทธิการรักษา,หมายเหตุ,วันที่ลงทะเบียน,สถานะ,หมายเหตุ Inactive\n' +
    '670001,นายสมชาย ใจดี,081-234-5678,บัตรทอง,,2026-01-05,active,\n' +
    '670002,นางสมหญิง รักดี,,ประกันสังคม,เบาหวาน,2026-02-01,inactive,เสียชีวิต'
  const { mapped } = parseCsv('patients', csv)
  assert('parsed 2 rows', mapped.length === 2, mapped.length)
  assert('HN resolved despite BOM', mapped[0].id === '670001', mapped[0].id)
  assert('name mapped', mapped[0].data.name === 'นายสมชาย ใจดี', mapped[0].data.name)
  assert('inactive status + note', mapped[1].data.status === 'inactive' && mapped[1].data.inactiveNote === 'เสียชีวิต', mapped[1].data)
}

// 2) Users — hash ถูกเก็บตรง ๆ, doc id = username
console.log('Users:')
{
  const csv = 'Username,Password,ชื่อ-สกุล,บทบาท,วันที่สร้าง\n' +
    'admin,51b64e7831a2df9894589ec91985fcb89582ae590c8cd1fa4383f12636ffe638,ผู้ดูแล,admin,2026-01-01'
  const { mapped } = parseCsv('users', csv)
  assert('doc id = username', mapped[0].id === 'admin', mapped[0].id)
  assert('password hash preserved', mapped[0].data.password === '51b64e7831a2df9894589ec91985fcb89582ae590c8cd1fa4383f12636ffe638')
  assert('role normalized', mapped[0].data.role === 'admin', mapped[0].data.role)
}

// 3) Fluids — labelName fallback = name, price เป็นตัวเลข
console.log('Fluids:')
{
  const csv = 'Code,Name,Label_Name,Ingredient,Conc,Price,Added_Date\n' +
    'F001,Dianeal PD4 1.5% 2000ml,,น้ำยา,1.5%,"1,250.50",2026-01-01'
  const { mapped } = parseCsv('fluids', csv)
  assert('labelName falls back to name', mapped[0].data.labelName === 'Dianeal PD4 1.5% 2000ml', mapped[0].data.labelName)
  assert('price numeric (comma stripped)', mapped[0].data.price === 1250.5, mapped[0].data.price)
}

// 4) Dispenses — multi-line "1. ...\n2. ..." -> items[] zip ถูกต้อง + round-trip
console.log('Dispenses (multi-line items round-trip):')
{
  const csv = 'รหัสรายการ,วันที่สั่ง,HN,ชื่อ-สกุล,ชนิดน้ำยา,จำนวน,ผู้สั่งจ่าย,หมายเหตุ,สถานะ,วันที่จ่ายจริง,ผู้จ่าย,วันนัดครั้งต่อไป\n' +
    '"D1","2026-03-01 09:00","670001","นายสมชาย","1. Dianeal 1.5%\n2. Dianeal 2.5%","1. 60\n2. 30","ห้องตรวจ","","pending","","","2026-04-01"'
  const { mapped } = parseCsv('dispenses', csv)
  const items = mapped[0].data.items as OrderItem[]
  assert('2 items parsed', items.length === 2, items)
  assert('item1 zip', items[0].fluidType === 'Dianeal 1.5%' && String(items[0].quantity) === '60', items[0])
  assert('item2 zip', items[1].fluidType === 'Dianeal 2.5%' && String(items[1].quantity) === '30', items[1])
  // round-trip: items -> สรุป string แบบเดียวกับที่ mapDispense ใช้แสดงผล
  const multi = items.length > 1
  const fluidSummary = items.map((it, i) => (multi ? `${i + 1}. ${it.fluidType}` : `${it.fluidType}`)).join('\n')
  assert('round-trip fluid summary', fluidSummary === '1. Dianeal 1.5%\n2. Dianeal 2.5%', fluidSummary)
  assert('nextAppointment formatted', mapped[0].data.nextAppointment === '2026-04-01', mapped[0].data.nextAppointment)
}

console.log(failed === 0 ? '\nALL PASSED ✅' : `\n${failed} CHECK(S) FAILED ❌`)
process.exit(failed === 0 ? 0 : 1)
