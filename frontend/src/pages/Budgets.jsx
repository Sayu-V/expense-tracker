/**
 * pages/Budgets.jsx
 * ------------------
 * v1.3.0: Period-aware — month/year driven by PeriodContext.
 * v1.4.0: Auto-refresh every 30 s.
 * v1.5.0:
 *   - Edit button per budget row → modal to change amount
 *   - Delete button per budget row (with confirmation)
 *   - Bulk-select checkboxes + "Delete selected" action
 *   - Export CSV button
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { budgetsApi, categoriesApi } from '../api/index'
import { usePeriod } from '../context/PeriodContext'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { exportCsv } from '../utils/exportCsv'

// ── Edit Budget Modal ─────────────────────────────────────────────────────────
function EditBudgetModal({ budget, onSave, onClose }) {
  const [amount, setAmount] = useState(String(budget.budgeted))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError('Amount must be greater than 0'); return }
    setSaving(true); setError('')
    try {
      await budgetsApi.update(budget.budget_id, { amount: val })
      onSave()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update budget')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Edit Budget — {budget.category_name}</div>
        {error && (
          <div style={{ background: 'var(--color-red-bg)', color: 'var(--color-red)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">New Budget Amount (₹)</label>
            <input
              type="number" step="0.01" min="1" autoFocus
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Budgets() {
  const { period }  = usePeriod()
  const navigate    = useNavigate()
  const refreshKey  = useAutoRefresh()

  const [budgetStatus, setBudgetStatus] = useState([])
  const [categories,   setCategories]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [form,         setForm]         = useState({ category_id: '', amount: '' })
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')
  const [editTarget,   setEditTarget]   = useState(null)   // BudgetStatus row
  const [selected,     setSelected]     = useState(new Set())  // selected budget_ids

  const fetchStatus = () => {
    setLoading(true)
    budgetsApi.status({ month: period.month, year: period.year })
      .then((r) => { setBudgetStatus(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    categoriesApi.list({ category_type: 'expense' }).then((r) => setCategories(r.data))
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStatus(); setSelected(new Set()) }, [period.month, period.year, refreshKey])

  // ── Set budget form ───────────────────────────────────────────────────────
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

  // ── Delete single ─────────────────────────────────────────────────────────
  const handleDelete = async (b) => {
    if (!window.confirm(`Delete the ₹${b.budgeted.toLocaleString('en-IN')} budget for "${b.category_name}"?`)) return
    await budgetsApi.delete(b.budget_id)
    fetchStatus()
  }

  // ── Bulk select ───────────────────────────────────────────────────────────
  const allIds      = budgetStatus.map((b) => b.budget_id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(allIds))

  const toggleOne = (id) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`Delete ${selected.size} selected budget(s)?`)) return
    await budgetsApi.bulkDelete([...selected])
    setSelected(new Set())
    fetchStatus()
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExport = () => {
    exportCsv(`budgets-${period.label.replace(/\s/g, '-')}`, budgetStatus, [
      { key: 'category_name', label: 'Category' },
      { key: 'budgeted',      label: 'Budget (₹)' },
      { key: 'actual',        label: 'Actual Spend (₹)' },
      { key: 'remaining',     label: 'Remaining (₹)' },
      { key: 'percent_used',  label: '% Used' },
      { key: (b) => b.is_over_budget ? 'Yes' : 'No', label: 'Over Budget?' },
    ])
  }

  // ── Drill to expenses ─────────────────────────────────────────────────────
  const drillToCategory = (categoryId) =>
    navigate(`/expenses?category_id=${categoryId}&date_from=${period.dateFrom}&date_to=${period.dateTo}&type=expense`)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Budgets — {period.label}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {selected.size > 0 && (
            <button className="btn-danger" onClick={handleBulkDelete}>
              🗑 Delete {selected.size} selected
            </button>
          )}
          <button className="btn-secondary" onClick={handleExport} disabled={budgetStatus.length === 0}>
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      {/* ── Set Budget Form ── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="section-title">Set Budget for {period.label}</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Set or update a spending limit for any expense category.
          If one already exists it will be updated.
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
            <label className="form-label">Amount (₹)</label>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="section-title" style={{ margin: 0 }}>
            Budget vs Actual — {period.label}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '0.5rem' }}>
              click row to drill down
            </span>
          </div>
          {budgetStatus.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 'auto' }} />
              Select all
            </label>
          )}
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
              <div key={b.budget_id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selected.has(b.budget_id)}
                  onChange={() => toggleOne(b.budget_id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginTop: '0.4rem', flexShrink: 0, width: 'auto' }}
                />

                {/* Budget bar — clickable to drill down */}
                <div style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => drillToCategory(b.category_id)}
                  title="Click to see expenses in this category">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.category_color, display: 'inline-block', flexShrink: 0 }} />
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

                {/* Edit / Delete actions */}
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, marginTop: '0.1rem' }}>
                  <button className="btn-icon" title="Edit budget" onClick={(e) => { e.stopPropagation(); setEditTarget(b) }}>✏️</button>
                  <button className="btn-icon btn-danger" title="Delete budget" onClick={(e) => { e.stopPropagation(); handleDelete(b) }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editTarget && (
        <EditBudgetModal
          budget={editTarget}
          onSave={() => { setEditTarget(null); fetchStatus() }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
