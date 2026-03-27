/**
 * App.jsx
 * --------
 * v1.3.0:
 *   - PeriodProvider wraps entire app (Dashboard, Expenses, Budgets share period)
 *   - Topbar with PeriodSelector + Light/Dark theme toggle
 *   - Categories page added
 *   - Splash screen on every load
 */

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard    from './pages/Dashboard'
import Expenses     from './pages/Expenses'
import Budgets      from './pages/Budgets'
import Categories   from './pages/Categories'
import SplashScreen from './components/SplashScreen'
import PeriodSelector from './components/PeriodSelector'
import { PeriodProvider } from './context/PeriodContext'
import './index.css'

// Pages that show the period selector in the topbar
const PERIOD_PAGES = ['/', '/expenses', '/budgets']

function TopBar({ theme, onToggleTheme }) {
  const location = useLocation()
  const showPeriod = PERIOD_PAGES.includes(location.pathname)

  return (
    <div className="topbar">
      <div className="topbar-left">
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

function AppShell({ theme, onToggleTheme }) {
  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            💰 Expense Tracker
            <span className="logo-version">v1.3</span>
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
        </div>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
            Built by Sayu-V<br />IBM Student Project
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="main-content">
        <TopBar theme={theme} onToggleTheme={onToggleTheme} />
        <div className="page-content">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/expenses"    element={<Expenses />} />
            <Route path="/budgets"     element={<Budgets />} />
            <Route path="/categories"  element={<Categories />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  // ── Dark / Light theme ──────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    // Persist preference across reloads via a simple in-memory default.
    // (localStorage not available in this environment — defaults to light)
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
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
