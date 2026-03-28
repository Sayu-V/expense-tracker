/**
 * ImportRules.jsx
 * ---------------
 * v2.1.0 — Import Rules management page.
 *
 * Three tabs:
 *   📋 My Rules          — list, create, edit, delete, toggle, retroactive
 *   🔄 How It Works      — classification waterfall + feature explainers
 *   👁️ Live Preview Sim  — interactive sample showing rule engine output
 */

import { useState, useEffect } from 'react'
import { categoriesApi } from '../api/index'
import client from '../api/client'

// ── API ───────────────────────────────────────────────────────────────────────
const rulesApi = {
  list:        ()         => client.get('/import-rules'),
  create:      (data)     => client.post('/import-rules', data),
  update:      (id, data) => client.put(`/import-rules/${id}`, data),
  delete:      (id)       => client.delete(`/import-rules/${id}`),
  retroactive: (id)       => client.post(`/import-rules/${id}/retroactive`),
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CONDITION_FIELDS = [
  { value: 'description', label: 'Description' },
  { value: 'amount',      label: 'Amount (₹)'  },
  { value: 'direction',   label: 'Direction'   },
]

const OPERATORS_BY_FIELD = {
  description: [
    { value: 'contains',     label: 'contains'         },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with',  label: 'starts with'      },
  ],
  amount: [
    { value: 'gt',  label: 'greater than' },
    { value: 'gte', label: 'at least'     },
    { value: 'lt',  label: 'less than'    },
    { value: 'lte', label: 'at most'      },
    { value: 'eq',  label: 'equal to'     },
  ],
  direction: [
    { value: 'eq', label: 'is' },
  ],
}

const DIRECTION_VALUES = [
  { value: 'credit', label: 'Credit (deposit / income)' },
  { value: 'debit',  label: 'Debit (withdrawal / expense)' },
]

const TRANSACTION_TYPES = ['expense', 'income', 'investment', 'transfer']

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  padding: '7px 10px', borderRadius: 7,
  border: '1px solid var(--color-border)',
  background: 'var(--color-input)',
  color: 'var(--color-text)',
  fontSize: '0.84rem',
  width: '100%',
}

const labelStyle = {
  display: 'flex', flexDirection: 'column',
  fontSize: '0.78rem', fontWeight: 600,
  color: 'var(--color-text)',
  gap: 4,
}

