import { describe, expect, it } from 'vitest'
import { MySqlDialect, mysqlTable, varchar } from 'drizzle-orm/mysql-core'
import { caseInsensitiveContains, searchPattern } from './searchPolicy'
const rows = mysqlTable('test_products', { name: varchar('name', { length: 128 }) })
const dialect = new MySqlDialect()
describe('search on case-sensitive database collations', () => {
  it('uses LOWER on the database value and the same pattern for different capitalization', () => {
    const lower = dialect.sqlToQuery(caseInsensitiveContains(rows.name, 'matooke'))
    const mixed = dialect.sqlToQuery(caseInsensitiveContains(rows.name, ' Matooke '))
    const upper = dialect.sqlToQuery(caseInsensitiveContains(rows.name, 'MATOOKE'))
    expect(lower).toEqual(mixed); expect(lower).toEqual(upper)
    expect(lower.sql).toContain('LOWER(`test_products`.`name`) LIKE ?')
    expect(lower.params).toEqual(['%matooke%'])
  })
  it('treats percent, underscore and escape characters as literal search text', () => {
    expect(searchPattern('50%_!')).toBe('%50!%!_!!%')
    expect(dialect.sqlToQuery(caseInsensitiveContains(rows.name,'50%')).sql).toContain("ESCAPE '!'")
  })
  it('keeps hostile strings in bound parameters, never in SQL syntax', () => {
    const hostile = "%' OR 1=1 --"
    const query = dialect.sqlToQuery(caseInsensitiveContains(rows.name,hostile))
    expect(query.sql).not.toContain('OR 1=1')
    expect(query.params).toEqual(["%!%' or 1=1 --%"])
  })
})
