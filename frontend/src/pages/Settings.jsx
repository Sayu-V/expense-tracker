/**
 * pages/Settings.jsx
 * -------------------
 * v2.3.0 — Unified settings hub consolidating low-frequency config pages
 * into a single tabbed view to reduce sidebar clutter.
 *
 * Tabs:
 *   🏷️ Categories    — manage expense/income categories
 *   📥 Import        — upload bank statements (PDF / CSV)
 *   🏷️ Import Rules  — define auto-classification rules
 *   ✨ What's New    — feature changelog / kanban board
 *
 * Tab state is stored in the URL (?tab=categories) so links are shareable
 * and the browser back button works naturally.
 */

import { useSearchParams } from 'react-router-dom'
import Categories   from './Categories'
import Import       from './Import'
import ImportRules  from './ImportRules'
import FeatureUpdates from './FeatureUpdates'

const TABS = [
  { key: 'categories',   label: 'Categories',   icon: '🏷️' },
  { key: 'import',       label: 'Import',        icon: '📥' },
  { key: 'import-rules', label: 'Import Rules',  icon: '🏷️' },
  { key: 'whats-new',    label: "What's New",    icon: '✨' },
]

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'categories'

  const setTab = (key) => setSearchParams({ tab: key }, { replace: true })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{
          fontSize: '1.6rem', fontWeight: 700,
          color: 'var(--text-primary)', margin: 0, marginBottom: '0.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          ⚙️ Settings
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          Manage categories, data imports, auto-classification rules, and view the changelog.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: '0.15rem',
        borderBottom: '2px solid var(--border)',
        marginBottom: '1.75rem',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key
                ? '2px solid var(--accent)'
                : '2px solid transparent',
              marginBottom: '-2px',
              padding: '0.55rem 1.1rem',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '0.875rem',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'categories'   && <Categories />}
      {activeTab === 'import'       && <Import />}
      {activeTab === 'import-rules' && <ImportRules />}
      {activeTab === 'whats-new'    && <FeatureUpdates />}
    </div>
  )
}
