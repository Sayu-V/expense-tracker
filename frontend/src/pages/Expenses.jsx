/**
 * pages/Expenses.jsx
 * -------------------
 * Full CRUD UI for expense records.
 * Features: list, filter by category/date, add form, inline delete.
 */

import { useEffect, useState } from 'react'
import { expensesApi, categoriesApi } from '../api/index'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [form, setForm] = useState({
    amount: '', category_id: '', description: '', notes: '', date: new Date().toISOString().split('T')[0],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchExpenses = () => {
    const params = {}
    if (filterCategory) params.category_id = filterCategory
    if (filterDateFrom) params.date_from = filterDateFrom
    if (filterDateTo) params.date_to = filterDateTo
    expensesApi.list(params).then((r) => { setExpenses(r.data); setLoading(false) })
  }

  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data))
    fetchExpenses()
  }, [])

  useEffect(() => { fetchExpenses() }, [filterCategory, filterDateFrom, filterDateTo])

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
      })
      setForm({ amount: '', category_id: '', description: '', notes: '', date: new Date().toISOString().split('T')[0] })
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

  const getCategoryColor = (catId) => categories.find((c) => c.id === catId)?.color ?? '#888'
  const getCategoryName = (catId) => categories.find((c) => c.id === catId)?.name ?? '—'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Expenses</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* ── Add Expense Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>New Expense</h3>
          {error && <p style={{ color: '#dc2626', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Amount (₹) *</label>
              <input type="number" step="0.01" min="0.01" required
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Category *</label>
              <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Description *</label>
              <input type="text" required maxLength={200}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What did you spend on?" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Date *</label>
              <input type="date" required
                value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Notes (optional)</label>
              <input type="text" maxLength={500}
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details..." />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f3f4f6', color: '#374151' }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
          <button onClick={() => { setFilterCategory(''); setFilterDateFrom(''); setFilterDateTo('') }}
            style={{ background: '#f3f4f6', color: '#374151', whiteSpace: 'nowrap' }}>
            Clear filters
          </button>
        </div>
      </div>

      {/* ── Expense Table ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#888' }}>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <p style={{ color: '#aaa' }}>Loading...</p>
        ) : expenses.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>No expenses found. Add your first one!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
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
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td>
                    <span className="badge" style={{ background: getCategoryColor(e.category_id) + '22', color: getCategoryColor(e.category_id) }}>
                      {getCategoryName(e.category_id)}
                    </span>
                  </td>
                  <td style={{ color: '#aaa', fontSize: '0.85rem' }}>{e.notes || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
