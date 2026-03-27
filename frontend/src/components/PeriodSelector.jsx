/**
 * components/PeriodSelector.jsx
 * ------------------------------
 * v1.3.0 — Segmented period control + prev/next navigation.
 * Uses CSS classes already defined in index.css:
 *   .period-selector, .period-btn, .period-nav, .period-nav-btn, .period-label-text
 *
 * Props: none — reads/writes via usePeriod() context.
 */

import { usePeriod } from '../context/PeriodContext'

const PERIODS = [
  { key: 'week',    label: 'Week'    },
  { key: 'month',   label: 'Month'   },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year',    label: 'Year'    },
]

export default function PeriodSelector() {
  const { period, setType, prev, next } = usePeriod()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {/* Type tabs */}
      <div className="period-selector">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`period-btn${period.type === p.key ? ' active' : ''}`}
            onClick={() => setType(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="period-nav">
        <button className="period-nav-btn" onClick={prev} title="Previous period">‹</button>
        <span className="period-label-text">{period.label}</span>
        <button
          className="period-nav-btn"
          onClick={next}
          disabled={period.offset >= 0}
          style={{ opacity: period.offset >= 0 ? 0.35 : 1 }}
          title="Next period"
        >
          ›
        </button>
      </div>
    </div>
  )
}
