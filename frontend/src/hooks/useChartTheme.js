/**
 * hooks/useChartTheme.js
 * -----------------------
 * v1.6.0 — Returns resolved chart colour values from the current CSS theme.
 *
 * Problem: Recharts renders SVG. SVG *presentation attributes* (stroke, fill)
 * do NOT evaluate CSS custom properties — writing stroke="var(--border)"
 * passes a literal string, not the computed colour.
 *
 * This hook:
 *   1. Reads every design-token value from getComputedStyle at mount time.
 *   2. Attaches a MutationObserver on <html data-theme="..."> so whenever the
 *      user toggles light ↔ dark, a state update re-renders charts with the
 *      new resolved colours.
 *
 * Usage:
 *   const ct = useChartTheme()
 *   <CartesianGrid stroke={ct.border} />
 *   <XAxis tick={ct.tickSm} />
 *   <Tooltip contentStyle={ct.tooltipStyle} />
 */

import { useEffect, useState } from 'react'

function readColors() {
  const s   = getComputedStyle(document.documentElement)
  const css = (v) => s.getPropertyValue(v).trim()
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

  const border        = css('--border')          || 'rgba(60,60,67,0.12)'
  const textPrimary   = css('--text-primary')    || '#1C1C1E'
  const textSecondary = css('--text-secondary')  || '#636366'
  const textTertiary  = css('--text-tertiary')   || '#AEAEB2'
  const bgElevated    = css('--bg-elevated')     || '#FFFFFF'
  const bgSurface     = css('--bg-surface')      || '#FFFFFF'
  const accent        = css('--accent')          || '#5E5CE6'
  const accentLight   = css('--accent-light')    || '#EEF0FF'
  const colorGreen    = css('--color-green')     || '#34C759'
  const colorRed      = css('--color-red')       || '#FF3B30'

  // In dark mode --accent-light is rgba(123,121,255,0.15) — nearly invisible as
  // a chart bar fill. Use a solid muted purple instead so "Budget" bars are legible.
  const barBudgetFill = isDark ? 'rgba(123,121,255,0.45)' : accentLight

  return {
    border,
    textPrimary,
    textSecondary,
    textTertiary,
    bgElevated,
    bgSurface,
    accent,
    accentLight,
    barBudgetFill,   // solid version of accentLight — readable in both dark and light
    colorGreen,
    colorRed,

    // ── Pre-built prop objects ready to spread onto Recharts elements ──────

    /** Pass to <CartesianGrid stroke={ct.border} /> */
    gridStroke: border,

    /** Pass to <XAxis tick={ct.tickSm} /> */
    tickSm: { fontSize: 11, fill: textSecondary },

    /** Pass to <YAxis tick={ct.tickMd} /> (category axis labels) */
    tickMd: { fontSize: 12, fill: textPrimary },

    /** Pass to <Tooltip contentStyle={ct.tooltipStyle} /> */
    tooltipStyle: {
      background:   bgElevated,
      border:       `1px solid ${border}`,
      borderRadius: '10px',
      color:        textPrimary,
      fontSize:     '0.82rem',
      boxShadow:    '0 4px 16px rgba(0,0,0,0.12)',
    },

    /** Pass to <Legend wrapperStyle={ct.legendStyle} /> */
    legendStyle: { fontSize: '0.8rem', color: textSecondary },

    /** Stroke for pie chart label lines */
    labelLineStroke: textTertiary,

    /**
     * Pass to <Tooltip labelStyle={ct.tooltipLabelStyle} />
     * Fixes: Recharts renders the label text with its own inline style
     * that overrides CSS cascading from contentStyle — this ensures the
     * label (category / axis key) uses the correct resolved colour.
     */
    tooltipLabelStyle: { color: textPrimary, fontWeight: 600 },

    /**
     * Pass to <Tooltip itemStyle={ct.tooltipItemStyle} />
     * Fixes: each row in the tooltip (the value lines) has its own
     * inline style that must be set explicitly for dark mode.
     */
    tooltipItemStyle: { color: textSecondary },
  }
}

export function useChartTheme() {
  const [colors, setColors] = useState(readColors)

  useEffect(() => {
    const refresh = () => setColors(readColors())

    // Re-compute whenever the data-theme attribute on <html> changes
    const observer = new MutationObserver(refresh)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  return colors
}
