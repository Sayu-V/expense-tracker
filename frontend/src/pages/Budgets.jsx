/**
 * pages/Budgets.jsx
 * ------------------
 * v1.3.0: Period-aware — month/year driven by PeriodContext.
 * Budget status and form adapt to whichever month the topbar selector is on.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { budgetsApi, categoriesApi } from '../api/index'
import { usePeriod } from '../context/PeriodContext'

export default function Budgets() {
  const { period } = usePeriod()
  const navigate   = useNavigate()

  const [budgetStatus, setBudgetStatus] = useState([])
  const [categories,   setCategories]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [form,         setForm]         = useState({ category_id: '', amount: '' })
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')

  const fetchStatus = () => {
    setLoading(true)
    budgetsApi.status({ month: period.month, year: period.year })
      .then((r) => { setBudgetStatus(r.data); setLoading(false) })
  }

  useEffect(() => {
    categoriesApi.list({ category_type: 'expense' }).then((r) => setCategories(r.data))
  }, [])

  useEffect(() => { fetchStatus() }, [period.month, period.year])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError(''); setSuccess('')
    try {
      await budgetsApi.set({
        category_id: parseInt(form.category_id),
        amount:      parseFloat(form.amount),
        month:       period.month,
        year:        period.year,
      })
      setForm({ category_id: '', amount: '' })
      setSuccess(`Budget saved for ${period.label}!`)
      fetchStatus()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save budget')
    } finally { setSubmitting(false) }
  }

  const drillToCategory = (categoryId) => {
    navigate(`/expenses?category_id=${categoryId}&date_from=${period.dateFrom}&date_to=${period.dateTo}&type=expense`)
  }

  return (
    <div>
      <h1 className="page-title">Budgets — {period.label}</h1>

      {/* ── Set Budget Form ── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="section-title">Set Budget for {period.label}</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Set or update a spending limit for any expense category.
          Applies to <strong>{period.label}</strong>. If one already exists it will be updated.
        </p>

        {error   && <div style={{ background: 'var(--color-red-bg)',   color: 'var(--color-red)',   borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.875rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div style={{ background: 'var(--color-green-bg)', color: 'var(--color-green)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.875rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '160px' }}>
            <label className="form-label">Category</label>
            <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select expense category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label className="form-label">Budget Amount (₹)</label>
            <input type="number" step="0.01" min="1" required value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 5000" />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting} style={{ whiteSpace: 'nowrap', marginBottom: 0 }}>
            {submitting ? 'Saving…' : 'Set Budget'}
          </button>
        </form>
      </div>

      {/* ── Budget Status ── */}
      <div className="card">
        <div className="section-title">
          Budget vs Actual — {period.label}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '0.5rem' }}>
            click a row to drill down
          </span>
        </div>

        {loading ? (
          <div className="loading">Loading…</div>
        ) : budgetStatus.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            No budgets set for {period.label}. Use the form above to add one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {budgetStatus.map((b) => (
              <div key={b.category_id} style={{ cursor: 'pointer' }}
                onClick={() => drillToCategory(b.category_id)}
                title="Click to see all expenses in this category">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.category_color, display: 'inline-block' }} />
                    <span style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{b.category_name}</span>
                    {b.is_over_budget && <span className="badge badge-expense">Over budget</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{b.actual.toLocaleString('en-IN')}</span>
                    <span> / ₹{b.budgeted.toLocaleString('en-IN')}</span>
                    <span style={{ marginLeft: '0.5rem', color: b.is_over_budget ? 'var(--color-red)' : 'var(--text-tertiary)' }}>
                      ({b.percent_used}%)
                    </span>
                  </div>
                </div>

                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${Math.min(b.percent_used, 100)}%`,
                    background: b.is_over_budget ? 'var(--color-red)' : b.percent_used >= 80 ? 'var(--color-orange)' : b.category_color,
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  <span>Spent: ₹{b.actual.toLocaleString('en-IN')}</span>
                  <span style={{ color: b.remaining < 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
                    {b.remaining >= 0
                      ? `₹${b.remaining.toLocaleString('en-IN')} remaining`
                      : `₹${Math.abs(b.remaining).toLocaleString('en-IN')} over budget`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
