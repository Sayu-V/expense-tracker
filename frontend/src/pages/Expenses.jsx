/**
 * pages/Expenses.jsx
 * -------------------
 * Full CRUD UI for expense records.
 *
 * v1.1.0 additions:
 *   - Type toggle (expense / income) in the add form
 *   - Category emoji shown in dropdowns and badges
 *   - AI auto-categorise: calls /suggest-category as user types description
 *   - Amount range filter (min / max) in filter bar
 *   - Type filter in filter bar
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { expensesApi, categoriesApi } from '../api/index'
import client from '../api/client'

// Debounce helper — avoids calling the API on every keystroke
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
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Filters
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterMinAmount, setFilterMinAmount] = useState('')
  const [filterMaxAmount, setFilterMaxAmount] = useState('')
  const [filterType, setFilterType] = useState('')

  // Add form
  const [form, setForm] = useState({
    amount: '', category_id: '', description: '', notes: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // v1.1.0 — AI suggest state
  const [suggestion, setSuggestion] = useState(null)  // { name, id, emoji }
  const debouncedDesc = useDebounce(form.description, 400)

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(() => {
    const params = {}
    if (filterCategory)   params.category_id  = filterCategory
    if (filterDateFrom)   params.date_from     = filterDateFrom
    if (filterDateTo)     params.date_to       = filterDateTo
    if (filterMinAmount)  params.min_amount    = filterMinAmount
    if (filterMaxAmount)  params.max_amount    = filterMaxAmount
    if (filterType)       params.type          = filterType
    expensesApi.list(params).then((r) => { setExpenses(r.data); setLoading(false) })
  }, [filterCategory, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount, filterType])

  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data))
    fetchExpenses()
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  // ── AI auto-categorise ───────────────────────────────────────────────────

  useEffect(() => {
    if (!debouncedDesc || debouncedDesc.trim().length < 3) {
      setSuggestion(null)
      return
    }
    // Only auto-suggest if user hasn't manually picked a category
    client.get('/expenses/suggest-category', { params: { description: debouncedDesc } })
      .then((r) => {
        if (r.data.confidence === 'high' && r.data.suggested_category_id) {
          setSuggestion({
            id:    r.data.suggested_category_id,
            name:  r.data.suggested_category_name,
            emoji: r.data.suggested_category_emoji,
          })
        } else {
          setSuggestion(null)
        }
      })
      .catch(() => setSuggestion(null))
  }, [debouncedDesc])

  const applySuggestion = () => {
    if (suggestion) {
      setForm((f) => ({ ...f, category_id: String(suggestion.id) }))
      setSuggestion(null)
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await expensesApi.create({
        amount: parseFloat(form.amount),
        category_id: parseInt(form.category_id),
        description: form.description,
        notes: form.notes || null,
        date: form.date,
        type: form.type,
      })
      setForm({
        amount: '', category_id: '', description: '', notes: '',
        date: new Date().toISOString().split('T')[0], type: 'expense',
      })
      setSuggestion(null)
      setShowForm(false)
      fetchExpenses()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    await expensesApi.delete(id)
    fetchExpenses()
  }

  const getCategoryByID = (catId) => categories.find((c) => c.id === catId)
  const getCategoryColor = (catId) => getCategoryByID(catId)?.color ?? '#888'
  const getCategoryLabel = (catId) => {
    const c = getCategoryByID(catId)
    return c ? `${c.emoji ?? ''} ${c.name}` : '—'
  }

  const clearFilters = () => {
    setFilterCategory(''); setFilterDateFrom(''); setFilterDateTo('')
    setFilterMinAmount(''); setFilterMaxAmount(''); setFilterType('')
  }

  // Totals for display
  const totalExpenses = expenses.filter((e) => e.type !== 'income').reduce((s, e) => s + e.amount, 0)
  const totalIncome   = expenses.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Expenses</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {/* ── Add Expense / Income Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>New Entry</h3>
          {error && <p style={{ color: '#dc2626', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Type toggle */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Type *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {TYPE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm({ ...form, type: opt.value })}
                    style={{
                      padding: '0.45rem 1.1rem',
                      borderRadius: '6px',
                      border: '2px solid',
                      borderColor: form.type === opt.value ? '#6366f1' : '#e5e7eb',
                      background: form.type === opt.value ? '#EEF2FF' : '#fff',
                      color: form.type === opt.value ? '#4F46E5' : '#6b7280',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Amount (₹) *</label>
              <input type="number" step="0.01" min="0.01" required
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Category *</label>
              <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji ?? ''} {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Description *</label>
              <input type="text" required maxLength={200}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What did you spend on?" />
              {/* AI suggestion pill */}
              {suggestion && !form.category_id && (
                <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#6366f1' }}>
                    🤖 Suggested: <strong>{suggestion.emoji} {suggestion.name}</strong>
                  </span>
                  <button type="button" onClick={applySuggestion}
                    style={{ fontSize: '0.75rem', padding: '2px 10px', background: '#EEF2FF', color: '#4F46E5', border: '1px solid #c7d2fe', borderRadius: '999px', cursor: 'pointer' }}>
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Date *</label>
              <input type="date" required
                value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Notes (optional)</label>
              <input type="text" maxLength={500}
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details..." />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f3f4f6', color: '#374151' }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : `Save ${form.type === 'income' ? 'Income' : 'Expense'}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji ?? ''} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
          {/* Amount range (v1.1.0) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Min Amount (₹)</label>
            <input type="number" min="0" step="0.01" placeholder="0"
              value={filterMinAmount} onChange={(e) => setFilterMinAmount(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Max Amount (₹)</label>
            <input type="number" min="0" step="0.01" placeholder="Any"
              value={filterMaxAmount} onChange={(e) => setFilterMaxAmount(e.target.value)} />
          </div>
          {/* Type filter (v1.1.0) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              <option value="expense">💸 Expenses only</option>
              <option value="income">💰 Income only</option>
            </select>
          </div>
        </div>
        <button onClick={clearFilters} style={{ background: '#f3f4f6', color: '#374151', whiteSpace: 'nowrap' }}>
          Clear filters
        </button>
      </div>

      {/* ── Expense Table ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#888' }}>
            {expenses.length} entr{expenses.length !== 1 ? 'ies' : 'y'}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#888', display: 'flex', gap: '1.25rem' }}>
            <span style={{ color: '#dc2626' }}>Expenses: ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span style={{ color: '#16a34a' }}>Income: ₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </span>
        </div>

        {loading ? (
          <p style={{ color: '#aaa' }}>Loading...</p>
        ) : expenses.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>No entries found. Add your first one!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Category</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: '#888', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{e.date}</td>
                  <td>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      background: e.type === 'income' ? '#dcfce7' : '#fee2e2',
                      color: e.type === 'income' ? '#16a34a' : '#dc2626',
                      borderRadius: '4px', padding: '2px 6px',
                    }}>
                      {e.type === 'income' ? 'INCOME' : 'EXPENSE'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td>
                    <span className="badge" style={{ background: getCategoryColor(e.category_id) + '22', color: getCategoryColor(e.category_id) }}>
                      {getCategoryLabel(e.category_id)}
                    </span>
                  </td>
                  <td style={{ color: '#aaa', fontSize: '0.85rem' }}>{e.notes || '—'}</td>
                  <td style={{
                    textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: e.type === 'income' ? '#16a34a' : 'inherit',
                  }}>
                    {e.type === 'income' ? '+' : ''}₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    <button className="btn-danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                      onClick={() => handleDelete(e.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
