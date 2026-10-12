// Only redirect the former production host. Never carry credentials/query values across origins.
export function primaryAdminDestination(rawUrl: string) {
  const url = new URL(rawUrl)
  if (url.hostname !== 'ug-souq-production.up.railway.app' || !/^\/admin(?:\/|$)/.test(url.pathname)) return null
  const destination = new URL(url.pathname, 'https://www.ugsouq.com')
  const tab = url.searchParams.get('tab')
  if (tab && ['overview','sellers','listings','orders','payments','customers','services','healthcare','plus','accounts','payouts','deliveries','returns','ads','marketing','notifications','affiliates','audit','reports','settings'].includes(tab)) destination.searchParams.set('tab', tab)
  return destination.toString()
}
