/**
 * components/SplashScreen.jsx
 * ----------------------------
 * v2.3.0 — Minimal 3D splash: quote · app name · version.
 *
 * Visual effects:
 *   - Deep perspective background with floating orbs
 *   - Glass-morphism card with CSS 3D float + tilt animation
 *   - Subtle inner glow and shimmer on the card border
 *   - Progress bar auto-dismiss after SPLASH_DURATION ms
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

const SPLASH_DURATION = 7000

export default function SplashScreen({ onDismiss }) {
  const [progress, setProgress]   = useState(0)
  const [visible,  setVisible]    = useState(true)
  const [quote]                   = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  useEffect(() => {
    const step = 100 / (SPLASH_DURATION / 50)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + step
      })
    }, 50)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 500)
    }, SPLASH_DURATION)
    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [onDismiss])

  const handleSkip = () => {
    setVisible(false)
    setTimeout(onDismiss, 400)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 40%, #312e81 0%, #1e1b4b 45%, #0f0e1a 100%)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease',
      perspective: '900px',
      overflow: 'hidden',
    }}>

      {/* ── Ambient floating orbs ─────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 380, height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
          top: '-80px', left: '-60px',
          animation: 'orbFloat1 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.28) 0%, transparent 70%)',
          bottom: '-60px', right: '5%',
          animation: 'orbFloat2 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 180, height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)',
          top: '55%', left: '60%',
          animation: 'orbFloat3 12s ease-in-out infinite',
        }} />
      </div>

      {/* ── 3D glass card ─────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '420px',
        padding: '0 1.25rem',
        animation: 'cardFloat 6s ease-in-out infinite',
        transformStyle: 'preserve-3d',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '20px',
          padding: '2.25rem 2rem 1.5rem',
          boxShadow: `
            0 8px 48px rgba(0,0,0,0.55),
            0 0 0 1px rgba(255,255,255,0.06) inset,
            0 1px 0 rgba(255,255,255,0.18) inset
          `,
          textAlign: 'center',
          color: '#fff',
        }}>

          {/* ── Quote ───────────────────────────────────────────── */}
          <div style={{ marginBottom: '2rem' }}>
            {/* Opening quote mark */}
            <div style={{
              fontSize: '3.5rem',
              lineHeight: 0.6,
              color: 'rgba(99,102,241,0.7)',
              fontFamily: 'Georgia, serif',
              marginBottom: '0.6rem',
              userSelect: 'none',
            }}>
              "
            </div>
            <p style={{
              fontStyle: 'italic',
              fontSize: 'clamp(0.82rem, 2.5vw, 0.96rem)',
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.88)',
              margin: '0 0 0.9rem',
              letterSpacing: '0.01em',
            }}>
              {quote.text}
            </p>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
            }}>
              — {quote.author}
            </span>
          </div>

          {/* ── Divider ─────────────────────────────────────────── */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
            marginBottom: '1.6rem',
          }} />

          {/* ── App identity ────────────────────────────────────── */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{
              fontSize: '2.4rem',
              marginBottom: '0.5rem',
              filter: 'drop-shadow(0 0 14px rgba(99,102,241,0.6))',
              animation: 'iconPulse 3s ease-in-out infinite',
            }}>
              💰
            </div>
            <h1 style={{
              fontSize: 'clamp(1.3rem, 4vw, 1.7rem)',
              fontWeight: 800,
              margin: '0 0 0.45rem',
              letterSpacing: '-0.5px',
              color: '#fff',
              textShadow: '0 2px 20px rgba(99,102,241,0.4)',
            }}>
              Expense Tracker
            </h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                borderRadius: '999px',
                padding: '3px 14px',
                fontSize: '0.73rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(99,102,241,0.5)',
              }}>
                v2.3.0
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.3px',
              }}>
                by Sayu-V
              </span>
            </div>
          </div>

          {/* ── Progress bar ────────────────────────────────────── */}
          <div style={{
            height: '2px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '999px',
            marginBottom: '1.1rem',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)',
              borderRadius: '999px',
              transition: 'width 0.05s linear',
              boxShadow: '0 0 8px rgba(99,102,241,0.7)',
            }} />
          </div>

          {/* ── Footer row ──────────────────────────────────────── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'rgba(255,255,255,0.45)',
                fontSize: '0.72rem',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
            >
              <svg height="13" width="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                         0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                         -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                         .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                         -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
                         .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
                         .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
                         0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>

            <button
              onClick={handleSkip}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: '8px',
                padding: '5px 16px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 'auto',
                letterSpacing: '0.3px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.16)'
                e.target.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.08)'
                e.target.style.color = 'rgba(255,255,255,0.7)'
              }}
            >
              Enter →
            </button>
          </div>

        </div>
      </div>

      {/* ── Keyframes ────────────────────────────────────────────── */}
      <style>{`
        @keyframes cardFloat {
          0%   { transform: translateY(0px)   rotateX(1deg)  rotateY(-1deg); }
          25%  { transform: translateY(-9px)  rotateX(-1deg) rotateY(1.5deg); }
          50%  { transform: translateY(-14px) rotateX(2deg)  rotateY(-0.5deg); }
          75%  { transform: translateY(-7px)  rotateX(-0.5deg) rotateY(1deg); }
          100% { transform: translateY(0px)   rotateX(1deg)  rotateY(-1deg); }
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0,   0)   scale(1); }
          50%       { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0,   0)   scale(1); }
          50%       { transform: translate(-30px, -20px) scale(1.12); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0,  0); }
          50%       { transform: translate(20px, -25px); }
        }
        @keyframes iconPulse {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(99,102,241,0.5)); transform: scale(1); }
          50%       { filter: drop-shadow(0 0 22px rgba(139,92,246,0.8)); transform: scale(1.06); }
        }
      `}</style>
    </div>
  )
}
