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

  // Use functional updaters everywhere so rapid typing never reads stale state
  const handleField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      amount:      parseFloat(form.amount),
      category_id: parseInt(form.category_id, 10),
      description: form.description.trim(),
      notes:       (form.notes ?? '').trim() || null,
      date:        form.date,
      type:        form.type,
    }
    try {
      const res = await expensesApi.update(expense.id, payload)
      onSave(res.data)
    } catch (err) {
      // Pydantic v2 returns detail as an array of {loc, msg, type} objects.
      // Rendering a plain-object array as JSX crashes React ("Objects are not valid
      // as a React child"), which is what caused the blank screen.
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((e) => e.msg ?? JSON.stringify(e)).join(' · ')
        : (typeof detail === 'string' ? detail : null)
      setError(msg || 'Update failed. Please try again.')
    } finally {
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
              onChange={handleField('amount')} />
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category</label>
            <select required value={form.category_id} onChange={handleField('category_id')}>
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
              onChange={handleField('description')} />
          </div>

          {/* Date */}
          <div>
            <label className="form-label">Date</label>
            <input type="date" required value={form.date}
              onChange={handleField('date')} />
          </div>

          {/* Notes — full width, multi-line */}
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Notes</label>
            <textarea rows={3} maxLength={500} value={form.notes}
              onChange={handleField('notes')}
              placeholder="Optional — add any extra details, context, or reminders…"
              style={{ resize: 'vertical', minHeight: '72px', fontFamily: 'inherit', fontSize: '0.9rem' }} />
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
