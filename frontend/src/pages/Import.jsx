/**
 * Import.jsx
 * ----------
 * v2.0.0 — Bank Statement Import page.
 * v2.1.0 — Match source badges + "Save as rule" quick shortcut.
 *
 * Three-step flow:
 *   Step 1 — Upload  : drag-and-drop or click to select PDF / CSV
 *   Step 2 — Preview : editable table; duplicates/flags highlighted
 *   Step 3 — Done    : summary of imported / skipped / duplicates
 *
 * Income Sources panel at the bottom lets users define recurring
 * income patterns (rent tenants, employer, clients) so future imports
 * auto-classify large deposits correctly.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { categoriesApi } from '../api/index'
import client from '../api/client'

// ── API helpers ───────────────────────────────────────────────────────────────
const importApi = {
  upload:  (formData)   => client.post('/import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  confirm: (body)       => client.post('/import/confirm', body),
}
const incomeSourcesApi = {
  list:   ()            => client.get('/income-sources'),
  create: (data)        => client.post('/income-sources', data),
  update: (id, data)    => client.put(`/income-sources/${id}`, data),
  delete: (id)          => client.delete(`/income-sources/${id}`),
}
const quickRuleApi = {
  create: (data)        => client.post('/import-rules/quick', data),
}

// ── Type badge styles ─────────────────────────────────────────────────────────
const TYPE_COLORS = {
  expense:    { bg: '#fef2f2', color: '#dc2626', label: 'Expense' },
  income:     { bg: '#f0fdf4', color: '#16a34a', label: 'Income' },
  investment: { bg: '#eff6ff', color: '#2563eb', label: 'Invest' },
  transfer:   { bg: '#f5f3ff', color: '#7c3aed', label: 'Transfer' },
}

const CONFIDENCE_DOT = {
  high:   { color: '#16a34a', title: 'High confidence' },
  medium: { color: '#d97706', title: 'Medium confidence' },
  low:    { color: '#ef4444', title: 'Low confidence — please verify' },
}

// ── Match source badge styles ──────────────────────────────────────────────────
const MATCH_SOURCE_BADGE = {
  rule:          { bg: '#eff6ff', color: '#2563eb' },
  income_source: { bg: '#f0fdf4', color: '#15803d' },
  builtin:       { bg: '#f9fafb', color: '#6b7280' },
  heuristic:     { bg: '#fffbeb', color: '#92400e' },
  flagged:       { bg: '#fef2f2', color: '#dc2626' },
}
function matchSourceLabel(row) {
  const src = row.match_source
  if (src === 'rule')          return row.matched_rule_name ? `🏷 ${row.matched_rule_name.slice(0, 18)}` : '🏷 Rule'
  if (src === 'income_source') return '📥 Source'
  if (src === 'builtin')       return '🤖 Built-in'
  if (src === 'heuristic')     return '🔍 Heuristic'
  return '⚠️ Review'
}

const SOURCE_TYPES = ['salary', 'rent', 'business', 'interest', 'other']
const SOURCE_EMOJIS = { salary: '💼', rent: '🏘️', business: '🏢', interest: '🏦', other: '💰' }

// ── Format helpers ────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d) => {
  if (!d) return ''
  const [y, m, day] = d.toString().split('-')
  return `${day}/${m}/${y}`
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 1 — Upload
// ═════════════════════════════════════════════════════════════════════════════
function UploadStep({ onPreview }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const handleFile = useCallback(async (file) => {
    if (!file) return
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.csv')) {
      setError('Only PDF and CSV files are supported.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await importApi.upload(fd)
      onPreview(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse file. Check the format and try again.')
    } finally {
      setLoading(false)
    }
  }, [onPreview])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 0' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>📥 Import Bank Statement</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Upload a Canara Bank PDF or any generic bank CSV. Transactions will be
        auto-categorised and shown for review before they're saved.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 12,
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--color-accent-light)' : 'var(--color-card)',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
          {loading ? '⏳' : '📄'}
        </div>
        {loading ? (
          <p>Parsing file, please wait…</p>
        ) : (
          <>
            <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>
              Drag & drop your statement here
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              or click to browse — PDF and CSV supported (max 20 MB)
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div style={{
          marginTop: '1rem', padding: '0.75rem 1rem',
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 8, color: '#dc2626', fontSize: '0.9rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Supported formats info */}
      <div style={{
        marginTop: '1.5rem', padding: '1rem',
        background: 'var(--color-card)', borderRadius: 8,
        fontSize: '0.82rem', color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
      }}>
        <strong>Supported:</strong> Canara Bank PDF statements · Generic CSV
        (with Date, Description, Debit, Credit columns)
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Quick Rule Modal — "Save as rule" shortcut from preview table
// ═════════════════════════════════════════════════════════════════════════════
function QuickRuleModal({ row, categories, onClose, onSaved }) {
  const defaultKeyword = (row.merchant || row.description || '').toUpperCase().slice(0, 50)
  const [keyword,    setKeyword]    = useState(defaultKeyword)
  const [ruleName,   setRuleName]   = useState(`Auto: ${(row.merchant || row.description || '').slice(0, 30)}`)
  const [setType,    setSetType]    = useState(row.type)
  const [categoryId, setCategoryId] = useState(String(row.suggested_category_id || ''))
  const [applyRetro, setApplyRetro] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  const filteredCats = categories.filter(c =>
    setType === 'income' ? c.category_type === 'income' : c.category_type === 'expense'
  )

  const handleSave = async () => {
    if (!keyword.trim()) return
    setSaving(true); setError(null)
    try {
      await quickRuleApi.create({
        rule_name:           ruleName.trim(),
        description_keyword: keyword.trim(),
        set_type:            setType,
        category_id:         categoryId ? Number(categoryId) : null,
        apply_retroactive:   applyRetro,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save rule.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--color-card)', borderRadius: 12, padding: '1.5rem',
        width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        margin: '0 1rem',
      }}>
        <h3 style={{ margin: '0 0 0.4rem' }}>💾 Save as Rule</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 0, marginBottom: '1.25rem' }}>
          Future imports matching this keyword will be auto-classified with these settings.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            Rule Name
            <input value={ruleName} onChange={e => setRuleName(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          </label>

          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            Match when description contains
            <input value={keyword} onChange={e => setKeyword(e.target.value.toUpperCase())}
              placeholder="KEYWORD"
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '0.03em' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Set Type
              <select value={setType} onChange={e => setSetType(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem' }}>
                {Object.entries(TYPE_COLORS).map(([t, s]) => <option key={t} value={t}>{s.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Set Category
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem' }}>
                <option value="">— none —</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </label>
          </div>

          <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={applyRetro} onChange={e => setApplyRetro(e.target.checked)} />
            Also re-classify existing transactions that match this keyword
          </label>
        </div>

        {error && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#dc2626', fontSize: '0.82rem' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !keyword.trim()} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, cursor: saving || !keyword.trim() ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : '💾 Save Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 2 — Preview table
// ═════════════════════════════════════════════════════════════════════════════
function PreviewStep({ preview, onConfirm, onBack }) {
  const [rows, setRows]               = useState(() => preview.transactions.map(t => ({ ...t })))
  const [categories, setCats]         = useState([])
  const [filter, setFilter]           = useState('all')   // all | flagged | income | expense | investment | transfer
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [editedRows, setEditedRows]   = useState(new Set())
  const [quickRuleRow, setQuickRuleRow] = useState(null)   // row currently being saved as rule
  const [savedRules, setSavedRules]   = useState(new Set()) // row_ids that already have a saved rule

  useEffect(() => {
    categoriesApi.list().then(r => setCats(r.data)).catch(() => {})
  }, [])

  const updateRow = (row_id, patch) => {
    setRows(prev => prev.map(r => r.row_id === row_id ? { ...r, ...patch } : r))
    setEditedRows(prev => new Set([...prev, row_id]))
  }

  const filteredRows = rows.filter(r => {
    if (filter === 'all')        return true
    if (filter === 'flagged')    return r.is_flagged && !r.is_duplicate
    if (filter === 'duplicates') return r.is_duplicate
    return r.type === filter
  })

  const counts = {
    all:        rows.length,
    flagged:    rows.filter(r => r.is_flagged && !r.is_duplicate).length,
    duplicates: rows.filter(r => r.is_duplicate).length,
    expense:    rows.filter(r => r.type === 'expense').length,
    income:     rows.filter(r => r.type === 'income').length,
    investment: rows.filter(r => r.type === 'investment').length,
    transfer:   rows.filter(r => r.type === 'transfer').length,
  }

  const toImport = rows.filter(r => !r.skip && !r.is_duplicate).length

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        session_id: preview.session_id,
        rows: rows.map(r => ({
          row_id: r.row_id,
          type: r.type,
          category_id: r.suggested_category_id || null,
          description: r.description,
          skip: r.skip || false,
        })),
      }
      const res = await importApi.confirm(payload)
      onConfirm(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Import failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const FILTERS = ['all', 'flagged', 'duplicates', 'income', 'expense', 'investment', 'transfer']

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>
          ← Back
        </button>
        <div>
          <h2 style={{ margin: 0 }}>Review Transactions</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            {preview.filename} · {preview.bank_format.replace('_', ' ')} · {preview.total_rows} transactions
          </p>
        </div>

        {/* Summary chips */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {preview.duplicate_count > 0 && (
            <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
              {preview.duplicate_count} duplicates
            </span>
          )}
          {preview.flagged_count > 0 && (
            <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 999, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
              ⚠️ {preview.flagged_count} need review
            </span>
          )}
          <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 999, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
            {toImport} to import
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600,
              border: '1px solid var(--color-border)', cursor: 'pointer', whiteSpace: 'nowrap',
              background: filter === f ? 'var(--color-accent)' : 'var(--color-card)',
              color: filter === f ? '#fff' : 'var(--color-text)',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} {counts[f] > 0 ? `(${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-card-header)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Skip</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Date</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Merchant / Description</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Amount</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Type</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Conf.</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => {
              const tc = TYPE_COLORS[row.type] || TYPE_COLORS.expense
              const cc = CONFIDENCE_DOT[row.confidence] || CONFIDENCE_DOT.low
              const rowBg = row.is_duplicate
                ? '#fffbeb'
                : row.is_flagged
                  ? '#fef2f2'
                  : row.skip
                    ? 'var(--color-card-muted)'
                    : i % 2 === 0 ? 'var(--color-card)' : 'var(--color-card-alt)'

              return (
                <tr
                  key={row.row_id}
                  style={{
                    background: rowBg,
                    opacity: row.skip ? 0.45 : 1,
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {/* Skip toggle */}
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!row.skip}
                      onChange={e => updateRow(row.row_id, { skip: e.target.checked })}
                      title={row.is_duplicate ? 'Duplicate — skipped by default' : 'Skip this transaction'}
                    />
                    {row.is_duplicate && (
                      <span title="Duplicate already in database" style={{ marginLeft: 4, color: '#92400e', fontSize: '0.7rem' }}>📋</span>
                    )}
                    {row.is_flagged && !row.is_duplicate && (
                      <span title={row.flag_reason} style={{ marginLeft: 4, color: '#dc2626', fontSize: '0.7rem' }}>⚠️</span>
                    )}
                  </td>

                  {/* Date */}
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                    {fmtDate(row.date)}
                  </td>

                  {/* Description */}
                  <td style={{ padding: '6px 10px', maxWidth: 260 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.merchant || row.description.slice(0, 30)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.description}
                    </div>
                    {row.is_flagged && row.flag_reason && (
                      <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: 2 }}>
                        {row.flag_reason}
                      </div>
                    )}
                  </td>

                  {/* Amount */}
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600,
                    color: row.type === 'income' ? '#16a34a' : row.type === 'expense' ? '#dc2626' : 'var(--color-text)' }}>
                    {row.type === 'income' ? '+' : row.type === 'expense' ? '−' : ''}{fmt(row.amount)}
                  </td>

                  {/* Type selector */}
                  <td style={{ padding: '6px 10px' }}>
                    <select
                      value={row.type}
                      onChange={e => updateRow(row.row_id, { type: e.target.value })}
                      style={{
                        padding: '2px 6px', borderRadius: 6, fontSize: '0.76rem', fontWeight: 600,
                        border: `1px solid ${tc.color}`, background: tc.bg, color: tc.color, cursor: 'pointer',
                      }}
                    >
                      {Object.entries(TYPE_COLORS).map(([t, s]) => (
                        <option key={t} value={t}>{s.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Category selector */}
                  <td style={{ padding: '6px 10px' }}>
                    <select
                      value={row.suggested_category_id || ''}
                      onChange={e => updateRow(row.row_id, { suggested_category_id: Number(e.target.value) || null })}
                      style={{ padding: '2px 6px', borderRadius: 6, fontSize: '0.76rem', border: '1px solid var(--color-border)', background: 'var(--color-input)', cursor: 'pointer', maxWidth: 130 }}
                    >
                      <option value="">— pick —</option>
                      {categories
                        .filter(c => row.type === 'income' ? c.category_type === 'income' : c.category_type === 'expense')
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                        ))
                      }
                    </select>
                  </td>

                  {/* Confidence dot */}
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <span
                      title={cc.title}
                      style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: cc.color }}
                    />
                  </td>

                  {/* Match source badge + Save as rule */}
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {row.match_source && (() => {
                      const style = MATCH_SOURCE_BADGE[row.match_source] || MATCH_SOURCE_BADGE.flagged
                      return (
                        <span style={{
                          display: 'inline-block', fontSize: '0.68rem', fontWeight: 600,
                          background: style.bg, color: style.color,
                          borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap',
                        }}>
                          {matchSourceLabel(row)}
                        </span>
                      )
                    })()}
                    {/* Show "Save as rule" when row is flagged or manually edited and not already saved */}
                    {(row.is_flagged || editedRows.has(row.row_id)) && !row.is_duplicate && !savedRules.has(row.row_id) && (
                      <button
                        onClick={() => setQuickRuleRow(row)}
                        title="Save classification as a reusable rule"
                        style={{
                          marginLeft: 6, padding: '1px 7px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                          border: '1px solid #a78bfa', background: '#f5f3ff', color: '#7c3aed', cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        💾 Save as rule
                      </button>
                    )}
                    {savedRules.has(row.row_id) && (
                      <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#16a34a', fontWeight: 600 }}>✓ Rule saved</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
          No transactions match this filter.
        </p>
      )}

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
        <button onClick={onBack} style={{ padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer' }}>
          ← Upload different file
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading || toImport === 0}
          style={{
            padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none', cursor: toImport === 0 || loading ? 'not-allowed' : 'pointer',
            background: toImport === 0 ? '#9ca3af' : 'var(--color-accent)', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
          }}
        >
          {loading ? 'Importing…' : `✅ Import ${toImport} transactions`}
        </button>
      </div>

      {/* Quick Rule Modal */}
      {quickRuleRow && (() => {
        // Use live row state for type/category (user may have changed them)
        const liveRow = rows.find(r => r.row_id === quickRuleRow.row_id) || quickRuleRow
        return (
          <QuickRuleModal
            row={liveRow}
            categories={categories}
            onClose={() => setQuickRuleRow(null)}
            onSaved={() => {
              setSavedRules(prev => new Set([...prev, quickRuleRow.row_id]))
              setQuickRuleRow(null)
            }}
          />
        )
      })()}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 3 — Done
// ═════════════════════════════════════════════════════════════════════════════
function DoneStep({ result, onReset }) {
  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
      <h2>Import Complete!</h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '1rem 1.5rem', minWidth: 110 }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>{result.imported_count}</div>
          <div style={{ fontSize: '0.8rem', color: '#15803d' }}>Imported</div>
        </div>
        <div style={{ background: '#fffbeb', borderRadius: 12, padding: '1rem 1.5rem', minWidth: 110 }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>{result.duplicate_skipped}</div>
          <div style={{ fontSize: '0.8rem', color: '#92400e' }}>Duplicates</div>
        </div>
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem 1.5rem', minWidth: 110 }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{result.skipped_count}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Skipped</div>
        </div>
      </div>

      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Transactions have been added to your expense tracker. Head to the Dashboard or Expenses page to review them.
      </p>

      <button
        onClick={onReset}
        style={{ padding: '0.75rem 2rem', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
      >
        Import another statement
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Income Sources panel
// ═════════════════════════════════════════════════════════════════════════════
function IncomeSourcesPanel() {
  const [sources, setSources]   = useState([])
  const [categories, setCats]   = useState([])
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState({ name: '', source_type: 'rent', sender_keyword: '', expected_amount: '', expected_day: '', category_id: '' })
  const [saving, setSaving]     = useState(false)

  const load = () => {
    incomeSourcesApi.list().then(r => setSources(r.data)).catch(() => {})
    categoriesApi.list({ category_type: 'income' }).then(r => setCats(r.data.filter ? r.data.filter(c => c.category_type === 'income') : r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name.trim() || !form.sender_keyword.trim()) return
    setSaving(true)
    try {
      await incomeSourcesApi.create({
        name: form.name.trim(),
        source_type: form.source_type,
        sender_keyword: form.sender_keyword.trim().toUpperCase(),
        expected_amount: form.expected_amount ? Number(form.expected_amount) : null,
        expected_day: form.expected_day ? Number(form.expected_day) : null,
        category_id: form.category_id ? Number(form.category_id) : null,
      })
      setForm({ name: '', source_type: 'rent', sender_keyword: '', expected_amount: '', expected_day: '', category_id: '' })
      setShowAdd(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this income source?')) return
    await incomeSourcesApi.delete(id)
    load()
  }

  return (
    <div style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>🏷️ Income Sources</h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Define recurring income senders so large deposits are auto-classified on import.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Display Name *
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Rahul Sharma (Rent)"
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </label>

            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Type
              <select value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem' }}>
                {SOURCE_TYPES.map(t => <option key={t} value={t}>{SOURCE_EMOJIS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </label>

            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Sender Keyword * <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(matched in description)</span>
              <input value={form.sender_keyword} onChange={e => setForm(f => ({ ...f, sender_keyword: e.target.value }))}
                placeholder="RAHUL SHARMA"
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </label>

            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Expected Amount
              <input type="number" value={form.expected_amount} onChange={e => setForm(f => ({ ...f, expected_amount: e.target.value }))}
                placeholder="22000"
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </label>

            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Expected Day (1–31)
              <input type="number" value={form.expected_day} onChange={e => setForm(f => ({ ...f, expected_day: e.target.value }))}
                placeholder="1"
                min="1" max="31"
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </label>

            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Income Category
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-input)', fontSize: '0.85rem' }}>
                <option value="">— auto —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save Source'}
            </button>
          </div>
        </div>
      )}

      {sources.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          No income sources defined yet. Add one to help auto-classify rent, salary, and business deposits.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sources.map(src => (
            <div key={src.id} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '0.6rem 1rem',
            }}>
              <span style={{ fontSize: '1.2rem' }}>{SOURCE_EMOJIS[src.source_type] || '💰'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{src.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Keyword: <strong>{src.sender_keyword}</strong>
                  {src.expected_amount && ` · ₹${src.expected_amount.toLocaleString('en-IN')}`}
                  {src.expected_day && ` · Day ${src.expected_day}`}
                </div>
              </div>
              <span style={{
                background: '#eff6ff', color: '#2563eb', borderRadius: 999,
                padding: '1px 8px', fontSize: '0.72rem', fontWeight: 600,
              }}>
                {src.source_type}
              </span>
              <button
                onClick={() => handleDelete(src.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', padding: '2px 6px' }}
                title="Remove income source"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════
export default function Import() {
  const [step, setStep]       = useState('upload')   // 'upload' | 'preview' | 'done'
  const [preview, setPreview] = useState(null)
  const [result, setResult]   = useState(null)

  const handlePreview = (data) => {
    setPreview(data)
    setStep('preview')
  }

  const handleConfirm = (data) => {
    setResult(data)
    setStep('done')
  }

  const handleReset = () => {
    setStep('upload')
    setPreview(null)
    setResult(null)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
        {['Upload', 'Review', 'Done'].map((label, i) => {
          const stepKeys = ['upload', 'preview', 'done']
          const active = step === stepKeys[i]
          const done = stepKeys.indexOf(step) > i
          return (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%', fontSize: '0.72rem', fontWeight: 700,
                background: active ? 'var(--color-accent)' : done ? '#16a34a' : 'var(--color-border)',
                color: active || done ? '#fff' : 'var(--color-text-muted)',
              }}>
                {done ? '✓' : i + 1}
              </span>
              <span style={{ fontWeight: active ? 700 : 400, color: active ? 'var(--color-text)' : undefined }}>
                {label}
              </span>
              {i < 2 && <span style={{ color: 'var(--color-border)' }}>›</span>}
            </span>
          )
        })}
      </div>

      {step === 'upload'  && <UploadStep onPreview={handlePreview} />}
      {step === 'preview' && <PreviewStep preview={preview} onConfirm={handleConfirm} onBack={handleReset} />}
      {step === 'done'    && <DoneStep result={result} onReset={handleReset} />}

      {/* Income sources panel — always visible at bottom */}
      <IncomeSourcesPanel />
    </div>
  )
}
