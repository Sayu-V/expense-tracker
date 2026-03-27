/**
 * context/PeriodContext.jsx
 * --------------------------
 * v1.2.0 — Global period state (Week / Month / Quarter / Year).
 *
 * All pages read from this context so the period selector in the topbar
 * drives Dashboard, Expenses, and Reports simultaneously.
 *
 * Period object shape:
 *   { type: 'week'|'month'|'quarter'|'year', offset: 0 }
 *   offset: 0 = current, -1 = previous, +1 = next (capped at 0)
 *
 * Computed values derived from type + offset:
 *   dateFrom, dateTo  — ISO date strings (YYYY-MM-DD)
 *   label             — Human-readable label e.g. "Mar 2026", "Q1 2026"
 *   month, year       — For backward-compat with old API params
 */

import { createContext, useContext, useState, useMemo } from 'react'

const PeriodContext = createContext(null)

// ── Helpers ─────────────────────────────────────────────────────────────────

function toISO(d) {
  return d.toISOString().split('T')[0]
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function computePeriod(type, offset) {
  const now = new Date()
  let start, end, label, month, year

  if (type === 'week') {
    // ISO week: Monday → Sunday
    const day = now.getDay() // 0=Sun..6=Sat
    const monday = addDays(now, (day === 0 ? -6 : 1 - day) + offset * 7)
    const sunday = addDays(monday, 6)
    start = monday
    end = sunday
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    label = `${fmt(monday)} – ${fmt(sunday)}`
    month = monday.getMonth() + 1
    year = monday.getFullYear()
  } else if (type === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    start = d
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0) // last day
    label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    month = d.getMonth() + 1
    year = d.getFullYear()
  } else if (type === 'quarter') {
    const baseMonth = now.getMonth() + offset * 3
    const adjustedDate = new Date(now.getFullYear(), baseMonth, 1)
    const q = Math.floor(adjustedDate.getMonth() / 3)
    start = new Date(adjustedDate.getFullYear(), q * 3, 1)
    end = new Date(adjustedDate.getFullYear(), q * 3 + 3, 0)
    label = `Q${q + 1} ${adjustedDate.getFullYear()}`
    month = start.getMonth() + 1
    year = start.getFullYear()
  } else {
    // year
    const y = now.getFullYear() + offset
    start = new Date(y, 0, 1)
    end = new Date(y, 11, 31)
    label = String(y)
    month = now.getMonth() + 1
    year = y
  }

  return {
    type, offset,
    dateFrom: toISO(start),
    dateTo: toISO(end),
    label,
    month,
    year,
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function PeriodProvider({ children }) {
  const [type, setType] = useState('month')
  const [offset, setOffset] = useState(0)

  const period = useMemo(() => computePeriod(type, offset), [type, offset])

  const setTyp = (t) => { setType(t); setOffset(0) }
  const prev   = () => setOffset((o) => o - 1)
  const next   = () => setOffset((o) => Math.min(o + 1, 0))   // can't go to future

  return (
    <PeriodContext.Provider value={{ period, setType: setTyp, prev, next }}>
      {children}
    </PeriodContext.Provider>
  )
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriod must be used within PeriodProvider')
  return ctx
}
