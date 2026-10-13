export function serviceContactLinks(phone: string) {
  const compact = phone.replace(/[\s()-]/g, '')
  const international = /^0[7]\d{8}$/.test(compact) ? `+256${compact.slice(1)}`
    : /^7\d{8}$/.test(compact) ? `+256${compact}`
    : /^2567\d{8}$/.test(compact) ? `+${compact}` : compact
  if (!/^\+[1-9]\d{7,14}$/.test(international)) return null
  return { call: `tel:${international}`, whatsapp: `https://wa.me/${international.slice(1)}` }
}
