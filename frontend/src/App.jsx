/**
 * App.jsx
 * --------
 * v1.4.0: Mobile-responsive hamburger drawer, localStorage theme.
 * v1.5.0: Chat page route.
 * v1.6.0: Collapsible sidebar (desktop) — ← collapse button in sidebar,
 *          hamburger reveals sidebar when collapsed, state in localStorage.
 * v1.7.0: Recurring Expenses, Spending Alerts (with badge), Goals pages.
 */

import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard          from './pages/Dashboard'
import Expenses           from './pages/Expenses'
import Budgets            from './pages/Budgets'
import Categories         from './pages/Categories'
import Chat               from './pages/Chat'
import RecurringExpenses  from './pages/RecurringExpenses'
import Alerts             from './pages/Alerts'
import Goals              from './pages/Goals'
import SplashScreen       from './components/SplashScreen'
import PeriodSelector     from './components/PeriodSelector'
import { PeriodProvider } from './context/PeriodContext'
import { alertsApi }      from './api/index'
import './index.css'

// Pages that show the period selector in the topbar
const PERIOD_PAGES = ['/', '/expenses', '/budgets']

// ── localStorage helpers ─────────────────────────────────────────────────────
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v } catch { return fallback }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value) } catch { /* sandboxed */ }
}

// ── TopBar ───────────────────────────────────────────────────────────────────
function TopBar({ theme, onToggleTheme, onMenuToggle, sidebarHidden }) {
  const location   = useLocation()
  const showPeriod = PERIOD_PAGES.includes(location.pathname)

  return (
    <div className="topbar">
      <div className="topbar-left">
        {/*
          Hamburger:
          • On mobile   (≤768px): always visible via CSS, opens the drawer
          • On desktop  (>768px): hidden by default; appears when sidebar
                                  is collapsed so user can reopen it
        */}
        <button
          className={`menu-toggle${sidebarHidden ? ' menu-toggle-visible' : ''}`}
          onClick={onMenuToggle}
          aria-label="Toggle navigation sidebar"
          title="Show sidebar"
        >
          ☰
        </button>

        {showPeriod && <PeriodSelector />}
      </div>

      <div className="topbar-right">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  )
}

// ── AppShell ─────────────────────────────────────────────────────────────────
function AppShell({ theme, onToggleTheme }) {
  // Mobile drawer state
  const [menuOpen, setMenuOpen] = useState(false)

  // Desktop sidebar collapsed state — persisted in localStorage
  const [sidebarHidden, setSidebarHidden] = useState(
    () => lsGet('et-sidebar-hidden', '0') === '1'
  )

  // v1.7.0 — Unread alert count for sidebar badge
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  useEffect(() => {
    alertsApi.list(false)
      .then(res => setUnreadAlerts(res.data.unread_count || 0))
      .catch(() => {})
    const timer = setInterval(() => {
      alertsApi.list(false)
        .then(res => setUnreadAlerts(res.data.unread_count || 0))
        .catch(() => {})
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const openMenu  = useCallback(() => setMenuOpen(true),  [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const collapseSidebar = useCallback(() => {
    setSidebarHidden(true)
    lsSet('et-sidebar-hidden', '1')
  }, [])

  const expandSidebar = useCallback(() => {
    setSidebarHidden(false)
    lsSet('et-sidebar-hidden', '0')
    setMenuOpen(false)
  }, [])

  // Unified hamburger handler — desktop shows sidebar, mobile opens drawer
  const handleMenuToggle = useCallback(() => {
    if (window.innerWidth > 768) {
      expandSidebar()
    } else {
      openMenu()
    }
  }, [expandSidebar, openMenu])

  // Close drawer on route change (mobile nav tap)
  const location = useLocation()
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Escape closes mobile drawer
  useEffect(() => {
    if (!menuOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [menuOpen, closeMenu])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div className="app">
      {/* ── Mobile backdrop ── */}
      <div
        className={`sidebar-backdrop${menuOpen ? ' sidebar-open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <nav
        className={[
          'sidebar',
          menuOpen      ? 'sidebar-open'      : '',
          sidebarHidden ? 'sidebar-collapsed' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <div className="logo">
            💰 Expense Tracker
            <span className="logo-version">v1.7</span>
          </div>
        </div>

        <div className="sidebar-nav">
          <span className="nav-section-label">Menu</span>
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/expenses" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">💸</span> Expenses
          </NavLink>
          <NavLink to="/budgets" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🎯</span> Budgets
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🏷️</span> Categories
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">💬</span> Chat AI
          </NavLink>

          <span className="nav-section-label" style={{ marginTop: '0.75rem' }}>v1.7 Features</span>
          <NavLink to="/recurring" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🔄</span> Recurring
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🔔</span> Alerts
            {unreadAlerts > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: 'var(--color-red)',
                color: '#fff',
                borderRadius: '999px',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 6px',
                minWidth: 18,
                textAlign: 'center',
              }}>
                {unreadAlerts}
              </span>
            )}
          </NavLink>
          <NavLink to="/goals" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🏆</span> Goals
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
            Built by{' '}
            <a
              href="https://github.com/Sayu-V/expense-tracker"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontWeight: 600 }}
            >
              Sayu-V
            </a>
            <br />IBM Student Project
          </div>

          {/* Desktop-only collapse button */}
          <button
            className="sidebar-collapse-btn"
            onClick={collapseSidebar}
            title="Collapse sidebar — use ☰ in the topbar to reopen"
          >
            ◀ Collapse
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className={`main-content${sidebarHidden ? ' sidebar-collapsed' : ''}`}>
        <TopBar
          theme={theme}
          onToggleTheme={onToggleTheme}
          onMenuToggle={handleMenuToggle}
          sidebarHidden={sidebarHidden}
        />
        <div className="page-content">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/expenses"   element={<Expenses />} />
            <Route path="/budgets"    element={<Budgets />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/chat"       element={<Chat />} />
            <Route path="/recurring"  element={<RecurringExpenses />} />
            <Route path="/alerts"     element={<Alerts />} />
            <Route path="/goals"      element={<Goals />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [theme, setTheme] = useState(() => lsGet('et-theme', 'light'))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    lsSet('et-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return (
    <>
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}
      <PeriodProvider>
        <BrowserRouter>
          <AppShell theme={theme} onToggleTheme={toggleTheme} />
        </BrowserRouter>
      </PeriodProvider>
    </>
  )
}
