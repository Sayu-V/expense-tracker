/**
 * App.jsx
 * --------
 * v1.4.0:
 *   - Mobile-responsive: hamburger → slide-in sidebar drawer + backdrop
 *   - Sidebar auto-closes when a nav link is tapped on mobile
 *   - Version badge updated to v1.4
 *   - Persistent theme preference via localStorage (with fallback)
 * v1.5.0:
 *   - Chat page added (💬 Chat with your data)
 *   - Version badge updated to v1.5
 */

import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Dashboard    from './pages/Dashboard'
import Expenses     from './pages/Expenses'
import Budgets      from './pages/Budgets'
import Categories   from './pages/Categories'
import Chat         from './pages/Chat'
import SplashScreen from './components/SplashScreen'
import PeriodSelector from './components/PeriodSelector'
import { PeriodProvider } from './context/PeriodContext'
import './index.css'

// Pages that show the period selector in the topbar
const PERIOD_PAGES = ['/', '/expenses', '/budgets']

// ── Helper: read/write theme from localStorage safely ───────────────────────
function getSavedTheme() {
  try { return localStorage.getItem('et-theme') || 'light' } catch { return 'light' }
}
function saveTheme(t) {
  try { localStorage.setItem('et-theme', t) } catch { /* sandboxed — ignore */ }
}

// ── TopBar ──────────────────────────────────────────────────────────────────
function TopBar({ theme, onToggleTheme, onOpenMenu }) {
  const location  = useLocation()
  const showPeriod = PERIOD_PAGES.includes(location.pathname)

  return (
    <div className="topbar">
      <div className="topbar-left">
        {/* Hamburger — visible only on mobile via CSS */}
        <button
          className="menu-toggle"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
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
  const [menuOpen, setMenuOpen] = useState(false)

  const openMenu  = useCallback(() => setMenuOpen(true),  [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close sidebar on route change (mobile nav tap)
  const location = useLocation()
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Close on Escape key
  useEffect(() => {
    if (!menuOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [menuOpen, closeMenu])

  // Prevent body scroll when drawer is open (mobile)
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div className="app">
      {/* ── Sidebar backdrop (mobile only) ── */}
      <div
        className={`sidebar-backdrop${menuOpen ? ' sidebar-open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <nav className={`sidebar${menuOpen ? ' sidebar-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="logo">
            💰 Expense Tracker
            <span className="logo-version">v1.5</span>
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
        </div>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
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
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="main-content">
        <TopBar theme={theme} onToggleTheme={onToggleTheme} onOpenMenu={openMenu} />
        <div className="page-content">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/expenses"   element={<Expenses />} />
            <Route path="/budgets"    element={<Budgets />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/chat"       element={<Chat />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  // Theme — persisted in localStorage where available, falls back to 'light'
  const [theme, setTheme] = useState(getSavedTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    saveTheme(theme)
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
