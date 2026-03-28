/**
 * components/SplashScreen.jsx
 * ----------------------------
 * v2.2.0 — Animated splash screen shown on every app load.
 *
 * Behaviour:
 *   - Displays for ~7 seconds then auto-dismisses
 *   - "Skip" button lets the user dismiss immediately
 *   - Rotating financial quote at the top
 *   - Kanban-style feature board organised by category
 *   - Pure CSS animation — no external libs needed
 */

import { useEffect, useState } from 'react'

const GITHUB_URL = 'https://github.com/Sayu-V/expense-tracker'

const QUOTES = [
  { text: 'Do not save what is left after spending, but spend what is left after saving.', author: 'Warren Buffett' },
  { text: 'A budget is telling your money where to go instead of wondering where it went.', author: 'Dave Ramsey' },
  { text: 'Beware of little expenses; a small leak will sink a great ship.', author: 'Benjamin Franklin' },
  { text: "It's not how much money you make, but how much money you keep.", author: 'Robert Kiyosaki' },
  { text: 'Financial freedom is available to those who learn about it and work for it.', author: 'Robert Kiyosaki' },
  { text: 'The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order.', author: 'T.T. Munger' },
]

// Kanban board: each column = a feature category
const KANBAN = [
  {
    title: 'Core Tracking',
    icon: '📊',
    color: '#6366F1',
    items: [
      '📊  Track expenses & income',
      '✏️  Edit & delete entries',
      '📅  Week / Month / Quarter / Year',
      '🔄  Recurring expenses',
      '⬇️  Export data to CSV',
    ],
  },
  {
    title: 'Budgets & Goals',
    icon: '🎯',
    color: '#10B981',
    items: [
      '🎯  Budget per category',
      '🏆  Savings goal tracker',
      '🔔  Spending alerts',
      '💱  Income vs expense balance',
    ],
  },
  {
    title: 'Analytics',
    icon: '📈',
    color: '#F59E0B',
    items: [
      '📈  Monthly trend charts',
      '💡  Smart spending insights',
      '📊  Year-over-year comparison',
      '🔮  Predicted monthly spend',
    ],
  },
  {
    title: 'AI & Import',
    icon: '🤖',
    color: '#EC4899',
    items: [
      '🤖  AI auto-categorisation',
      '💬  Chat with your data',
      '📥  Bank statement import (PDF & CSV)',
      '⚙️  Import Rules — smart auto-categorisation',
      '🏷️  Income sources & auto-classification',
    ],
  },
  {
    title: 'Design & Tech',
    icon: '🎨',
    color: '#8B5CF6',
    items: [
      '🌙  Light & dark theme',
      '📱  Mobile-friendly design',
      '😀  Rich emoji category picker',
      '📶  PWA offline mode',
      '📄  Cursor-based pagination',
    ],
  },
]

const SPLASH_DURATION = 7000  // ms before auto-dismiss

export default function SplashScreen({ onDismiss }) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  // Pick a random quote on mount
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

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
      overflowY: 'auto',
    }}>
      <div style={{
        textAlign: 'center',
        color: '#fff',
        maxWidth: '900px',
        width: '100%',
        padding: '2rem 1.75rem',
        animation: 'splashFadeUp 0.6s ease forwards',
      }}>

        {/* ── Header row: logo + title + version ─────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>💰</span>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{
              fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              margin: 0,
              color: '#fff',
              lineHeight: 1.1,
            }}>
              Expense Tracker
            </h1>
            <span style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '999px',
              padding: '1px 10px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              marginTop: '3px',
            }}>
              v2.2.0
            </span>
          </div>
        </div>

        {/* ── Financial quote ─────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '10px',
          padding: '0.7rem 1.2rem',
          marginBottom: '1.2rem',
          marginTop: '0.8rem',
        }}>
          <p style={{
            fontStyle: 'italic',
            fontSize: 'clamp(0.78rem, 2vw, 0.9rem)',
            color: 'rgba(255,255,255,0.92)',
            margin: '0 0 0.3rem',
            lineHeight: 1.5,
          }}>
            "{quote.text}"
          </p>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.3px',
          }}>
            — {quote.author}
          </span>
        </div>

        {/* ── Kanban board ────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '0.7rem',
          marginBottom: '1.3rem',
          textAlign: 'left',
        }}>
          {KANBAN.map((col) => (
            <div key={col.title} style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}>
              {/* Column header */}
              <div style={{
                background: col.color,
                padding: '0.35rem 0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}>
                <span style={{ fontSize: '0.85rem' }}>{col.icon}</span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                }}>
                  {col.title}
                </span>
              </div>

              {/* Feature cards */}
              <div style={{ padding: '0.45rem 0.55rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {col.items.map((item) => (
                  <div key={item} style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '5px',
                    padding: '0.28rem 0.5rem',
                    fontSize: '0.73rem',
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.35,
                  }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Progress bar ────────────────────────────────────────────── */}
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

        {/* ── GitHub link + Skip row ───────────────────────────────────── */}
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
