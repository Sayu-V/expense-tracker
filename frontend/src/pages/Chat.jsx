/**
 * pages/Chat.jsx
 * ---------------
 * v1.5.0 — "Chat with your data" page.
 *
 * Users type natural-language questions about their finances.
 * The backend NLP service queries the DB and returns a structured answer
 * with optional inline Recharts (pie / bar / line).
 *
 * Features:
 *   - Message history (local state)
 *   - Quick-reply chips (suggested follow-ups from backend)
 *   - Inline charts per answer (Recharts, same palette as Dashboard)
 *   - Markdown-lite: **bold**, line breaks, numbered lists
 *   - No external AI API — all keyword-based on the user's own data
 */

import { useEffect, useRef, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { chatApi } from '../api/index'
import { useChartTheme } from '../hooks/useChartTheme'

// ── Colour palette for charts ─────────────────────────────────────────────────
const PALETTE = ['#5E5CE6','#34C759','#FF3B30','#FF9500','#007AFF','#FF2D55','#AF52DE','#30D158']

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function MdText({ text }) {
  // Split on double-newline or newline, render **bold**, handle numbered lists
  const lines = text.split(/\n/)
  return (
    <div>
      {lines.map((line, i) => {
        // Numbered list item
        const listMatch = line.match(/^(\d+)\.\s(.+)/)
        if (listMatch) {
          return (
            <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: '1.2rem' }}>{listMatch[1]}.</span>
              <BoldText text={listMatch[2]} />
            </div>
          )
        }
        return <div key={i} style={{ marginBottom: line ? 0 : '0.4rem' }}><BoldText text={line} /></div>
      })}
    </div>
  )
}

function BoldText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

// ── Inline chart — v1.6.0: theme-aware colours via useChartTheme ──────────────
function InlineChart({ type, data, title }) {
  const ct = useChartTheme()   // reactive: re-renders on light ↔ dark toggle

  if (!data || data.length === 0 || type === 'none') return null

  const chartData = data.map((d, i) => ({
    ...d,
    fill: d.color || PALETTE[i % PALETTE.length],
  }))

  return (
    <div style={{ marginTop: '1rem' }}>
      {title && (
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: ct.textSecondary, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={220}>
        {type === 'pie' ? (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}
              labelLine={{ stroke: ct.labelLineStroke }}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={ct.tooltipStyle} itemStyle={ct.tooltipItemStyle} labelStyle={ct.tooltipLabelStyle} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem', color: ct.textSecondary }} />
          </PieChart>
        ) : type === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.border} />
            <XAxis dataKey="label" tick={ct.tickSm} />
            <YAxis tick={ct.tickSm} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={ct.tooltipStyle} itemStyle={ct.tooltipItemStyle} labelStyle={ct.tooltipLabelStyle} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.border} />
            <XAxis dataKey="label" tick={ct.tickSm} />
            <YAxis tick={ct.tickSm} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={ct.tooltipStyle} itemStyle={ct.tooltipItemStyle} labelStyle={ct.tooltipLabelStyle} />
            <Line type="monotone" dataKey="value" stroke={ct.accent} strokeWidth={2} dot={{ r: 4, fill: ct.accent }} />
          </LineChart>
        ) : <g />}
      </ResponsiveContainer>
    </div>
  )
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: '0.6rem',
      marginBottom: '1rem',
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem',
      }}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '78%',
        background: isUser ? 'var(--accent)' : 'var(--bg-surface)',
        color: isUser ? '#fff' : 'var(--text-primary)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '0.75rem 1rem',
        border: '1px solid var(--border)',
        fontSize: '0.875rem',
        lineHeight: 1.55,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {isUser ? (
          <span>{msg.text}</span>
        ) : (
          <>
            <MdText text={msg.text} />
            {msg.chartType && msg.chartType !== 'none' && (
              <InlineChart type={msg.chartType} data={msg.chartData} title={msg.chartTitle} />
            )}
          </>
        )}
        <div style={{
          fontSize: '0.68rem',
          marginTop: '0.4rem',
          opacity: 0.5,
          textAlign: isUser ? 'left' : 'right',
        }}>
          {msg.time}
        </div>
      </div>
    </div>
  )
}

// ── Quick-reply chip ──────────────────────────────────────────────────────────
function Chip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      style={{
        background: 'var(--accent-light)',
        color: 'var(--accent)',
        border: '1px solid var(--accent)',
        borderRadius: '999px',
        padding: '0.3rem 0.9rem',
        fontSize: '0.78rem',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all var(--transition)',
        minHeight: 'auto',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.color = 'var(--accent)' }}
    >
      {text}
    </button>
  )
}

// ── Default quick replies shown on load ───────────────────────────────────────
const STARTER_CHIPS = [
  'How much did I spend this month?',
  'Show my biggest expense category',
  'How am I doing on my budget?',
  'Show income vs expenses',
  "What are my top 5 expenses?",
  'Show 6-month spending trend',
]

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Chat() {
  const [messages, setMessages]  = useState([
    {
      id: 0, role: 'assistant',
      text: "Hi! 👋 I'm your expense analysis assistant. Ask me anything about your spending, income, budgets, or trends. Try one of the quick questions below!",
      chartType: 'none', chartData: [], chartTitle: '',
      quickReplies: STARTER_CHIPS,
      time: now(),
    },
  ])
  const [input,    setInput]     = useState('')
  const [loading,  setLoading]   = useState(false)
  const bottomRef  = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const lastQuickReplies = messages[messages.length - 1]?.quickReplies ?? []

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return
    setInput('')
    setLoading(true)

    // Add user bubble
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', text: trimmed, time: now() },
    ])

    try {
      const { data } = await chatApi.send(trimmed)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: data.answer,
          chartType:   data.chart_type,
          chartData:   data.chart_data,
          chartTitle:  data.chart_title,
          quickReplies: data.quick_replies ?? [],
          time: now(),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1, role: 'assistant',
          text: '⚠️ Sorry, I couldn\'t connect to the data service. Make sure the backend is running.',
          chartType: 'none', chartData: [], chartTitle: '', quickReplies: STARTER_CHIPS,
          time: now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>💬 Chat with your data</h1>
        <span style={{ fontSize: '0.72rem', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '999px', padding: '2px 10px', fontWeight: 600 }}>AI</span>
      </div>

      {/* ── Message area ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-base)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        padding: '1.25rem',
        marginBottom: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
            <div style={{ background: 'var(--bg-surface)', borderRadius: '16px 16px 16px 4px', padding: '0.75rem 1rem', border: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-tertiary)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick reply chips ── */}
      {lastQuickReplies.length > 0 && !loading && (
        <div style={{
          display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
          marginBottom: '0.75rem', padding: '0 0.25rem',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {lastQuickReplies.map((q) => (
            <Chip key={q} text={q} onClick={sendMessage} />
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        display: 'flex', gap: '0.75rem', alignItems: 'flex-end',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem 1rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your spending, income, budgets…"
          disabled={loading}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            background: 'transparent', fontSize: '0.875rem',
            color: 'var(--text-primary)', fontFamily: 'inherit',
            lineHeight: 1.5, padding: 0, minHeight: '1.5rem',
          }}
        />
        <button
          className="btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{ borderRadius: 'var(--radius-md)', padding: '0.5rem 1.1rem', minHeight: 'auto', flexShrink: 0 }}
        >
          {loading ? '…' : 'Send ↵'}
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.4rem' }}>
        Powered by keyword-based NLP on your local data · Press Enter to send
      </div>
    </div>
  )
}
