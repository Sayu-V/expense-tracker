/**
 * components/SplashScreen.jsx
 * ----------------------------
 * v1.4.0 — Animated splash screen shown on every app load.
 *
 * Behaviour:
 *   - Displays for ~3 seconds then auto-dismisses
 *   - "Skip" button lets the user dismiss immediately
 *   - Shows app name, version, features list, GitHub link
 *   - Pure CSS animation — no external libs needed
 */

import { useEffect, useState } from 'react'

const GITHUB_URL = 'https://github.com/Sayu-V/expense-tracker'

const FEATURES = [
  '📊  Track expenses & income',
  '🎯  Budget per category',
  '🤖  AI auto-categorisation',
  '💡  Smart spending insights',
  '📈  Monthly trend charts',
  '💱  Income vs expense balance',
  '✏️  Edit & delete entries',
  '📅  Week / Month / Quarter / Year',
  '🌙  Light & dark theme',
  '📱  Mobile-friendly design',
  '💬  Chat with your data',
  '⬇️  Export data to CSV',
  '🔄  Recurring expenses',
  '🔔  Spending alerts',
  '🏆  Savings goal tracker',
  '📊  Year-over-year comparison',
  '🔮  Predicted monthly spend',
  '😀  Rich emoji category picker',
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
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + step
      })
    }, 50)

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 400)  // wait for fade-out
    }, SPLASH_DURATION)

    return () => { clearInterval(interval); clearTimeout(timer) }
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
      padding: '1rem',
    }}>
      <div style={{
        textAlign: 'center',
        color: '#fff',
        maxWidth: '480px',
        width: '100%',
        padding: '2rem 1.75rem',
        animation: 'splashFadeUp 0.6s ease forwards',
      }}>
        {/* Logo / emoji */}
        <div style={{ fontSize: '3.5rem', marginBottom: '0.4rem', lineHeight: 1 }}>💰</div>

        {/* App name */}
        <h1 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          margin: '0.2rem 0 0.1rem',
          color: '#fff',
        }}>
          Expense Tracker
        </h1>

        {/* Version badge */}
        <span style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '999px',
          padding: '2px 14px',
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          marginBottom: '1.25rem',
        }}>
          v1.9.0
        </span>

        {/* Feature list — 2 cols on wide, 1 col on narrow */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '0.45rem 1rem',
          textAlign: 'left',
          marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '0.9rem 1.1rem',
        }}>
          {FEATURES.map((f) => (
            <div key={f} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)' }}>
              {f}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          height: '3px',
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '999px',
          marginBottom: '1rem',
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

        {/* GitHub link + Skip row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          {/* GitHub CTA */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: '#fff',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            {/* GitHub mark SVG */}
            <svg height="16" width="16" viewBox="0 0 16 16" fill="#fff" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                       0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                       -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                       .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                       -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
                       .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
                       .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
                       0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            View on GitHub
          </a>

          {/* Built-by + Skip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
              by Sayu-V · IBM
            </span>
            <button
              onClick={handleSkip}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: '6px',
                padding: '6px 16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 'auto',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.25)' }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.15)' }}
            >
              Skip →
            </button>
          </div>
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
