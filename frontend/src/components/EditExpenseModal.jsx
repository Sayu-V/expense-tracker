/**
 * components/EditExpenseModal.jsx
 * --------------------------------
 * v1.3.0 — Edit an existing expense/income entry.
 * Uses .modal-overlay / .modal CSS already in index.css.
 *
 * Props:
 *   expense     — the expense object to edit
 *   categories  — full list of Category objects
 *   onSave(updatedExpense)  — called after successful PUT
 *   onClose()   — called to dismiss
 */

import { useState } from 'react'
import { expensesApi } from '../api/index'

const TYPE_OPTIONS = [
  { value: 'expense', label: '💸 Expense' },
  { value: 'income',  label: '💰 Income'  },
]

export default function EditExpenseModal({ expense, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    amount:      String(expense.amount),
    category_id: String(expense.category_id),
    description: expense.description,
    notes:       expense.notes || '',
    date:        expense.date,
    type:        expense.type || 'expense',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Only show categories matching the entry type
  const formCategories = categories.filter((c) => c.category_type === form.type)

  const handleTypeChange = (newType) => {
    setForm((f) => ({ ...f, type: newType, category_id: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await expensesApi.update(expense.id, {
        amount:      parseFloat(form.amount),
        category_id: parseInt(form.category_id),
        description: form.description,
        notes:       form.notes || null,
        date:        form.date,
        type:        form.type,
      })
      onSave(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Update failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Edit Entry</h2>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: '1.1rem', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'var(--color-red-bg)', color: 'var(--color-red)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.875rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Type */}
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Type</label>
            <div className="type-toggle">
              {TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  className={`type-btn${form.type === opt.value ? ` active-${opt.value}` : ''}`}
                  onClick={() => handleTypeChange(opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="form-label">Amount (₹)</label>
            <input type="number" step="0.01" min="0.01" required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category</label>
            <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select {form.type} category…</option>
              {formCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Description</label>
            <input type="text" required maxLength={200}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Date */}
          <div>
            <label className="form-label">Date</label>
            <input type="date" required value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <input type="text" maxLength={500} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional…" />
          </div>

          {/* Actions */}
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
