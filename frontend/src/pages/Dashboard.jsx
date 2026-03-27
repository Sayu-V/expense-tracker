/**
 * pages/Dashboard.jsx
 * --------------------
 * Main dashboard with data widgets:
 *   1. Finance Quote of the Day      (v1.1.0)
 *   2. Total Spend / Income / Net Balance metric cards  (v1.1.0 extended)
 *   3. Transactions / Avg per Expense / Categories Used
 *   4. Spend by Category (Pie chart)
 *   5. Monthly Trend (Line chart)
 *   6. Budget vs Actual (Horizontal bar chart)
 *   7. Recent Expenses (table — shows type badge)
 *   8. AI Insights panel
 */

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts'
import { reportsApi, budgetsApi, expensesApi, insightsApi } from '../api/index'
import { getRandomQuote } from '../data/quotes'

const SEVERITY_CLASS = {
  info: 'severity-info',
  warning: 'severity-warning',
  alert: 'severity-alert',
}

const SEVERITY_ICON = { info: 'ℹ️', warning: '⚠️', alert: '🚨' }

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [prevSummary, setPrevSummary] = useState(null)
  const [breakdown, setBreakdown] = useState([])
  const [trend, setTrend] = useState([])
  const [budgetStatus, setBudgetStatus] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)

  // v1.1.0: Quote of the day — picked once on mount
  const [quote] = useState(() => getRandomQuote())

  useEffect(() => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    Promise.all([
      reportsApi.monthlySummary({ month, year }),
      reportsApi.monthlySummary({ month: prevMonth, year: prevYear }),
      reportsApi.byCategory({ month, year }),
      reportsApi.trend({ months: 6 }),
      budgetsApi.status({ month, year }),
      expensesApi.list({ limit: 10 }),
      insightsApi.list(),
    ]).then(([sum, prevSum, cat, tr, budget, recent, ins]) => {
      setSummary(sum.data)
      setPrevSummary(prevSum.data)
      setBreakdown(cat.data)
      setTrend(tr.data)
      setBudgetStatus(budget.data)
      setRecentExpenses(recent.data)
      setInsights(ins.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Month-over-month % change (expenses only)
  const momChange = summary && prevSummary && prevSummary.total_spend > 0
    ? (((summary.total_spend - prevSummary.total_spend) / prevSummary.total_spend) * 100).toFixed(1)
    : null

  if (loading) {
    return <div style={{ padding: '3rem', color: '#888' }}>Loading dashboard...</div>
  }

  // Net balance colour
  const netBalance = summary?.net_balance ?? 0
  const netColor = netBalance >= 0 ? '#16a34a' : '#dc2626'
  const netIcon = netBalance >= 0 ? '▲' : '▼'

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {/* ── Quote of the Day ── */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
        borderRadius: '12px',
        borderLeft: '4px solid #6366f1',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💬</span>
        <div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{quote.text}"
          </p>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#6366f1', fontWeight: 600 }}>
            — {quote.author}
          </p>
        </div>
      </div>

      {/* ── Row 1: Metric cards ── */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {/* Total Spend */}
        <div className="card">
          <div className="metric-label">Total Spend</div>
          <div className="metric-value" style={{ color: '#dc2626' }}>
            ₹{summary?.total_spend?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
          </div>
          {momChange !== null && (
            <div className="metric-sub" style={{ color: momChange > 0 ? '#dc2626' : '#16a34a' }}>
              {momChange > 0 ? '▲' : '▼'} {Math.abs(momChange)}% vs last month
            </div>
          )}
        </div>

        {/* Total Income (v1.1.0) */}
        <div className="card">
          <div className="metric-label">Total Income</div>
          <div className="metric-value" style={{ color: '#16a34a' }}>
            ₹{summary?.total_income?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—'}
          </div>
          <div className="metric-sub">This month</div>
        </div>

        {/* Net Balance (v1.1.0) */}
        <div className="card">
          <div className="metric-label">Net Balance</div>
          <div className="metric-value" style={{ color: netColor }}>
            {netIcon} ₹{Math.abs(netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="metric-sub" style={{ color: netColor }}>
            {netBalance >= 0 ? 'In surplus' : 'Overspent'}
          </div>
        </div>

        {/* Transactions */}
        <div className="card">
          <div className="metric-label">Transactions</div>
          <div className="metric-value">{summary?.expense_count ?? '—'}</div>
          <div className="metric-sub">Expenses this month</div>
        </div>
      </div>

      {/* ── Row 1b: secondary metric cards ── */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="metric-label">Avg per Expense</div>
          <div className="metric-value">₹{summary?.avg_expense?.toFixed(0) ?? '—'}</div>
          <div className="metric-sub">This month</div>
        </div>
        <div className="card">
          <div className="metric-label">Categories Used</div>
          <div className="metric-value">{breakdown.length}</div>
          <div className="metric-sub">This month</div>
        </div>
      </div>

      {/* ── Row 2: Pie + Line ── */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Spend by Category</h3>
          {breakdown.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No expenses this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={breakdown} dataKey="total" nameKey="category_name" cx="50%" cy="50%" outerRadius={85} label={({ category_name, percentage }) => `${category_name} ${percentage}%`}>
                  {breakdown.map((entry) => (
                    <Cell key={entry.category_id} fill={entry.category_color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Monthly Trend (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Budget vs Actual ── */}
      {budgetStatus.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Budget vs Actual</h3>
          <ResponsiveContainer width="100%" height={budgetStatus.length * 52 + 40}>
            <BarChart layout="vertical" data={budgetStatus} margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="category_name" tick={{ fontSize: 12 }} width={75} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              <Legend />
              <Bar dataKey="budgeted" name="Budget" fill="#e0e7ff" radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 4: Recent expenses + Insights ── */}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Recent Expenses</h3>
          {recentExpenses.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No expenses yet.</p>
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
                {recentExpenses.slice(0, 10).map((e) => (
                  <tr key={e.id}>
                    <td style={{ color: '#888', fontSize: '0.8rem' }}>{e.date}</td>
                    <td>
                      {e.type === 'income' && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, background: '#dcfce7',
                          color: '#16a34a', borderRadius: '4px', padding: '1px 5px',
                          marginRight: '5px', verticalAlign: 'middle',
                        }}>IN</span>
                      )}
                      {e.description}
                    </td>
                    <td>
                      <span className="badge" style={{ background: e.category?.color + '22', color: e.category?.color }}>
                        {e.category?.emoji ?? ''} {e.category?.name ?? '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: e.type === 'income' ? '#16a34a' : 'inherit' }}>
                      {e.type === 'income' ? '+' : ''}₹{e.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>AI Insights</h3>
          {insights.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No insights yet. Add some expenses to get started.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${ins.severity === 'alert' ? '#dc2626' : ins.severity === 'warning' ? '#d97706' : '#0ea5e9'}`,
                  background: ins.severity === 'alert' ? '#fff5f5' : ins.severity === 'warning' ? '#fffbeb' : '#f0f9ff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>{SEVERITY_ICON[ins.severity]}</span>
                    <div>
                      <span className={`badge ${SEVERITY_CLASS[ins.severity]}`} style={{ marginBottom: '0.3rem', display: 'inline-block' }}>
                        {ins.type.replace(/_/g, ' ')}
                      </span>
                      <p style={{ fontSize: '0.85rem', color: '#374151', margin: 0 }}>{ins.message}</p>
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
