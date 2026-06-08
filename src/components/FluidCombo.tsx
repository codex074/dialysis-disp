// ช่องเลือกน้ำยาแบบ autocomplete (พอร์ตจาก order fluid combo ใน index.html)
import { useMemo, useRef, useState } from 'react'
import type { Fluid } from '../types'
import { getFluidDisplayName, getFluidOptionLabel } from '../lib/format'

interface ComboOption {
  value: string
  meta: string
  searchText: string
}

function buildOptions(fluids: Fluid[], selectedValue: string): ComboOption[] {
  const seen = new Set<string>()
  const options: ComboOption[] = []
  fluids.forEach((f) => {
    const displayName = getFluidDisplayName(f)
    const searchLabel = getFluidOptionLabel(f)
    const value = searchLabel || displayName
    if (!value || seen.has(value)) return
    seen.add(value)
    options.push({
      value,
      meta: [f.code, f.conc].filter(Boolean).join(' • '),
      searchText: [f.code, f.name, f.labelName, f.ingredient, f.conc, value, searchLabel].filter(Boolean).join(' ').toLowerCase(),
    })
  })
  if (selectedValue && !seen.has(selectedValue)) {
    options.push({ value: selectedValue, meta: 'ข้อมูลเดิม', searchText: selectedValue.toLowerCase() })
  }
  return options
}

export default function FluidCombo({
  fluids,
  value,
  onChange,
  index,
}: {
  fluids: Fluid[]
  value: string
  onChange: (value: string) => void
  index: number
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const blurTimer = useRef<number | undefined>(undefined)

  const filtered = useMemo(() => {
    const all = buildOptions(fluids, value)
    const q = String(value || '').trim().toLowerCase()
    if (!q) return all.slice(0, 20)
    return all.filter((o) => o.searchText.includes(q)).slice(0, 20)
  }, [fluids, value])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) setOpen(true)
      if (!filtered.length) return
      const dir = e.key === 'ArrowDown' ? 1 : -1
      setHighlight((h) => (h + dir + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault()
        onChange(filtered[highlight].value)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">ชนิดน้ำยา {index + 1}</label>
      <input
        type="text"
        required
        value={value}
        placeholder="พิมพ์รหัสหรือชื่อน้ำยา แล้วเลือกจากรายการ"
        autoComplete="off"
        onFocus={() => {
          setOpen(true)
          setHighlight(0)
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150)
        }}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onKeyDown={handleKeyDown}
        className="order-fluid-select w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-72 overflow-y-auto rounded-xl border border-cyan-100 bg-white shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">ไม่พบน้ำยาตามคำค้นหา</div>
          ) : (
            filtered.map((option, i) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  window.clearTimeout(blurTimer.current)
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 border-b border-slate-100 last:border-b-0 ${i === highlight ? 'combo-option-active' : 'hover:bg-cyan-50'}`}
              >
                <span className="block text-sm font-medium text-slate-800">{option.value}</span>
                {option.meta && <span className="block text-xs text-slate-500 mt-0.5">{option.meta}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
