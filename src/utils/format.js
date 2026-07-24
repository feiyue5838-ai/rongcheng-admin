/**
 * 格式化日期
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 手机号脱敏
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone || phone.length !== 11) return phone
  return phone.slice(0, 3) + '****' + phone.slice(7)
}
