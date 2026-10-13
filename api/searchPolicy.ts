import { sql } from 'drizzle-orm'
import type { SQLWrapper } from 'drizzle-orm'

// Binary/case-sensitive MySQL and TiDB collations must return the same matches.
// Escape SQL wildcard characters so user text is searched literally.
export function searchPattern(value: string) {
  const term = value.trim().toLowerCase().replace(/[!%_]/g, char => `!${char}`)
  return `%${term}%`
}
export function caseInsensitiveContains(column: SQLWrapper, value: string) {
  return sql`LOWER(${column}) LIKE ${searchPattern(value)} ESCAPE '!'`
}
