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
 * v1.7.0:
 *   - Savings Goals section: shows up to 3 active goals with progress bars + projected dates
 * v1.8.0:
 *   - Smart Insights Feed: 3 new rules — daily burn rate, savings rate, year-over-year
 *   - Year-over-Year grouped bar chart: this year vs last year by month
 *   - Predicted Month-End Spend card: linear extrapolation from daily rate
 */

import { useEffect, useState } from 'react'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useChartTheme } from '../hooks/useChartTheme'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, Treemap,
} from 'recharts'
import { reportsApi, budgetsApi, expensesApi, insightsApi, goalsApi } from '../api/index'
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
  const [goals,          setGoals]           = useState([])
  const [yoyData,        setYoyData]         = useState([])   // v1.8.0
  const [prediction,     setPrediction]      = useState(null) // v1.8.0
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
      goalsApi.list(),
      reportsApi.yearOverYear({ year: period.year }),   // v1.8.0
      reportsApi.prediction({ month: period.month, year: period.year }), // v1.8.0
    ])
      .then(([sum, prevSum, cat, tr, budget, recent, ins, goalsRes, yoy, pred]) => {
        setSummary(sum.data)
        setPrevSummary(prevSum.data)
        setBreakdown(cat.data)
        setTrend(tr.data)
        setBudgetStatus(budget.data)
        setRecentExpenses(recent.data)
        setInsights(ins.data)
        setGoals(goalsRes.data ?? [])
        setYoyData(yoy.data ?? [])     // v1.8.0
        setPrediction(pred.data ?? null) // v1.8.0
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

        {/* Spend by Category — Pie (≤6) or Treemap (>6) */}
        <div className="card">
          <div className="section-title">
            Spend by Category
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '0.5rem' }}>
              {breakdown.length > 6 ? 'tile size = spend amount' : 'click a slice to drill down'}
            </span>
          </div>
          {breakdown.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              No expenses in this period.
            </div>
          ) : breakdown.length <= 6 ? (
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
                  itemStyle={ct.tooltipItemStyle}
                  labelStyle={ct.tooltipLabelStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            /* Treemap for 7+ categories */
            <ResponsiveContainer width="100%" height={230}>
              <Treemap
                data={breakdown.map(b => ({
                  name: b.category_name,
                  size: b.total,
                  color: b.category_color,
                  category_id: b.category_id,
                  percentage: b.percentage,
                }))}
                dataKey="size"
                stroke="#fff"
                onClick={(node) => node.category_id && drillToCategory(node.category_id)}
                style={{ cursor: 'pointer' }}
                content={({ x, y, width, height, name, size, color, percentage }) => {
                  const showLabel = width > 50 && height > 30
                  const showAmt   = width > 70 && height > 48
                  return (
                    <g>
                      <rect
                        x={x} y={y} width={width} height={height}
                        style={{ fill: color, stroke: '#fff', strokeWidth: 2, opacity: 0.88 }}
                      />
                      {showLabel && (
                        <text x={x + width / 2} y={y + height / 2 - (showAmt ? 8 : 0)}
                          textAnchor="middle" dominantBaseline="middle"
                          style={{ fontSize: Math.min(13, width / 6), fontWeight: 600, fill: '#fff', pointerEvents: 'none' }}>
                          {name}
                        </text>
                      )}
                      {showAmt && (
                        <text x={x + width / 2} y={y + height / 2 + 10}
                          textAnchor="middle" dominantBaseline="middle"
                          style={{ fontSize: Math.min(11, width / 7), fill: 'rgba(255,255,255,0.85)', pointerEvents: 'none' }}>
                          {percentage}%
                        </text>
                      )}
                    </g>
                  )
                }}
              >
                <Tooltip
                  formatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                  contentStyle={ct.tooltipStyle}
                  itemStyle={ct.tooltipItemStyle}
                  labelStyle={ct.tooltipLabelStyle}
                />
              </Treemap>
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
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={ct.tooltipStyle} itemStyle={ct.tooltipItemStyle} labelStyle={ct.tooltipLabelStyle} />
              <Legend wrapperStyle={ct.legendStyle} />
              <Line type="monotone" dataKey="total"  name="Expenses" stroke={ct.colorRed}   strokeWidth={2} dot={{ r: 4, fill: ct.colorRed }} />
              <Line type="monotone" dataKey="income" name="Income"   stroke={ct.colorGreen} strokeWidth={2} dot={{ r: 4, fill: ct.colorGreen }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2b (v1.8.0): Predicted Spend card + YoY comparison chart ── */}
      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>

        {/* Prediction card */}
        {prediction && (
          <div className="card">
            <div className="section-title">📈 Predicted Month-End Spend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              {/* Progress bar: spent so far vs predicted */}
              {prediction.predicted_total > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <span>Spent so far</span>
                    <span>{Math.round((prediction.spent_so_far / prediction.predicted_total) * 100)}% of predicted</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((prediction.spent_so_far / prediction.predicted_total) * 100))}%`,
                      background: 'var(--accent)',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Spent so far</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-red)' }}>
                    ₹{prediction.spent_so_far.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    Day {prediction.days_elapsed} of {prediction.days_in_month}
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Predicted total</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ₹{prediction.predicted_total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    ₹{prediction.daily_rate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day avg
                  </div>
                </div>
              </div>

              {/* Predicted net */}
              <div style={{
                padding: '0.6rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                background: prediction.predicted_net >= 0 ? 'var(--color-green-bg, rgba(16,185,129,0.08))' : 'var(--color-red-bg)',
                color: prediction.predicted_net >= 0 ? 'var(--color-green)' : 'var(--color-red)',
                fontSize: '0.84rem',
                fontWeight: 600,
              }}>
                {prediction.predicted_net >= 0
                  ? `✅ Projected surplus of ₹${prediction.predicted_net.toLocaleString('en-IN', { maximumFractionDigits: 0 })} by month end`
                  : `⚠️ Projected deficit of ₹${Math.abs(prediction.predicted_net).toLocaleString('en-IN', { maximumFractionDigits: 0 })} by month end`}
              </div>
            </div>
          </div>
        )}

        {/* Year-over-Year grouped bar chart */}
        {yoyData.length > 0 && (
          <div className="card">
            <div className="section-title">
              📊 Year-over-Year Comparison
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                {new Date().getFullYear()} vs {new Date().getFullYear() - 1}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={yoyData} margin={{ left: 0, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.border} />
                <XAxis dataKey="label" tick={ct.tickSm} />
                <YAxis tick={ct.tickSm} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                  contentStyle={ct.tooltipStyle}
                  itemStyle={ct.tooltipItemStyle}
                  labelStyle={ct.tooltipLabelStyle}
                />
                <Legend wrapperStyle={ct.legendStyle} />
                <Bar dataKey="this_year" name={`${new Date().getFullYear()}`} fill={ct.accent}      radius={[3, 3, 0, 0]} />
                <Bar dataKey="last_year" name={`${new Date().getFullYear() - 1}`} fill={ct.barBudgetFill} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
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
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={ct.tooltipStyle} itemStyle={ct.tooltipItemStyle} labelStyle={ct.tooltipLabelStyle} />
              <Legend wrapperStyle={ct.legendStyle} />
              <Bar dataKey="budgeted" name="Budget" fill={ct.barBudgetFill} radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual"   name="Actual" fill={ct.accent}       radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 4: Savings Goals ── */}
      {goals.filter((g) => !g.is_completed).length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="section-title" style={{ margin: 0 }}>🏆 Savings Goals</span>
            <button className="btn-icon" onClick={() => navigate('/goals')} style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
              View all →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {goals.filter((g) => !g.is_completed).slice(0, 3).map((g) => {
              const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
              const isOverdue = g.deadline && new Date(g.deadline) < new Date() && !g.is_completed
              const barColor = pct >= 100 ? 'var(--color-green)' : isOverdue ? 'var(--color-red)' : 'var(--accent)'
              return (
                <div key={g.id}
                  onClick={() => navigate('/goals')}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>{g.name}</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: barColor, marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>{pct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', marginBottom: '0.6rem', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: barColor, transition: 'width 0.4s ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>₹{g.current_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} saved</span>
                    <span>of ₹{g.target_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>

                  {g.projected_completion_date && pct < 100 && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: isOverdue ? 'var(--color-red)' : 'var(--text-tertiary)' }}>
                      {isOverdue ? '⚠️ Overdue · ' : '📅 On track · '}Est. {g.projected_completion_date}
                    </div>
                  )}
                  {g.deadline && !g.projected_completion_date && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: isOverdue ? 'var(--color-red)' : 'var(--text-tertiary)' }}>
                      {isOverdue ? '⚠️ Deadline passed: ' : '🎯 Deadline: '}{g.deadline}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Row 5: Recent Expenses + Insights ── */}
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
