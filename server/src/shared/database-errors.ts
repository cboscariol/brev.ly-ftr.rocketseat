const UNIQUE_VIOLATION = '23505'

// O Drizzle envolve o erro do driver em `cause`; procura o código em toda a cadeia.
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error

  while (current && typeof current === 'object') {
    if ('code' in current && current.code === UNIQUE_VIOLATION) return true
    current = 'cause' in current ? current.cause : undefined
  }

  return false
}
