// Match name fragments independently, including a surname initial.
export function customerMatchesSearch(customer: { name: string; phone: string; email?: string | null }, search: string) {
  const normalise = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim()
  const terms = normalise(search).split(/\s+/).filter(Boolean)
  const words = normalise(customer.name).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const phone = customer.phone.replace(/\D/g, '')
  return terms.every(term => words.some(word => word.startsWith(term)) || (/^[+()0-9-]+$/.test(term) && /[0-9]/.test(term) && phone.includes(term.replace(/\D/g, ''))) || !!customer.email && normalise(customer.email).includes(term))
}
