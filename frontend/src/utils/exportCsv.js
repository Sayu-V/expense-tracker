/**
 * utils/exportCsv.js
 * -------------------
 * v1.5.0 — Client-side CSV export utility.
 *
 * Usage:
 *   exportCsv('expenses-march-2026', expenses, [
 *     { key: 'date',        label: 'Date' },
 *     { key: 'description', label: 'Description' },
 *     { key: 'amount',      label: 'Amount (₹)' },
 *     { key: 'type',        label: 'Type' },
 *     { key: col => col.category?.name ?? '', label: 'Category' },
 *   ])
 *
 * Each column definition is either:
 *   { key: string,    label: string }  — reads row[key] directly
 *   { key: Function,  label: string }  — calls key(row) to get the value
 */

function escapeCell(value) {
  const str = value == null ? '' : String(value)
  // Wrap in quotes if value contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * @param {string} filename   — downloaded file name (without .csv)
 * @param {Array}  rows       — array of data objects
 * @param {Array}  columns    — array of { key: string|Function, label: string }
 */
export function exportCsv(filename, rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',')

  const body = rows.map((row) =>
    columns
      .map((col) => {
        const raw = typeof col.key === 'function' ? col.key(row) : row[col.key]
        return escapeCell(raw)
      })
      .join(',')
  )

  const csv = [header, ...body].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })  // BOM for Excel
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${filename}.csv`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