const sectionLabel = {
  fontSize: '0.7rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
  margin: '1rem 0 0.5rem',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyCondition = () => ({ field: 'description', operator: 'contains', value: '' })
const emptyAction    = () => ({ action: 'set_type', value: 'expense' })

function conditionLabel(c) {
  const ops = { contains: 'contains', not_contains: "doesn't contain", starts_with: 'starts with',
                gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=' }
  const op  = ops[c.operator] || c.operator
  const val = c.field === 'direction' ? (c.value === 'credit' ? 'Credit' : 'Debit') : c.value
  return `${c.field} ${op} "${val}"`
}

function actionLabel(a, categories) {
  if (a.action === 'set_type')     return `type = ${a.value}`
  if (a.action === 'set_category') {
    const cat = categories.find(c => String(c.id) === String(a.value))
    return `category = ${cat ? `${cat.emoji} ${cat.name}` : a.value}`
  }
  if (a.action === 'rename') return `rename → "${a.value}"`
  if (a.action === 'skip')   return 'skip (exclude)'
  return a.action
}

// ── Pill components ───────────────────────────────────────────────────────────
function IfPill({ children }) {
  return (
    <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 999, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
      {children}
    </span>
  )
}
function LogicPill({ children }) {
  return (
    <span style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc', borderRadius: 999, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
      {children}
    </span>
  )
}
function ThenPill({ skip, rename, children }) {
  const s = skip
    ? { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' }
    : rename
    ? { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' }
    : { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' }
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 999, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
      {children}
    </span>
  )
}

// ── ConditionRow ──────────────────────────────────────────────────────────────
function ConditionRow({ cond, index, onChange, onRemove, logic, onLogicChange }) {
  const operators = OPERATORS_BY_FIELD[cond.field] || []
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      {index > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          {['OR', 'AND'].map(l => (
            <button key={l} onClick={() => onLogicChange(l)} style={{
              padding: '2px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
              border: '1px solid var(--color-border)', cursor: 'pointer',
              background: logic === l ? '#6366f1' : 'var(--color-card)',
              color: logic === l ? '#fff' : 'var(--color-text)',
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>between conditions</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '130px 160px 1fr auto', gap: '0.4rem', alignItems: 'center' }}>
        <select value={cond.field} onChange={e => onChange(index, 'field', e.target.value)} style={inputStyle}>
          {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select value={cond.operator} onChange={e => onChange(index, 'operator', e.target.value)} style={inputStyle}>
          {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {cond.field === 'direction' ? (
          <select value={cond.value} onChange={e => onChange(index, 'value', e.target.value)} style={inputStyle}>
            {DIRECTION_VALUES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        ) : (
          <input value={cond.value} onChange={e => onChange(index, 'value', e.target.value)}
            placeholder={cond.field === 'amount' ? '10000' : 'ZOMATO'} style={inputStyle} />
        )}
        <button onClick={() => onRemove(index)}
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 6px', lineHeight: 1 }}>
          ✕
        </button>
      </div>
    </div>
  )
}

// ── ActionRow ─────────────────────────────────────────────────────────────────
function ActionRow({ action, index, onChange, onRemove, categories }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr auto', gap: '0.4rem', alignItems: 'center', marginBottom: '0.5rem' }}>
      <select value={action.action} onChange={e => onChange(index, 'action', e.target.value)} style={inputStyle}>
        <option value="set_type">Set type to</option>
        <option value="set_category">Set category to</option>
        <option value="rename">Rename description to</option>
        <option value="skip">Skip (exclude from import)</option>
      </select>

      {action.action === 'set_type' && (
        <select value={action.value} onChange={e => onChange(index, 'value', e.target.value)} style={inputStyle}>
          {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      )}
      {action.action === 'set_category' && (
        <select value={action.value || ''} onChange={e => onChange(index, 'value', e.target.value)} style={inputStyle}>
          <option value="">— select category —</option>
          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.emoji} {c.name}</option>)}
        </select>
      )}
      {action.action === 'rename' && (
        <input value={action.value || ''} onChange={e => onChange(index, 'value', e.target.value)}
          placeholder="e.g. Streaming Subscription" style={inputStyle} />
      )}
      {action.action === 'skip' && (
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '6px 10px' }}>
          Transaction will be excluded from import
        </span>
      )}

      <button onClick={() => onRemove(index)}
        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 6px', lineHeight: 1 }}>
        ✕
      </button>
    </div>
  )
}

// ── RuleForm ──────────────────────────────────────────────────────────────────
function RuleForm({ initial, categories, onSave, onCancel }) {
  const [name,       setName]       = useState(initial?.name || '')
  const [priority,   setPriority]   = useState(initial?.priority ?? 5)
  const [logic,      setLogic]      = useState(initial?.condition_logic || 'OR')
  const [conditions, setConditions] = useState(initial?.conditions?.length ? initial.conditions : [emptyCondition()])
  const [actions,    setActions]    = useState(initial?.actions?.length    ? initial.actions    : [emptyAction()])
  const [retro,      setRetro]      = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  const updateCond = (i, field, val) => {
    setConditions(prev => prev.map((c, idx) => {
      if (idx !== i) return c
      const updated = { ...c, [field]: val }
      if (field === 'field') {
        updated.operator = OPERATORS_BY_FIELD[val]?.[0]?.value || 'contains'
        updated.value    = val === 'direction' ? 'credit' : ''
      }
      return updated
    }))
  }

  const updateAction = (i, field, val) => {
    setActions(prev => prev.map((a, idx) => {
      if (idx !== i) return a
      const updated = { ...a, [field]: val }
      if (field === 'action') updated.value = val === 'set_type' ? 'expense' : ''
      return updated
    }))
  }

  const handleSubmit = async () => {
    if (!name.trim())       { setError('Rule name is required'); return }
    if (!conditions.length) { setError('Add at least one condition'); return }
    if (!actions.length)    { setError('Add at least one action'); return }
    setSaving(true); setError(null)
    try {
      await onSave({ name: name.trim(), priority: Number(priority), condition_logic: logic, conditions, actions, apply_retroactive: retro })
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'var(--color-card)', border: '2px solid #6366f1', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(99,102,241,0.12)' }}>
      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#6366f1', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {initial ? '✏️ Edit Rule' : '✚ Create Categorisation Rule'}
      </div>

      {/* Name + Priority */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <label style={labelStyle}>
          Rule Name *
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Zomato → Food & Dining" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Priority <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(1 = highest)</span>
          <input type="number" value={priority} min="1" max="100"
            onChange={e => setPriority(e.target.value)} style={inputStyle} />
        </label>
      </div>

      {/* Conditions */}
      <div style={sectionLabel}>IF — Conditions
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
          (logic between conditions: {logic})
        </span>
      </div>
      {conditions.map((c, i) => (
        <ConditionRow key={i} cond={c} index={i}
          onChange={updateCond}
          onRemove={i => setConditions(prev => prev.filter((_, idx) => idx !== i))}
          logic={logic} onLogicChange={setLogic} />
      ))}
      <button onClick={() => setConditions(prev => [...prev, emptyCondition()])}
        style={{ padding: '5px 14px', borderRadius: 7, border: '1px dashed #6366f1', background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
        + Add condition
      </button>

      {/* Actions */}
      <div style={{ ...sectionLabel, marginTop: '1.25rem' }}>THEN — Actions</div>
      {actions.map((a, i) => (
        <ActionRow key={i} action={a} index={i} categories={categories}
          onChange={updateAction}
          onRemove={i => setActions(prev => prev.filter((_, idx) => idx !== i))} />
      ))}
      <button onClick={() => setActions(prev => [...prev, emptyAction()])}
        style={{ padding: '5px 14px', borderRadius: 7, border: '1px dashed #6366f1', background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
        + Add action
      </button>

      {/* Retroactive */}
      <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-bg, #f9fafb)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>Apply retroactively?</div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.83rem', cursor: 'pointer', color: 'var(--color-text)' }}>
            <input type="radio" name="retro-scope" checked={!retro} onChange={() => setRetro(false)} />
            Future imports only
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.83rem', cursor: 'pointer', color: 'var(--color-text)' }}>
            <input type="radio" name="retro-scope" checked={retro} onChange={() => setRetro(true)} />
            All existing transactions too
          </label>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.6rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: '0.83rem', marginTop: '0.75rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={onCancel}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', fontWeight: 600, color: 'var(--color-text)' }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
          {saving ? 'Saving…' : '💾 Save Rule'}
        </button>
      </div>
    </div>
  )
}

// ── RuleCard ──────────────────────────────────────────────────────────────────
function RuleCard({ rule, categories, onEdit, onDelete, onToggle }) {
  const [retro, setRetro] = useState(null)

  const handleRetro = async () => {
    setRetro({ loading: true })
    try {
      const res = await rulesApi.retroactive(rule.id)
      setRetro({ count: res.data.updated_count })
    } catch {
      setRetro({ error: true })
    }
  }

  const isActive = rule.is_active

  return (
    <div style={{
      background: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderLeft: `4px solid ${isActive ? '#6366f1' : 'var(--color-border)'}`,
      borderRadius: 10,
      padding: '1rem 1.25rem',
      marginBottom: '0.75rem',
      opacity: isActive ? 1 : 0.6,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.65rem' }}>
        <span style={{ color: 'var(--color-text-muted)', cursor: 'grab', fontSize: '1.1rem', lineHeight: 1, marginTop: 2 }}>⠿</span>
        <span style={{
          background: isActive ? '#6366f1' : '#9ca3af',
          color: '#fff', width: 24, height: 24, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, marginTop: 1,
        }}>
          {rule.priority}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>{rule.name}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-card-alt, #f9fafb)', border: '1px solid var(--color-border)', borderRadius: 999, padding: '1px 8px', fontWeight: 600 }}>
              Priority {rule.priority}
            </span>
            {!isActive && (
              <span style={{ fontSize: '0.72rem', background: '#f3f4f6', color: '#6b7280', borderRadius: 999, padding: '1px 8px', fontWeight: 600 }}>
                Disabled
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {rule.match_count > 0
              ? `Matched ${rule.match_count} times${rule.last_matched_at ? ` · last: ${new Date(rule.last_matched_at).toLocaleDateString('en-IN')}` : ''}`
              : 'No matches yet'}
          </div>
        </div>
        {/* Toggle switch — uses .toggle-switch CSS class from index.css */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <label className="toggle-switch">
            <input type="checkbox" checked={isActive} onChange={() => onToggle(rule)} />
            <span className="track" />
            <span className="knob" />
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{isActive ? 'On' : 'Off'}</span>
        </div>
      </div>

      {/* Condition + action pills */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.65rem' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IF</span>
        {rule.conditions.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            {i > 0 && <LogicPill>{rule.condition_logic}</LogicPill>}
            <IfPill>{conditionLabel(c)}</IfPill>
          </span>
        ))}
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', margin: '0 2px' }}>→</span>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>THEN</span>
        {rule.actions.map((a, i) => (
          <ThenPill key={i} skip={a.action === 'skip'} rename={a.action === 'rename'}>
            {actionLabel(a, categories)}
          </ThenPill>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {rule.match_count > 0
            ? `✅ ${rule.match_count} transactions matched`
            : isActive ? 'No matches yet' : '⏸ Rule is disabled'}
        </span>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {retro?.loading && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Applying…</span>}
          {retro?.count !== undefined && <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>✓ {retro.count} updated</span>}
          {retro?.error && <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>Apply failed</span>}

          <button onClick={handleRetro} disabled={!!retro?.loading} title="Re-classify all existing transactions matching this rule"
            style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text)' }}>
            🔄 Apply existing
          </button>
          <button onClick={() => onEdit(rule)}
            style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text)' }}>
            Edit
          </button>
          <button onClick={() => onDelete(rule)}
            style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#dc2626' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── HowItWorks tab ────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: 1, title: 'User-defined Rules (highest priority)', desc: 'Rules are checked in priority order (1 → n). The first rule whose conditions all match wins immediately — no further passes run.', bg: '#eff6ff', numBg: '#2563eb', arrow: '↓ no rule matched' },
    { num: 2, title: 'Income Source matching', desc: "Description checked against your saved Income Sources (e.g. Rahul Sharma → Rent). When matched, overrides built-in rules with high confidence.", bg: '#faf5ff', numBg: '#7c3aed', arrow: '↓ no source matched' },
    { num: 3, title: 'Built-in keyword rules', desc: '50+ merchant patterns: ZOMATO→Food, AMAZON→Shopping, UPI/DR→Expense, SALARY→Income, SWEEP IN→Investment, and more.', bg: '#f0fdf4', numBg: '#16a34a', arrow: '↓ no keyword matched' },
    { num: 4, title: 'Heuristics + large deposit check', desc: 'Debit column → Expense. Credit column → Income. Large unclassified credits (≥ ₹10,000) are flagged with ⚠️ for your review.', bg: '#fffbeb', numBg: '#d97706', arrow: '↓ still ambiguous' },
    { num: 5, title: 'Flag for manual review', desc: 'Row shown with ⚠️ in the preview table. You pick type + category before confirming the import.', bg: '#fef2f2', numBg: '#dc2626', arrow: null },
  ]

  return (
    <div>
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
          How each transaction is classified during import
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, i) => (
            <div key={i}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.85rem 1rem', borderRadius: 10, background: step.bg }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.numBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem', flexShrink: 0, marginTop: 1 }}>
                  {step.num}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem', color: '#111827' }}>{step.title}</div>
                  <div style={{ fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.55 }}>{step.desc}</div>
                </div>
              </div>
              {step.arrow && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem', padding: '0.3rem 0', fontStyle: 'italic' }}>
                  {step.arrow}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Feature callouts */}
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ padding: '1rem', background: 'var(--color-bg, #f9fafb)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--color-text)' }}>🔁 Retroactive application</div>
            <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
              When creating or editing a rule, select <em>"All existing transactions too"</em> and the system re-classifies all matching expenses already in the database — updating their category and type automatically. A confirmation shows how many rows were updated, e.g. <strong>"✓ 12 transactions updated"</strong>.
              You can also trigger this any time using the <strong>🔄 Apply existing</strong> button on any rule card.
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'var(--color-bg, #f9fafb)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--color-text)' }}>💡 One-click rule creation from preview table</div>
            <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
              On the Import page, after fixing a flagged row (picking type + category), a <strong>💾 Save as rule</strong> button appears next to that row. Clicking it opens a pre-filled rule form with the description keyword and the category you chose — so identical transactions in future imports are classified automatically without any manual effort.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── LivePreview tab ───────────────────────────────────────────────────────────
const SIM_ROWS = [
  { date: '03/01/26', merchant: 'Zomato', raw: 'UPI/DR/498123/ZOMATO/OKUPI',           amount: -320,    type: 'expense',    category: '🍔 Food',            source: 'rule',    ruleLabel: 'Rule #1', flagged: false, skip: false },
  { date: '04/01/26', merchant: 'Streaming Subscription', raw: 'UPI/DR/771234/NETFLIX/OKAXIS', amount: -649, type: 'expense', category: '🎬 Entertainment', source: 'rule',    ruleLabel: 'Rule #3 (renamed)', flagged: false, skip: false },
  { date: '05/01/26', merchant: 'Rental Income',         raw: 'NEFT/CR/RAHUL SHARMA/HDFC',   amount: 22000,  type: 'income',     category: '🏘️ Rental Income',  source: 'rule',    ruleLabel: 'Rule #2', flagged: false, skip: false },
  { date: '06/01/26', merchant: 'Salary',                raw: 'NEFT/SALARY/INFOSYS LTD/SBI', amount: 85000,  type: 'income',     category: '💼 Salary',          source: 'builtin', ruleLabel: 'Built-in', flagged: false, skip: false },
  { date: '07/01/26', merchant: 'Groww MF',              raw: 'UPI/DR/GROWW MUTUALFUND/NEFT', amount: -5000, type: 'investment', category: '📈 Investments',     source: 'builtin', ruleLabel: 'Built-in', flagged: false, skip: false },
  { date: '08/01/26', merchant: 'Swiggy',                raw: 'UPI/DR/331209/SWIGGY/OKICICI', amount: -480,  type: 'expense',    category: '🍔 Food',            source: 'rule',    ruleLabel: 'Rule #1', flagged: false, skip: false },
  { date: '09/01/26', merchant: '⚠️ Unknown Sender',     raw: 'NEFT/CR/SURESH KUMAR/AXIS',   amount: 15000,  type: '— review —', category: '—',                  source: 'flagged', ruleLabel: '⚠️ Review', flagged: true,  skip: false },
  { date: '10/01/26', merchant: 'GST ON CHARGES',        raw: 'Bank service fee',             amount: -45,    type: 'skip',       category: '—',                  source: 'rule',    ruleLabel: 'Rule #4', flagged: false, skip: true },
]

function LivePreview() {
  const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n))

  const sourceBadge = (row) => {
    if (row.source === 'rule')    return { bg: '#dcfce7', color: '#15803d', label: row.ruleLabel }
    if (row.source === 'builtin') return { bg: '#e0e7ff', color: '#3730a3', label: 'Built-in' }
    return { bg: '#fee2e2', color: '#991b1b', label: '⚠️ Review' }
  }

  const typeBadge = (row) => {
    if (row.skip)                      return { bg: '#f3f4f6', color: '#6b7280', label: 'Skipped' }
    if (row.type === '— review —')     return { bg: '#fef2f2', color: '#dc2626', label: '— pick —' }
    if (row.type === 'income')         return { bg: '#f0fdf4', color: '#16a34a', label: 'Income' }
    if (row.type === 'investment')     return { bg: '#eff6ff', color: '#2563eb', label: 'Investment' }
    return { bg: '#fef2f2', color: '#dc2626', label: 'Expense' }
  }

  return (
    <div>
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>
            Preview — 8 transactions from canara_statement.pdf
          </div>
          <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 999, padding: '2px 12px', fontSize: '0.76rem', fontWeight: 700 }}>
            4 auto-classified by rules
          </span>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-card-alt, #f9fafb)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--color-text)' }}>Date</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text)' }}>Description</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }}>Amount</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text)' }}>Type</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text)' }}>Category</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>Matched by</th>
              </tr>
            </thead>
            <tbody>
              {SIM_ROWS.map((row, i) => {
                const sb = sourceBadge(row)
                const tb = typeBadge(row)
                const rowBg = row.flagged ? '#fef2f280' : row.skip ? '#f9fafb80' : row.source === 'rule' ? '#f0fdf480' : undefined
                return (
                  <tr key={i} style={{ background: rowBg, borderBottom: '1px solid var(--color-border)', opacity: row.skip ? 0.5 : 1 }}>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{row.date}</td>
                    <td style={{ padding: '7px 10px', maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: row.skip ? 'line-through' : 'none' }}>{row.merchant}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.raw}</div>
                      {row.flagged && <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 2 }}>Large deposit — confirm income type</div>}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: row.amount > 0 ? '#16a34a' : row.skip ? 'var(--color-text-muted)' : '#dc2626' }}>
                      {row.amount > 0 ? '+' : '−'}₹{fmt(row.amount)}
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ background: tb.bg, color: tb.color, borderRadius: 999, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {tb.label}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', color: row.skip || row.flagged ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                      {row.category}
                    </td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: sb.bg, color: sb.color, borderRadius: 999, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {sb.label}
                      </span>
                      {row.flagged && (
                        <div style={{ marginTop: 4 }}>
                          <button style={{ padding: '2px 7px', fontSize: '0.68rem', border: '1px solid #6366f1', borderRadius: 5, background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}>
                            💾 Save as rule
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ marginTop: '0.85rem', padding: '0.65rem 1rem', background: 'var(--color-bg, #f9fafb)', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <strong style={{ color: 'var(--color-text)' }}>Legend:</strong>
          <span><span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '1px 8px', fontWeight: 700, fontSize: '0.72rem' }}>Rule #n</span> &nbsp;Your custom rule</span>
          <span><span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 999, padding: '1px 8px', fontWeight: 700, fontSize: '0.72rem' }}>Built-in</span> &nbsp;System keyword</span>
          <span><span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 999, padding: '1px 8px', fontWeight: 700, fontSize: '0.72rem' }}>⚠️ Review</span> &nbsp;Needs your input</span>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════
export default function ImportRules() {
  const [activeTab,  setActiveTab]  = useState('rules')
  const [rules,      setRules]      = useState([])
  const [categories, setCats]       = useState([])
  const [showForm,   setShowForm]   = useState(false)
  const [editRule,   setEditRule]   = useState(null)
  const [loading,    setLoading]    = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([rulesApi.list(), categoriesApi.list()])
      setRules(r.data)
      setCats(c.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (data) => {
    if (editRule) {
      await rulesApi.update(editRule.id, data)
    } else {
      await rulesApi.create(data)
    }
    setShowForm(false)
    setEditRule(null)
    load()
  }

  const handleEdit = (rule) => {
    setEditRule(rule)
    setShowForm(true)
    setActiveTab('rules')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (rule) => {
    if (!window.confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return
    await rulesApi.delete(rule.id)
    load()
  }

  const handleToggle = async (rule) => {
    await rulesApi.update(rule.id, { is_active: !rule.is_active })
    load()
  }

  const TABS = [
    { key: 'rules',   label: '📋 My Rules' },
    { key: 'flow',    label: '🔄 How It Works' },
    { key: 'preview', label: '👁️ Live Preview' },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Page title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)' }}>🏷️ Import Rules Engine</h2>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Define once, applied automatically to every future import. Rules take priority over built-in keyword matching.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '0.6rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.87rem',
            background: 'none', border: 'none',
            borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom: -2,
            color: activeTab === tab.key ? '#6366f1' : 'var(--color-text-muted)',
            transition: 'all 0.15s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: My Rules ── */}
      {activeTab === 'rules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              Rules run in priority order — lower number checked first. First match wins; remaining passes are skipped.
            </p>
            <button
              onClick={() => { setEditRule(null); setShowForm(v => !v) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem', borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            >
              {showForm && !editRule ? '✕ Cancel' : '＋ New Rule'}
            </button>
          </div>

          {/* Rule form */}
          {showForm && (
            <RuleForm
              initial={editRule}
              categories={categories}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditRule(null) }}
            />
          )}

          {/* Rules list */}
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading rules…</p>
          ) : rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)', background: 'var(--color-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏷️</div>
              <p style={{ marginBottom: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>No rules yet</p>
              <p style={{ fontSize: '0.83rem' }}>
                Create your first rule to auto-classify transactions on import.<br />
                You can also create rules from the Import page using the <strong>"💾 Save as rule"</strong> shortcut.
              </p>
            </div>
          ) : (
            rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                categories={categories}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>
      )}

      {/* ── Tab: How It Works ── */}
      {activeTab === 'flow' && <HowItWorks />}

      {/* ── Tab: Live Preview Simulation ── */}
      {activeTab === 'preview' && <LivePreview />}
    </div>
  )
}
