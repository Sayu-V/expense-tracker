/**
 * pages/Dashboard.jsx
 * --------------------
 * v1.3.0:
 *   - Period-aware: all API calls use dateFrom/dateTo from PeriodContext
 *   - Drill-down: click pie slice, bar, or "Recent Expenses" → /expenses with pre-filters
 *   - Income line on Trend chart
 *   - Quote of the Day
 *   - Income / Net Balance cards
 * v1.4.0:
 *   - Auto-refresh every 30 s via useAutoRefresh hook (pauses when tab hidden)
 * v1.6.0:
 *   - All Recharts props use useChartTheme() for dark/light mode correctness
 */

import { useEffect, useState } from 'react'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useChartTheme } from '../hooks/useChartTheme'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts'
import { reportsApi, budgetsApi, expensesApi, insightsApi } from '../api/index'
import { usePeriod } from '../context/PeriodContext'
import { getRandomQuote } from '../data/quotes'

const SEVERITY_ICON  = { info: 'ℹ️', warning: '⚠️', alert: '🚨' }
const SEVERITY_CLASS = { info: 'severity-info', warning: 'severity-warning', alert: 'severity-alert' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { period } = usePeriod()
  const refreshKey = useAutoRefresh()   // v1.4.0 — auto-refresh every 30 s
  const ct = useChartTheme()            // v1.6.0 — reactive chart colours

  const [summary,        setSummary]        = useState(null)
  const [prevSummary,    setPrevSummary]     = useState(null)
  const [breakdown,      setBreakdown]       = useState([])
  const [trend,          setTrend]           = useState([])
  const [budgetStatus,   setBudgetStatus]    = useState([])
  const [recentExpenses, setRecentExpenses]  = useState([])
  const [insights,       setInsights]        = useState([])
  const [loading,        setLoading]         = useState(true)

  // Quote — stable for the lifetime of this mount
  const [quote] = useState(() => getRandomQuote())

  // ── Data fetch — re-runs on period change OR auto-refresh tick ────────────
  useEffect(() => {
    setLoading(true)

    // Previous period: shift by one period-width back
    // For display purposes we use the month before date_from
    const prevDate = new Date(period.dateFrom)
    prevDate.setDate(prevDate.getDate() - 1)  // day before current period start
    const prevMonthDate = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1)
    const prevMonth = prevMonthDate.getMonth() + 1
    const prevYear  = prevMonthDate.getFullYear()

    Promise.all([
      reportsApi.monthlySummary({ date_from: period.dateFrom, date_to: period.dateTo, period_label: period.label }),
      reportsApi.monthlySummary({ month: prevMonth, year: prevYear }),
      reportsApi.byCategory({ date_from: period.dateFrom, date_to: period.dateTo }),
      reportsApi.trend({ months: 6 }),
      budgetsApi.status({ month: period.month, year: period.year }),
      expensesApi.list({ date_from: period.dateFrom, date_to: period.dateTo, limit: 10 }),
      insightsApi.list(),
    ])
      .then(([sum, prevSum, cat, tr, budget, recent, ins]) => {
        setSummary(sum.data)
        setPrevSummary(prevSum.data)
        setBreakdown(cat.data)
        setTrend(tr.data)
        setBudgetStatus(budget.data)
        setRecentExpenses(recent.data)
        setInsights(ins.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.dateFrom, period.dateTo, refreshKey])

  // ── Drill-down helpers ────────────────────────────────────────────────────
  const drillToCategory = (categoryId) => {
    navigate(`/expenses?category_id=${categoryId}&date_from=${period.dateFrom}&date_to=${period.dateTo}`)
  }

  const drillToAll = () => {
    navigate(`/expenses?date_from=${period.dateFrom}&date_to=${period.dateTo}`)
  }

  const drillToExpenses = () => {
    navigate(`/expenses?date_from=${period.dateFrom}&date_to=${period.dateTo}&type=expense`)
  }

  const drillToIncome = () => {
    navigate(`/expenses?date_from=${period.dateFrom}&date_to=${period.dateTo}&type=income`)
  }

  // MoM % change
  const momChange = summary && prevSummary && prevSummary.total_spend > 0
    ? (((summary.total_spend - prevSummary.total_spend) / prevSummary.total_spend) * 100).toFixed(1)
    : null

  const netBalance = summary?.net_balance ?? 0
  const netColor   = netBalance >= 0 ? 'var(--color-green)' : 'var(--color-red)'
  const netIcon    = netBalance >= 0 ? '▲' : '▼'

  if (loading) return <div className="loading">Loading dashboard…</div>

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {/* ── Quote of the Day ── */}
      <div className="quote-card">
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💬</span>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.55 }}>
            "{quote.text}"
          </p>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
            — {quote.author}
          </p>
        </div>
      </div>

      {/* ── Row 1: Metric cards ── */}
      <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
        {/* Total Spend — clickable drill-down */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={drillToExpenses}
          title="Click to view all expenses for this period">
          <div className="metric-label">Total Spend</div>
          <div className="metric-value" style={{ color: 'var(--color-red)' }}>
            ₹{summary?.total_spend?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
          </div>
          {momChange !== null && (
            <div className="metric-sub" style={{ color: parseFloat(momChange) > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
              {parseFloat(momChange) > 0 ? '▲' : '▼'} {Math.abs(momChange)}% vs prev period
            </div>
          )}
          <div className="metric-sub" style={{ marginTop: '0.35rem', color: 'var(--accent)', fontSize: '0.72rem' }}>
            Tap to drill down →
          </div>
        </div>

        {/* Total Income — clickable */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={drillToIncome}
          title="Click to view all income for this period">
          <div className="metric-label">Total Income</div>
          <div className="metric-value" style={{ color: 'var(--color-green)' }}>
            ₹{summary?.total_income?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
          </div>
          <div className="metric-sub">This {period.type}</div>
          <div className="metric-sub" style={{ marginTop: '0.35rem', color: 'var(--accent)', fontSize: '0.72rem' }}>
            Tap to drill down →
          </div>
        </div>

        {/* Net Balance */}
        <div className="card">
          <div className="metric-label">Net Balance</div>
          <div className="metric-value" style={{ color: netColor }}>
            {netIcon} ₹{Math.abs(netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="metric-sub" style={{ color: netColor }}>
            {netBalance >= 0 ? 'Surplus' : 'Overspent'}
          </div>
        </div>

        {/* Transactions */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={drillToAll}
          title="Click to see all entries">
          <div className="metric-label">Transactions</div>
          <div className="metric-value">{summary?.expense_count ?? '—'}</div>
          <div className="metric-sub">Avg ₹{summary?.avg_expense?.toFixed(0) ?? '—'} / entry</div>
          <div className="metric-sub" style={{ marginTop: '0.35rem', color: 'var(--accent)', fontSize: '0.72rem' }}>
            Tap to drill down →
          </div>
        </div>
      </div>

      {/* ── Row 2: Charts ── */}
      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>

        {/* Pie — each slice is clickable */}
        <div className="card">
          <div className="section-title">
            Spend by Category
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '0.5rem' }}>
              click a slice to drill down
            </span>
          </div>
          {breakdown.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              No expenses in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%" cy="50%"
                  outerRadius={88}
                  cursor="pointer"
                  onClick={(entry) => drillToCategory(entry.category_id)}
                  label={({ category_name, percentage }) => `${category_name} ${percentage}%`}
                  labelLine={{ stroke: ct.labelLineStroke }}
                >
                  {breakdown.map((entry) => (
                    <Cell key={entry.category_id} fill={entry.category_color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                  contentStyle={ct.tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Trend line — income + expense */}
        <div className="card">
          <div className="section-title">Monthly Trend (6 months)</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.border} />
              <XAxis dataKey="label" tick={ct.tickSm} />
              <YAxis tick={ct.tickSm} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={ct.tooltipStyle} />
              <Legend wrapperStyle={ct.legendStyle} />
              <Line type="monotone" dataKey="total"  name="Expenses" stroke={ct.colorRed}   strokeWidth={2} dot={{ r: 4, fill: ct.colorRed }} />
              <Line type="monotone" dataKey="income" name="Income"   stroke={ct.colorGreen} strokeWidth={2} dot={{ r: 4, fill: ct.colorGreen }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Budget vs Actual — bars are clickable ── */}
      {budgetStatus.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="section-title">
            Budget vs Actual
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '0.5rem' }}>
              click a bar to drill down to that category
            </span>
          </div>
          <ResponsiveContainer width="100%" height={budgetStatus.length * 52 + 40}>
            <BarChart
              layout="vertical"
              data={budgetStatus}
              margin={{ left: 80 }}
              onClick={(data) => {
                if (data?.activePayload?.[0]) {
                  drillToCategory(data.activePayload[0].payload.category_id)
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={ct.border} />
              <XAxis type="number" tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} tick={ct.tickSm} />
              <YAxis type="category" dataKey="category_name" tick={ct.tickMd} width={75} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={ct.tooltipStyle} />
              <Legend wrapperStyle={ct.legendStyle} />
              <Bar dataKey="budgeted" name="Budget" fill={ct.accentLight} radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual"   name="Actual" fill={ct.accent}      radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 4: Recent Expenses + Insights ── */}
      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="section-title" style={{ margin: 0 }}>Recent Entries</span>
            <button className="btn-icon" onClick={drillToAll} style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
              View all →
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              No entries in this period.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.slice(0, 8).map((e) => (
                  <tr key={e.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => drillToCategory(e.category_id)}
                    title="Click to see all entries in this category">
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{e.date}</td>
                    <td>
                      {e.type === 'income' && (
                        <span className="badge badge-income" style={{ marginRight: '5px', fontSize: '0.65rem' }}>IN</span>
                      )}
                      {e.description}
                    </td>
                    <td>
                      <span className="badge" style={{ background: e.category?.color + '22', color: e.category?.color }}>
                        {e.category?.emoji} {e.category?.name ?? '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: e.type === 'income' ? 'var(--color-green)' : 'var(--text-primary)' }}>
                      {e.type === 'income' ? '+' : ''}₹{e.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="section-title">AI Insights</div>
          {insights.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🤖</div>
              No insights yet. Add some expenses to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `4px solid ${ins.severity === 'alert' ? 'var(--color-red)' : ins.severity === 'warning' ? 'var(--color-orange)' : 'var(--color-blue)'}`,
                  background: ins.severity === 'alert' ? 'var(--color-red-bg)' : ins.severity === 'warning' ? 'var(--color-orange-bg)' : 'var(--color-blue-bg)',
                  cursor: ins.category_id ? 'pointer' : 'default',
                }}
                  onClick={() => ins.category_id && drillToCategory(ins.category_id)}
                  title={ins.category_id ? 'Click to drill down to this category' : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span>{SEVERITY_ICON[ins.severity]}</span>
                    <div>
                      <span className={`badge ${SEVERITY_CLASS[ins.severity]}`} style={{ marginBottom: '0.25rem', display: 'inline-block' }}>
                        {ins.type.replace(/_/g, ' ')}
                      </span>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', margin: 0 }}>{ins.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
