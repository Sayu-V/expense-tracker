/**
 * pages/Budgets.jsx
 * ------------------
 * Monthly budget management UI.
 * Shows current month budgets with actual vs budgeted progress bars.
 * Lets user set/update budgets per category.
 */

import { useEffect, useState } from 'react'
import { budgetsApi, categoriesApi } from '../api/index'

export default function Budgets() {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [budgetStatus, setBudgetStatus] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ category_id: '', amount: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchStatus = () => {
    budgetsApi.status({ month: currentMonth, year: currentYear })
      .then((r) => { setBudgetStatus(r.data); setLoading(false) })
  }

  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data))
    fetchStatus()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await budgetsApi.set({
        category_id: parseInt(form.category_id),
        amount: parseFloat(form.amount),
        month: currentMonth,
        year: currentYear,
      })
      setForm({ category_id: '', amount: '' })
      setSuccess('Budget saved!')
      fetchStatus()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save budget')
    } finally {
      setSubmitting(false)
    }
  }

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div>
      <h1 className="page-title">Budgets — {monthLabel}</h1>

      {/* ── Set Budget Form ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Set Monthly Budget</h3>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
          Set or update a budget for any category for {monthLabel}. If a budget already exists, it will be updated.
        </p>
        {error && <p style={{ color: '#dc2626', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>}
        {success && <p style={{ color: '#16a34a', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{success}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Category *</label>
            <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Budget Amount (₹) *</label>
            <input type="number" step="0.01" min="1" required
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 5000" />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting} style={{ whiteSpace: 'nowrap', marginBottom: '0' }}>
            {submitting ? 'Saving...' : 'Set Budget'}
          </button>
        </form>
      </div>

      {/* ── Budget Status ── */}
      <div className="card">
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Budget vs Actual — {monthLabel}</h3>

        {loading ? (
          <p style={{ color: '#aaa' }}>Loading...</p>
        ) : budgetStatus.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>
            No budgets set for this month. Use the form above to add one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {budgetStatus.map((b) => (
              <div key={b.category_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: b.category_color, display: 'inline-block'
                    }} />
                    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{b.category_name}</span>
                    {b.is_over_budget && (
                      <span className="badge severity-alert">Over budget</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#555', textAlign: 'right' }}>
                    <span style={{ fontWeight: 600 }}>₹{b.actual.toLocaleString('en-IN')}</span>
                    <span style={{ color: '#aaa' }}> / ₹{b.budgeted.toLocaleString('en-IN')}</span>
                    <span style={{ marginLeft: '0.5rem', color: b.is_over_budget ? '#dc2626' : '#888' }}>
                      ({b.percent_used}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: '#f3f4f6', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(b.percent_used, 100)}%`,
                    height: '100%',
                    background: b.is_over_budget ? '#dc2626' : b.percent_used >= 80 ? '#d97706' : b.category_color,
                    borderRadius: '99px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.78rem', color: '#aaa' }}>
                  <span>Spent: ₹{b.actual.toLocaleString('en-IN')}</span>
                  <span style={{ color: b.remaining < 0 ? '#dc2626' : '#16a34a' }}>
                    {b.remaining >= 0
                      ? `₹${b.remaining.toLocaleString('en-IN')} remaining`
                      : `₹${Math.abs(b.remaining).toLocaleString('en-IN')} over`}
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
