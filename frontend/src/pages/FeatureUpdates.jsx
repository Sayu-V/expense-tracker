/**
 * pages/FeatureUpdates.jsx
 * -------------------------
 * v2.3.0 — Kanban-style release board showing all app features
 * organised by category with one-liner descriptions.
 */

const KANBAN = [
  {
    title: 'Core Tracking',
    icon: '📊',
    color: '#6366F1',
    tag: 'Stable',
    tagColor: '#6366F1',
    features: [
      { emoji: '📊', name: 'Track expenses & income',       desc: 'Log every transaction with amount, date, category and notes.' },
      { emoji: '✏️', name: 'Edit & delete entries',         desc: 'Fix mistakes or remove duplicate entries at any time.' },
      { emoji: '📅', name: 'Flexible time periods',         desc: 'Switch between week, month, quarter or full-year views instantly.' },
      { emoji: '🔄', name: 'Recurring expenses',            desc: 'Set up subscriptions and bills once — they log themselves.' },
      { emoji: '⬇️', name: 'Export data to CSV',            desc: 'Download your transactions as a spreadsheet for offline use.' },
    ],
  },
  {
    title: 'Budgets & Goals',
    icon: '🎯',
    color: '#10B981',
    tag: 'Stable',
    tagColor: '#10B981',
    features: [
      { emoji: '🎯', name: 'Budget per category',           desc: 'Set monthly spending limits on any category and track progress.' },
      { emoji: '🏆', name: 'Savings goal tracker',          desc: 'Define a savings target and watch your balance grow toward it.' },
      { emoji: '🔔', name: 'Spending alerts',               desc: 'Get notified automatically when you exceed a budget threshold.' },
      { emoji: '💱', name: 'Income vs expense balance',     desc: 'See at a glance whether you earned more than you spent.' },
    ],
  },
  {
    title: 'Analytics',
    icon: '📈',
    color: '#F59E0B',
    tag: 'Stable',
    tagColor: '#F59E0B',
    features: [
      { emoji: '📈', name: 'Monthly trend charts',          desc: 'Bar and line charts showing your spend pattern over 6 months.' },
      { emoji: '💡', name: 'Smart spending insights',       desc: 'Auto-generated tips based on your biggest and fastest-growing costs.' },
      { emoji: '📊', name: 'Year-over-year comparison',     desc: 'Compare this month against the same month last year side-by-side.' },
      { emoji: '🔮', name: 'Predicted monthly spend',       desc: 'Forecast your end-of-month total based on your current pace.' },
      { emoji: '🗂️', name: 'Spend-by-category chart',      desc: 'Pie chart for ≤6 categories; treemap auto-activates for more.' },
    ],
  },
  {
    title: 'AI & Import',
    icon: '🤖',
    color: '#EC4899',
    tag: 'New',
    tagColor: '#EC4899',
    features: [
      { emoji: '🤖', name: 'AI auto-categorisation',        desc: 'Transactions are tagged to the right category the moment they arrive.' },
      { emoji: '💬', name: 'Chat with your data',           desc: 'Ask natural-language questions and get instant answers from your data.' },
      { emoji: '📥', name: 'Bank statement import',         desc: 'Upload PDF or CSV bank statements and import all rows in one click.' },
      { emoji: '⚙️', name: 'Import Rules engine',           desc: 'Build keyword rules that auto-categorise future imports for you.' },
      { emoji: '🏷️', name: 'Income source classification',  desc: 'Separately track salary, freelance, and other income streams.' },
    ],
  },
  {
    title: 'Design & Tech',
    icon: '🎨',
    color: '#8B5CF6',
    tag: 'v2.3',
    tagColor: '#8B5CF6',
    features: [
      { emoji: '🌙', name: 'Light & dark theme',            desc: 'One-click theme toggle — your preference is saved automatically.' },
      { emoji: '🌌', name: 'Galaxy theme',                  desc: 'Deep-space glass-morphism with animated radial-gradient orbs.' },
      { emoji: '📱', name: 'Mobile-friendly design',        desc: 'Fully responsive layout works great on any screen size.' },
      { emoji: '😀', name: 'Rich emoji category picker',    desc: 'Search and pick from hundreds of emojis to personalise categories.' },
      { emoji: '📶', name: 'PWA offline mode',              desc: 'Install the app and use it without an internet connection.' },
      { emoji: '📄', name: 'Cursor-based pagination',       desc: 'Handles thousands of expense entries without slowing down.' },
      { emoji: '⚙️', name: 'Settings hub',                  desc: 'Categories, Import, Rules and What\'s New unified under one sidebar entry.' },
    ],
  },
]

