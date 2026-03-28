/**
 * Goals.jsx  — v1.7.0
 * Savings Goal Tracker — set goals, track progress, see projected completion.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { goalsApi } from '../api/index'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const today = () => new Date().toISOString().split('T')[0]

function emptyForm() {
  return { name: '', description: '', target_amount: '', current_amount: '0', deadline: '' }
}

// ── Progress ring SVG ────────────────────────────────────────────────────────
function ProgressRing({ percent, size = 80, stroke = 7, color = '#5E5CE6' }) {
  const r  = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const filled = circ * Math.min(percent, 100) / 100

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  )
}

// ── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onEdit, onDelete, onAddSavings }) {
  const pct      = goal.percent_complete
  const ringColor = goal.is_completed ? '#34C759' : pct >= 75 ? '#5E5CE6' : pct >= 40 ? '#f59e0b' : '#FF3B30'

  function daysLabel() {
    if (goal.is_completed) return '🏆 Completed!'
    if (goal.days_remaining === null) return null
    if (goal.days_remaining === 0) return '⏰ Due today!'
    if (goal.days_remaining < 0) return `⚠️ ${Math.abs(goal.days_remaining)}d overdue`
    return `${goal.days_remaining} days left`
  }

  function projLabel() {
    if (goal.is_completed || !goal.projected_completion_date) return null
    const d = new Date(goal.projected_completion_date)
    const str = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    // Compare projected vs deadline
    if (goal.deadline) {
      const diff = (new Date(goal.projected_completion_date) - new Date(goal.deadline)) / 86400000
      if (diff > 0) return `📅 Projected: ${str} (${Math.round(diff)}d late)`
      if (diff < 0) return `📅 Projected: ${str} (${Math.abs(Math.round(diff))}d early)`
    }
    return `📅 Projected: ${str}`
  }

  const days  = daysLabel()
  const proj  = projLabel()

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        opacity: goal.is_completed ? 0.8 : 1,
        border: goal.is_completed ? '2px solid var(--color-green)' : '1.5px solid var(--border)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <ProgressRing percent={pct} color={ringColor} />
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: ringColor,
            }}
          >
            {pct.toFixed(0)}%
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{goal.name}</h3>
            {goal.is_completed && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-green)', background: '#34C75918', borderRadius: '4px', padding: '1px 6px' }}>
                ✅ Done
              </span>
            )}
          </div>
          {goal.description && (
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {goal.description}
            </p>
          )}
          {days && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{days}</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
          <button className="btn btn-sm btn-secondary" onClick={() => onAddSavings(goal)} title="Add savings">＋</button>
          <button className="btn btn-sm btn-secondary" onClick={() => onEdit(goal)} title="Edit">✏️</button>
          <button className="btn btn-sm btn-danger"    onClick={() => onDelete(goal)} title="Delete">🗑</button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(pct, 100)}%`,
              background: ringColor,
              borderRadius: 99,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>₹{Number(goal.current_amount).toLocaleString()} saved</span>
          <span>₹{Number(goal.remaining_amount).toLocaleString()} remaining</span>
          <span>Target: ₹{Number(goal.target_amount).toLocaleString()}</span>
        </div>
      </div>

      {proj && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
          {proj}
        </div>
      )}
    </div>
  )
}

// ── Add Savings Modal ────────────────────────────────────────────────────────
function AddSavingsModal({ goal, onClose, onSave }) {
  const [amount,  setAmount]  = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    const add = parseFloat(amount)
    if (!add || add <= 0) return
    setSaving(true)
    await onSave(goal.id, Math.min(goal.current_amount + add, goal.target_amount * 2))
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">Add Savings — {goal.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave} className="form-grid">
          <div className="form-group">
            <label>Current: ₹{Number(goal.current_amount).toLocaleString()} / ₹{Number(goal.target_amount).toLocaleString()}</label>
            <input
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount to add (₹)"
              autoFocus
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '+ Add Savings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Goals() {
  const [goals,        setGoals]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [showForm,     setShowForm]     = useState(false)
  const [editGoal,     setEditGoal]     = useState(null)
  const [form,         setForm]         = useState(emptyForm())
  const [saving,       setSaving]       = useState(false)
  const [savingsModal, setSavingsModal] = useState(null)  // goal object
  const [filter,       setFilter]       = useState('all') // all | active | completed
  const refreshKey = useAutoRefresh(60_000)  // 60 s — was 60 ms causing hundreds of requests/min
  const isFirstLoad = useRef(true)   // only show spinner on very first fetch

  const load = useCallback(async () => {
    try {
      if (isFirstLoad.current) setLoading(true)
      const res = await goalsApi.list()
      setGoals(res.data)
      setError(null)
    } catch {
      setError('Failed to load goals.')
    } finally {
      setLoading(false)
      isFirstLoad.current = false
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalTarget  = goals.reduce((s, g) => s + g.target_amount,  0)
  const totalSaved   = goals.reduce((s, g) => s + g.current_amount, 0)
  const completedCnt = goals.filter(g => g.is_completed).length

  // ── Filtered list ──────────────────────────────────────────────────────────
  const displayed = goals.filter(g =>
    filter === 'all'       ? true
    : filter === 'active'  ? !g.is_completed
    : g.is_completed
  )

  // ── Form helpers ───────────────────────────────────────────────────────────
  function openAdd() { setEditGoal(null); setForm(emptyForm()); setShowForm(true) }

  function openEdit(goal) {
    setEditGoal(goal)
    setForm({
      name:           goal.name,
      description:    goal.description || '',
      target_amount:  goal.target_amount,
      current_amount: goal.current_amount,
      deadline:       goal.deadline || '',
    })
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditGoal(null); setForm(emptyForm()) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name:           form.name,
      description:    form.description || null,
      target_amount:  parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      deadline:       form.deadline || null,
    }
    try {
      if (editGoal) {
        await goalsApi.update(editGoal.id, payload)
      } else {
        await goalsApi.create(payload)
      }
      closeForm()
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(goal) {
    if (!confirm(`Delete goal "${goal.name}"?`)) return
    try { await goalsApi.delete(goal.id); load() } catch { /* ignore */ }
  }

  async function handleAddSavings(goalId, newAmount) {
    try {
      await goalsApi.update(goalId, { current_amount: newAmount })
      setSavingsModal(null)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Update failed')
    }
  }

  // ── Summary cards ──────────────────────────────────────────────────────────
  const overallPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏆 Goals</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ New Goal</button>
      </div>

      {/* Summary strip */}
      {goals.length > 0 && (
        <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
          <div className="card metric-card">
            <div className="metric-label">Total Goals</div>
            <div className="metric-value">{goals.length}</div>
            <div className="metric-sub">{completedCnt} completed</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Total Saved</div>
            <div className="metric-value" style={{ color: 'var(--color-green)' }}>
              ₹{totalSaved.toLocaleString()}
            </div>
            <div className="metric-sub">of ₹{totalTarget.toLocaleString()}</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Overall Progress</div>
            <div className="metric-value" style={{ color: 'var(--accent)' }}>
              {overallPct.toFixed(0)}%
            </div>
            <div className="metric-sub" style={{ paddingTop: '0.25rem' }}>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${overallPct}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.5s' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {/* Filter tabs */}
      {goals.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {['all', 'active', 'completed'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'active' ? '🔥 Active' : '✅ Completed'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading goals…</div>
      ) : displayed.length === 0 ? (
        <div className="card empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
          <h3 style={{ marginBottom: '0.5rem' }}>
            {goals.length === 0 ? 'No goals yet' : `No ${filter} goals`}
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {goals.length === 0
              ? 'Set a savings goal and track your progress towards it.'
              : `Switch the filter to see other goals.`}
          </p>
          {goals.length === 0 && (
            <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: '1rem' }}>
              + Create Your First Goal
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayed.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddSavings={(g) => setSavingsModal(g)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editGoal ? 'Edit Goal' : 'New Savings Goal'}</h3>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSave} className="form-grid">
              <div className="form-group">
                <label>Goal Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Emergency Fund, Europe Trip"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  className="form-input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description…"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Amount (₹) *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.target_amount}
                    onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Already Saved (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.current_amount}
                    onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Deadline (optional)</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add savings modal */}
      {savingsModal && (
        <AddSavingsModal
          goal={savingsModal}
          onClose={() => setSavingsModal(null)}
          onSave={handleAddSavings}
        />
      )}
    </div>
  )
}
