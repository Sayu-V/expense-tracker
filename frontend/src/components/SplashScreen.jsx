/**
 * components/SplashScreen.jsx
 * ----------------------------
 * v1.1.0 — Animated splash screen shown on every app load.
 *
 * Behaviour:
 *   - Displays for ~3 seconds then auto-dismisses
 *   - "Skip" button lets the user dismiss immediately
 *   - Shows app name, version, features list, Built-by & GitHub link
 *   - Pure CSS animation — no external libs needed
 */

import { useEffect, useState } from 'react'

const FEATURES = [
  '📊  Track expenses & income',
  '🎯  Budget per category',
  '🤖  AI auto-categorisation',
  '💡  Smart spending insights',
  '📈  Monthly trend charts',
  '💱  Income vs expense balance',
]

const SPLASH_DURATION = 3000  // ms before auto-dismiss

export default function SplashScreen({ onDismiss }) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Progress bar animation
    const step = 100 / (SPLASH_DURATION / 50)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          return 100
        }
        return p + step
      })
    }, 50)

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 400)  // wait for fade-out
    }, SPLASH_DURATION)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [onDismiss])

  const handleSkip = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{
        textAlign: 'center',
        color: '#fff',
        maxWidth: '460px',
        padding: '2.5rem 2rem',
        animation: 'splashFadeUp 0.6s ease forwards',
      }}>
        {/* Logo / emoji */}
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem', lineHeight: 1 }}>💰</div>

        {/* App name */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          margin: '0.25rem 0 0.1rem',
          color: '#fff',
        }}>
          Expense Tracker
        </h1>

        {/* Version badge */}
        <span style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '999px',
          padding: '2px 12px',
          fontSize: '0.78rem',
          fontWeight: 600,
          letterSpacing: '0.5px',
          marginBottom: '1.75rem',
        }}>
          v1.1.0
        </span>

        {/* Feature list */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.55rem 1.25rem',
          textAlign: 'left',
          marginBottom: '2rem',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
        }}>
          {FEATURES.map((f) => (
            <div key={f} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
              {f}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          height: '3px',
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '999px',
          marginBottom: '1.25rem',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#fff',
            borderRadius: '999px',
            transition: 'width 0.05s linear',
          }} />
        </div>

        {/* Built by + skip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
            Built by{' '}
            <a
              href="https://github.com/Sayu-V/expense-tracker"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#fff', fontWeight: 700, textDecoration: 'none' }}
            >
              Sayu-V
            </a>
            {' '}· IBM Student Project
          </span>
          <button
            onClick={handleSkip}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: '6px',
              padding: '5px 16px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.15)' }}
          >
            Skip →
          </button>
        </div>
      </div>

      {/* Keyframe injected inline */}
      <style>{`
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