const VERSION_LOG = [
  { version: 'v2.3.0', date: 'Mar 2026', summary: 'Settings hub consolidation, Galaxy theme, button system standardisation, .gitattributes Windows safety.' },
  { version: 'v2.2.0', date: 'Mar 2026', summary: 'PWA offline support, cursor pagination, kanban feature board, 3D splash screen.' },
  { version: 'v2.1.0', date: 'Feb 2026', summary: 'Import Rules engine with priority & active toggle, adaptive Spend by Category chart.' },
  { version: 'v2.0.0', date: 'Jan 2026', summary: 'Bank statement import (PDF & CSV), income sources, auto-classification.' },
  { version: 'v1.9.0', date: 'Dec 2025', summary: 'Rich emoji picker for categories, collapsible sidebar, version badge.' },
  { version: 'v1.8.0', date: 'Nov 2025', summary: 'Smart insights feed, year-over-year chart, predicted spend on Dashboard.' },
  { version: 'v1.7.0', date: 'Oct 2025', summary: 'Recurring expenses, spending alerts with badge, savings goals page.' },
  { version: 'v1.5.0', date: 'Sep 2025', summary: 'Chat AI — ask your data questions in natural language.' },
]

export default function FeatureUpdates() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.3rem', color: 'var(--text-primary)' }}>
          ✨ Feature Updates
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Everything that's built into your Expense Tracker — organised by area.
        </p>
      </div>

      {/* ── Kanban board ──────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '2.5rem',
        alignItems: 'start',
      }}>
        {KANBAN.map((col) => (
          <div key={col.title} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            {/* Column header */}
            <div style={{
              background: col.color,
              padding: '0.55rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1rem' }}>{col.icon}</span>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                }}>
                  {col.title}
                </span>
              </div>
              <span style={{
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                borderRadius: '999px',
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '2px 7px',
              }}>
                {col.tag}
              </span>
            </div>

            {/* Feature cards */}
            <div style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {col.features.map((feat) => (
                <div key={feat.name} style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.55rem 0.65rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginBottom: '0.2rem',
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>{feat.emoji}</span>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}>
                      {feat.name}
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.45,
                    paddingLeft: '1.35rem',
                  }}>
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Version history ───────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          padding: '0.75rem 1.1rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>🕓</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Version History
          </span>
        </div>
        <div style={{ padding: '0.75rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {VERSION_LOG.map((v, i) => (
            <div key={v.version} style={{
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start',
            }}>
              {/* Timeline dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3px' }}>
                <div style={{
                  width: 10, height: 10,
                  borderRadius: '50%',
                  background: i === 0 ? '#6366F1' : 'var(--border-color)',
                  border: `2px solid ${i === 0 ? '#6366F1' : 'var(--text-secondary)'}`,
                  flexShrink: 0,
                }} />
                {i < VERSION_LOG.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 18, background: 'var(--border-color)', marginTop: 2 }} />
                )}
              </div>
              <div style={{ paddingBottom: i < VERSION_LOG.length - 1 ? '0.3rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: i === 0 ? '#6366F1' : 'var(--text-primary)',
                  }}>
                    {v.version}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{v.date}</span>
                  {i === 0 && (
                    <span style={{
                      background: '#6366F1',
                      color: '#fff',
                      borderRadius: '999px',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                    }}>
                      Latest
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {v.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
