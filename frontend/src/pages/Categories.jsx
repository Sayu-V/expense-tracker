/**
 * pages/Categories.jsx
 * ---------------------
 * v1.3.0 — Manage categories: view, edit (name/emoji/color), delete custom,
 * and create new expense or income categories.
 *
 * Default categories (is_default=true) can be edited but not deleted.
 */

import { useEffect, useState } from 'react'
import { categoriesApi } from '../api/index'

const COLOR_PRESETS = [
  '#f97316','#3b82f6','#8b5cf6','#10b981','#ec4899',
  '#f59e0b','#6b7280','#059669','#0891b2','#7c3aed',
  '#db2777','#16a34a','#ca8a04','#dc2626','#9333ea',
]

const EMOJI_PRESETS = [
  '🍔','🚗','🏠','💊','🎬','🛒','📦','💼','👛','💻',
  '🚀','📊','📈','🎁','🏘️','☕','✈️','📚','🎮','💇',
  '🐾','💡','🔧','🎵','🏋️','🍕','🎯','💰','🌿','🛍️',
]

// ── Edit Category Modal ───────────────────────────────────────────────────────
function EditCategoryModal({ category, onSave, onClose }) {
  const [name,  setName]  = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji || '💰')
  const [color, setColor] = useState(category.color)
  const [customColor, setCustomColor] = useState(category.color)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      const res = await categoriesApi.update(category.id, { name, emoji, color })
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
          <h2 className="modal-title" style={{ margin: 0 }}>Edit Category</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div style={{ background: 'var(--color-red-bg)', color: 'var(--color-red)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Name</label>
            <input type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Emoji picker */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.5rem' }}>
              {EMOJI_PRESETS.map((em) => (
                <button key={em} type="button"
                  onClick={() => setEmoji(em)}
                  style={{
                    width: '36px', height: '36px', fontSize: '1.1rem', borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${emoji === em ? 'var(--accent)' : 'var(--border)'}`,
                    background: emoji === em ? 'var(--accent-light)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                  }}>
                  {em}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current:</span>
              <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
              <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)}
                style={{ width: '80px', textAlign: 'center', fontSize: '1.1rem' }}
                maxLength={10} placeholder="or type" />
            </div>
          </div>

          {/* Color picker */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '0.5rem' }}>
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button"
                  onClick={() => { setColor(c); setCustomColor(c) }}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: c, border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                  }} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input type="color" value={customColor}
                onChange={(e) => { setCustomColor(e.target.value); setColor(e.target.value) }}
                style={{ width: '44px', height: '36px', padding: '2px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
              <input type="text" value={color} maxLength={7} placeholder="#6366f1"
                onChange={(e) => { setColor(e.target.value); setCustomColor(e.target.value) }}
                style={{ width: '100px', fontFamily: 'monospace' }} />
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, display: 'inline-block', border: '1px solid var(--border)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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

// ── Add Category Modal ────────────────────────────────────────────────────────
function AddCategoryModal({ onSave, onClose }) {
  const [name,          setName]         = useState('')
  const [emoji,         setEmoji]        = useState('💰')
  const [color,         setColor]        = useState('#6366f1')
  const [categoryType,  setCategoryType] = useState('expense')
  const [submitting,    setSubmitting]   = useState(false)
  const [error,         setError]        = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      const res = await categoriesApi.create({ name, emoji, color, category_type: categoryType })
      onSave(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create category')
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>New Category</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div style={{ background: 'var(--color-red-bg)', color: 'var(--color-red)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Type */}
          <div>
            <label className="form-label">Category Type</label>
            <div className="type-toggle">
              <button type="button" className={`type-btn${categoryType === 'expense' ? ' active-expense' : ''}`}
                onClick={() => setCategoryType('expense')}>💸 Expense</button>
              <button type="button" className={`type-btn${categoryType === 'income' ? ' active-income' : ''}`}
                onClick={() => setCategoryType('income')}>💰 Income</button>
            </div>
          </div>

          <div>
            <label className="form-label">Name</label>
            <input type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dining Out" />
          </div>

          <div>
            <label className="form-label">Emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.5rem' }}>
              {EMOJI_PRESETS.slice(0, 20).map((em) => (
                <button key={em} type="button"
                  onClick={() => setEmoji(em)}
                  style={{ width: '34px', height: '34px', fontSize: '1rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${emoji === em ? 'var(--accent)' : 'var(--border)'}`, background: emoji === em ? 'var(--accent-light)' : 'var(--bg-surface)', cursor: 'pointer' }}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '0.5rem' }}>
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button"
                  onClick={() => setColor(c)}
                  style={{ width: '26px', height: '26px', borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                style={{ width: '40px', height: '34px', padding: '2px', cursor: 'pointer' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{color}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [editTarget, setEditTarget] = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [activeTab,  setActiveTab]  = useState('expense')  // 'expense' | 'income'

  const fetchCategories = () => {
    categoriesApi.list().then((r) => { setCategories(r.data); setLoading(false) })
  }

  useEffect(() => { fetchCategories() }, [])

  const handleDelete = async (cat) => {
    if (cat.is_default) return  // shouldn't be reachable, but guard anyway
    if (!window.confirm(`Delete "${cat.name}"? Expenses in this category will lose their category reference.`)) return
    await categoriesApi.delete(cat.id)
    fetchCategories()
  }

  const handleEditSave = () => { setEditTarget(null); fetchCategories() }
  const handleAddSave  = () => { setShowAdd(false);   fetchCategories() }

  const filtered = categories.filter((c) => c.category_type === activeTab)

  return (
    <div>
      {editTarget && <EditCategoryModal category={editTarget} onSave={handleEditSave} onClose={() => setEditTarget(null)} />}
      {showAdd    && <AddCategoryModal onSave={handleAddSave} onClose={() => setShowAdd(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Categories</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ New Category</button>
      </div>

      {/* Tabs */}
      <div className="period-selector" style={{ marginBottom: '1.25rem', display: 'inline-flex' }}>
        <button className={`period-btn${activeTab === 'expense' ? ' active' : ''}`} onClick={() => setActiveTab('expense')}>
          💸 Expense ({categories.filter((c) => c.category_type === 'expense').length})
        </button>
        <button className={`period-btn${activeTab === 'income' ? ' active' : ''}`} onClick={() => setActiveTab('income')}>
          💰 Income ({categories.filter((c) => c.category_type === 'income').length})
        </button>
      </div>

      {/* Category cards */}
      {loading ? (
        <div className="loading">Loading categories…</div>
      ) : (
        <div className="grid-3">
          {filtered.map((cat) => (
            <div key={cat.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Category preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', flexShrink: 0,
                }}>
                  {cat.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{cat.color}</span>
                    {cat.is_default && (
                      <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '0.65rem' }}>
                        default
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem 0' }}
                  onClick={() => setEditTarget(cat)}>
                  ✏️ Edit
                </button>
                {!cat.is_default && (
                  <button className="btn-danger" style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem 0' }}
                    onClick={() => handleDelete(cat)}>
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
