/**
 * pages/Expenses.jsx
 * -------------------
 * v1.3.0:
 *   - Edit button on each row → EditExpenseModal
 *   - URL query params pre-fill filters (drill-down from Dashboard)
 *   - Period-aware: default date range from PeriodContext
 *   - Category type filtering in form (expense vs income categories)
 *   - AI auto-categorise with entry_type
 *   - Amount range filter
 * v1.4.0:
 *   - Auto-refresh every 30 s via useAutoRefresh
 */

import { useEffect, useState, useCallback } from 'react'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useSearchParams } from 'react-router-dom'
import { expensesApi, categoriesApi } from '../api/index'
import { usePeriod } from '../context/PeriodContext'
import EditExpenseModal from '../components/EditExpenseModal'
import client from '../api/client'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const TYPE_OPTIONS = [
  { value: 'expense', label: '💸 Expense' },
  { value: 'income',  label: '💰 Income'  },
]

export default function Expenses() {
  const { period } = usePeriod()
  const [searchParams] = useSearchParams()
  const refreshKey = useAutoRefresh()   // v1.4.0 — auto-refresh every 30 s

  const [expenses,      setExpenses]      = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [editTarget,    setEditTarget]    = useState(null)  // expense being edited

  // ── Filters — initialised from URL params (drill-down) ────────────────────
  const [filterCategory,  setFilterCategory]  = useState(searchParams.get('category_id') || '')
  const [filterDateFrom,  setFilterDateFrom]  = useState(searchParams.get('date_from')   || period.dateFrom)
  const [filterDateTo,    setFilterDateTo]    = useState(searchParams.get('date_to')     || period.dateTo)
  const [filterMinAmount, setFilterMinAmount] = useState('')
  const [filterMaxAmount, setFilterMaxAmount] = useState('')
  const [filterType,      setFilterType]      = useState(searchParams.get('type') || '')

  // ── Add form ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    amount: '', category_id: '', description: '', notes: '',
    date: new Date().toISOString().split('T')[0], type: 'expense',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  // AI suggest
  const [suggestion,   setSuggestion]   = useState(null)
  const debouncedDesc = useDebounce(form.description, 400)

  // Category lists
  const categories     = allCategories
  const formCategories = allCategories.filter((c) => c.category_type === form.type)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(() => {
    const params = {}
    if (filterCategory)   params.category_id = filterCategory
    if (filterDateFrom)   params.date_from    = filterDateFrom
    if (filterDateTo)     params.date_to      = filterDateTo
    if (filterMinAmount)  params.min_amount   = filterMinAmount
    if (filterMaxAmount)  params.max_amount   = filterMaxAmount
    if (filterType)       params.type         = filterType
    expensesApi.list(params).then((r) => { setExpenses(r.data); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount, filterType, refreshKey])

  useEffect(() => {
    categoriesApi.list().then((r) => setAllCategories(r.data))
    fetchExpenses()
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  // ── AI suggest ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedDesc || debouncedDesc.trim().length < 3) { setSuggestion(null); return }
    client.get('/expenses/suggest-category', { params: { description: debouncedDesc, entry_type: form.type } })
      .then((r) => {
        if (r.data.confidence === 'high' && r.data.suggested_category_id) {
          setSuggestion({ id: r.data.suggested_category_id, name: r.data.suggested_category_name, emoji: r.data.suggested_category_emoji })
        } else { setSuggestion(null) }
      })
      .catch(() => setSuggestion(null))
  }, [debouncedDesc, form.type])

  const applySuggestion = () => {
    if (suggestion) { setForm((f) => ({ ...f, category_id: String(suggestion.id) })); setSuggestion(null) }
  }

  // ── Submit add form ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      await expensesApi.create({
        amount: parseFloat(form.amount), category_id: parseInt(form.category_id),
        description: form.description, notes: form.notes || null,
        date: form.date, type: form.type,
      })
      setForm({ amount: '', category_id: '', description: '', notes: '', date: new Date().toISOString().split('T')[0], type: 'expense' })
      setSuggestion(null); setShowForm(false); fetchExpenses()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create entry')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return
    await expensesApi.delete(id)
    fetchExpenses()
  }

  const handleEditSave = () => {
    setEditTarget(null)
    fetchExpenses()
  }

  const clearFilters = () => {
    setFilterCategory(''); setFilterDateFrom(period.dateFrom); setFilterDateTo(period.dateTo)
    setFilterMinAmount(''); setFilterMaxAmount(''); setFilterType('')
  }

  const getCategoryById    = (id) => allCategories.find((c) => c.id === id)
  const getCategoryColor   = (id) => getCategoryById(id)?.color   ?? '#888'
  const getCategoryLabel   = (id) => { const c = getCategoryById(id); return c ? `${c.emoji} ${c.name}` : '—' }

  const totalExpenses = expenses.filter((e) => e.type !== 'income').reduce((s, e) => s + e.amount, 0)
  const totalIncome   = expenses.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      {/* Edit modal */}
      {editTarget && (
        <EditExpenseModal
          expense={editTarget}
          categories={allCategories}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Expenses</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {/* ── Add form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="section-title">New Entry</div>
          {error && <div style={{ background: 'var(--color-red-bg)', color: 'var(--color-red)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.875rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Type */}
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Type</label>
              <div className="type-toggle">
                {TYPE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    className={`type-btn${form.type === opt.value ? ` active-${opt.value}` : ''}`}
                    onClick={() => { setForm({ ...form, type: opt.value, category_id: '' }); setSuggestion(null) }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Amount (₹)</label>
              <input type="number" step="0.01" min="0.01" required value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>

            <div>
              <label className="form-label">Category</label>
              <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select {form.type} category…</option>
                {formCategories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Description</label>
              <input type="text" required maxLength={200} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={form.type === 'income' ? 'e.g. Monthly salary, Freelance project...' : 'What did you spend on?'} />
              {suggestion && !form.category_id && (
                <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
                    🤖 Suggested: <strong>{suggestion.emoji} {suggestion.name}</strong>
                  </span>
                  <button type="button" onClick={applySuggestion}
                    style={{ fontSize: '0.72rem', padding: '2px 10px', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '999px', cursor: 'pointer' }}>
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Date</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <div>
              <label className="form-label">Notes (optional)</label>
              <input type="text" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details…" />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : `Save ${form.type === 'income' ? 'Income' : 'Expense'}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label className="form-label">Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Min Amount (₹)</label>
            <input type="number" min="0" step="0.01" placeholder="0" value={filterMinAmount} onChange={(e) => setFilterMinAmount(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Max Amount (₹)</label>
            <input type="number" min="0" step="0.01" placeholder="Any" value={filterMaxAmount} onChange={(e) => setFilterMaxAmount(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              <option value="expense">💸 Expenses only</option>
              <option value="income">💰 Income only</option>
            </select>
          </div>
        </div>
        <button className="btn-secondary" onClick={clearFilters}>Clear filters</button>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {expenses.length} entr{expenses.length !== 1 ? 'ies' : 'y'}
          </span>
          <span style={{ fontSize: '0.82rem', display: 'flex', gap: '1.25rem' }}>
            <span style={{ color: 'var(--color-red)' }}>Expenses: ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span style={{ color: 'var(--color-green)' }}>Income: +₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </span>
        </div>

        {loading ? (
          <div className="loading">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            No entries found. Try adjusting the filters.
          </div>
        ) : (
          <div className="table-scroll-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Category</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{e.date}</td>
                  <td>
                    <span className={`badge badge-${e.type}`}>
                      {e.type === 'income' ? '💰 Income' : '💸 Expense'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td>
                    <span className="badge" style={{ background: getCategoryColor(e.category_id) + '22', color: getCategoryColor(e.category_id) }}>
                      {getCategoryLabel(e.category_id)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>{e.notes || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: e.type === 'income' ? 'var(--color-green)' : 'var(--text-primary)' }}>
                    {e.type === 'income' ? '+' : ''}₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button className="btn-icon" title="Edit" onClick={() => setEditTarget(e)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>✏️</button>
                      <button className="btn-danger" title="Delete" onClick={() => handleDelete(e.id)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
