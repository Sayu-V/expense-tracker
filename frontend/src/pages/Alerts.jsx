/**
 * Alerts.jsx  — v1.7.0
 * Spending alert centre — shows budget threshold + category spike alerts.
 * Also exports useUnreadAlertCount() hook used by the sidebar badge.
 */

import { useState, useEffect, useCallback } from 'react'
import { alertsApi } from '../api/index'

const SEVERITY_META = {
  alert:   { bg: '#fff0f0', border: '#ff3b30', icon: '🚨', label: 'Critical' },
  warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️', label: 'Warning'  },
  info:    { bg: '#f0f9ff', border: '#0ea5e9', icon: 'ℹ️', label: 'Info'     },
}

const TYPE_LABEL = {
  budget_over:     'Budget Exceeded',
  budget_80:       'Budget 80% Used',
  category_spike:  'Spending Spike',
}

export default function Alerts() {
  const [data,          setData]          = useState({ alerts: [], unread_count: 0 })
  const [loading,       setLoading]       = useState(true)
  const [generating,    setGenerating]    = useState(false)
  const [error,         setError]         = useState(null)
  const [filterUnread,  setFilterUnread]  = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await alertsApi.list(false)
      setData(res.data)
      setError(null)
    } catch {
      setError('Failed to load alerts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleGenerate() {
    setGenerating(true)
    try {
      await alertsApi.generate()
      load()
    } catch (e) {
      setError('Failed to generate alerts.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleMarkRead(id) {
    try {
      await alertsApi.markRead(id)
      setData(d => ({
        ...d,
        alerts: d.alerts.map(a => a.id === id ? { ...a, is_read: true } : a),
        unread_count: Math.max(0, d.unread_count - 1),
      }))
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await alertsApi.markAllRead()
      setData(d => ({
        ...d,
        alerts: d.alerts.map(a => ({ ...a, is_read: true })),
        unread_count: 0,
      }))
    } catch { /* ignore */ }
  }

  async function handleDelete(id) {
    try {
      await alertsApi.delete(id)
      setData(d => ({
        ...d,
        alerts: d.alerts.filter(a => a.id !== id),
        unread_count: d.unread_count - (d.alerts.find(a => a.id === id)?.is_read ? 0 : 1),
      }))
    } catch { /* ignore */ }
  }

  const displayed = filterUnread ? data.alerts.filter(a => !a.is_read) : data.alerts

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          🔔 Spending Alerts
          {data.unread_count > 0 && (
            <span
              style={{
                marginLeft: '0.5rem',
                background: 'var(--color-red)',
                color: '#fff',
                borderRadius: '999px',
                fontSize: '0.72rem',
                padding: '2px 8px',
                fontWeight: 700,
                verticalAlign: 'middle',
              }}
            >
              {data.unread_count} new
            </span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterUnread}
              onChange={e => setFilterUnread(e.target.checked)}
            />
            Unread only
          </label>
          {data.unread_count > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAllRead}>
              ✓ Mark all read
            </button>
          )}
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Checking…' : '🔍 Check Now'}
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          padding: '0.85rem 1rem',
          background: 'var(--accent-light)',
          borderRadius: '10px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        💡 Click <strong>Check Now</strong> to scan your current month's budget usage and detect category spending spikes vs. last month. Alerts are generated automatically each time you open this page on the first load.
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="loading">Loading alerts…</div>
      ) : displayed.length === 0 ? (
        <div className="card empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h3 style={{ marginBottom: '0.5rem' }}>
            {filterUnread ? 'No unread alerts' : 'No alerts yet'}
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {filterUnread
              ? 'You\'re all caught up!'
              : 'Click "Check Now" to scan your spending and budgets.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayed.map(alert => {
            const meta = SEVERITY_META[alert.severity] || SEVERITY_META.info
            return (
              <div
                key={alert.id}
                style={{
                  background: alert.is_read ? 'var(--bg-surface)' : meta.bg,
                  border: `1.5px solid ${alert.is_read ? 'var(--border)' : meta.border}`,
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  opacity: alert.is_read ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ fontSize: '1.5rem', flexShrink: 0, lineHeight: 1 }}>{meta.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: meta.border,
                        background: meta.border + '18',
                        borderRadius: '4px',
                        padding: '1px 6px',
                      }}
                    >
                      {TYPE_LABEL[alert.alert_type] || alert.alert_type}
                    </span>
                    {!alert.is_read && (
                      <span
                        style={{
                          width: 8, height: 8,
                          borderRadius: '50%',
                          background: 'var(--color-red)',
                          display: 'inline-block',
                        }}
                      />
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{alert.message}</p>
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {formatDate(alert.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  {!alert.is_read && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleMarkRead(alert.id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(alert.id)}
                    title="Dismiss alert"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
