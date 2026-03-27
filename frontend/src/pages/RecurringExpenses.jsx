/**
 * RecurringExpenses.jsx  — v1.7.0
 * Manage recurring expense templates (monthly rent, weekly groceries, etc.).
 * Actions: create, toggle active/inactive, edit, delete, generate now.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { recurringApi, categoriesApi } from '../api/index'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const FREQ_LABEL = { daily: '📅 Daily', weekly: '📆 Weekly', monthly: '🗓 Monthly' }
const FREQ_OPTIONS = ['daily', 'weekly', 'monthly']

const today = () => new Date().toISOString().split('T')[0]

function emptyForm() {
  return { amount: '', description: '', notes: '', category_id: '', frequency: 'monthly', next_date: today() }
}

export default function RecurringExpenses() {
  const [items,      setItems]      = useState([])
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [editItem,   setEditItem]   = useState(null)   // null = add mode
  const [form,       setForm]       = useState(emptyForm())
  const [saving,     setSaving]     = useState(false)
  const [genLoading, setGenLoading] = useState({})     // {id: bool}
  const [genResult,  setGenResult]  = useState(null)   // last generate result
  const refreshKey = useAutoRefresh(60)
  const isFirstLoad = useRef(true)   // only show spinner on very first fetch

  const expenseCategories = categories.filter(c => c.category_type === 'expense')

  const load = useCallback(async () => {
    try {
      if (isFirstLoad.current) setLoading(true)
      const [recs, cats] = await Promise.all([recurringApi.list(), categoriesApi.list()])
      setItems(recs.data)
      setCategories(cats.data)
      setError(null)
    } catch (e) {
      setError('Failed to load recurring expenses.')
    } finally {
      setLoading(false)
      isFirstLoad.current = false
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  // ── Form helpers ────────────────────────────────────────────────────────────

  function openAdd() {
    setEditItem(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      amount:      item.amount,
      description: item.description,
      notes:       item.notes || '',
      category_id: item.category_id,
      frequency:   item.frequency,
      next_date:   item.next_date,
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditItem(null)
    setForm(emptyForm())
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      amount:      parseFloat(form.amount),
      description: form.description,
      notes:       form.notes || null,
      category_id: parseInt(form.category_id),
      frequency:   form.frequency,
      next_date:   form.next_date,
    }
    try {
      if (editItem) {
        await recurringApi.update(editItem.id, payload)
      } else {
        await recurringApi.create(payload)
      }
      closeForm()
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item) {
    try {
      await recurringApi.update(item.id, { is_active: !item.is_active })
      load()
    } catch { /* ignore */ }
  }

  async function handleDelete(item) {
    if (!confirm(`Delete "${item.description}"? This won't remove already-generated expenses.`)) return
    try {
      await recurringApi.delete(item.id)
      load()
    } catch { /* ignore */ }
  }

  async function handleGenerate(item) {
    setGenLoading(g => ({ ...g, [item.id]: true }))
    setGenResult(null)
    try {
      const res = await recurringApi.generate(item.id)
      const r   = res.data
      setGenResult(
        r.generated_count === 0
          ? `✅ "${item.description}" is up to date — no entries to generate.`
          : `✅ Generated ${r.generated_count} expense${r.generated_count !== 1 ? 's' : ''} for "${item.description}".`
      )
      load()
    } catch (e) {
      setGenResult(`❌ Generate failed: ${e.response?.data?.detail || e.message}`)
    } finally {
      setGenLoading(g => ({ ...g, [item.id]: false }))
    }
  }

  async function handleGenerateAll() {
    setGenLoading(g => ({ ...g, all: true }))
    setGenResult(null)
    try {
      const res   = await recurringApi.generateAll()
      const total = res.data.reduce((s, r) => s + r.generated_count, 0)
      setGenResult(
        total === 0
          ? '✅ All recurring expenses are up to date.'
          : `✅ Generated ${total} expense${total !== 1 ? 's' : ''} across ${res.data.length} template${res.data.length !== 1 ? 's' : ''}.`
      )
      load()
    } catch (e) {
      setGenResult(`❌ Generate all failed: ${e.message}`)
    } finally {
      setGenLoading(g => ({ ...g, all: false }))
    }
  }

  // ── Category lookup ─────────────────────────────────────────────────────────
  function catFor(id) {
    return categories.find(c => c.id === id) || {}
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          🔄 Recurring Expenses
          <span className="refresh-dot" title="Auto-refreshes every 60s" />
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleGenerateAll}
            disabled={genLoading.all}
          >
            {genLoading.all ? 'Generating…' : '⚡ Generate All Due'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Recurring
          </button>
        </div>
      </div>

      {genResult && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            fontSize: '0.9rem',
            borderRadius: '10px',
          }}
        >
          {genResult}
          <button
            onClick={() => setGenResult(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="loading">Loading recurring expenses…</div>
      ) : items.length === 0 ? (
        <div className="card empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No recurring expenses yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Add templates for fixed recurring costs like rent, subscriptions, or EMIs.
          </p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: '1rem' }}>
            + Add Your First Recurring Expense
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="expenses-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Next Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const cat       = catFor(item.category_id)
                const isPast    = item.next_date < today()
                const isDue     = item.next_date <= today()
                return (
                  <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.5 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.description}</div>
                      {item.notes && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.notes}</div>
                      )}
                    </td>
                    <td>
                      <span
                        className="category-badge"
                        style={{ background: cat.color + '22', color: cat.color }}
                      >
                        {cat.emoji} {cat.name}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{Number(item.amount).toLocaleString()}</td>
                    <td>{FREQ_LABEL[item.frequency] || item.frequency}</td>
                    <td>
                      <span style={{ color: isDue && item.is_active ? 'var(--color-red)' : 'inherit', fontWeight: isDue && item.is_active ? 700 : 400 }}>
                        {item.next_date}
                        {isDue && item.is_active && ' ⚠️'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`badge ${item.is_active ? 'badge-success' : 'badge-neutral'}`}
                        onClick={() => handleToggle(item)}
                        title={item.is_active ? 'Click to pause' : 'Click to activate'}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {item.is_active ? '✅ Active' : '⏸ Paused'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {item.is_active && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleGenerate(item)}
                            disabled={genLoading[item.id]}
                            title="Generate expense entries now"
                          >
                            {genLoading[item.id] ? '…' : '⚡ Run'}
                          </button>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(item)}>✏️</button>
                        <button className="btn btn-sm btn-danger"    onClick={() => handleDelete(item)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editItem ? 'Edit Recurring Expense' : 'Add Recurring Expense'}</h3>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSave} className="form-grid">
              <div className="form-group">
                <label>Description *</label>
                <input
                  className="form-input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Monthly Rent"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Frequency *</label>
                  <select
                    className="form-input"
                    value={form.frequency}
                    onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  >
                    {FREQ_OPTIONS.map(o => (
                      <option key={o} value={o}>{FREQ_LABEL[o]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    className="form-input"
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    required
                  >
                    <option value="">Select category…</option>
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Next Date *</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.next_date}
                    onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  className="form-input"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
