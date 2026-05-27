const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MONTHS_FULL  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export function fmt(n: number): string {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
}

export function fmtTgl(s: string): string {
  if (!s || s === '-') return '-'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return `${d.getUTCDate()} ${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function fmtTime(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const date = fmtTgl(d.toISOString().split('T')[0])
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${date} ${hh}:${mm}`
}

export { MONTHS_SHORT, MONTHS_FULL }
