// Caracteres que planilhas interpretam como início de fórmula (CSV injection).
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

export const CSV_BOM = '﻿'
export const CSV_HEADER = ['original_url', 'short_url', 'access_count', 'created_at']

export function escapeCsvValue(raw: string | number): string {
  let value = String(raw)

  if (FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    value = `'${value}`
  }

  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

export function toCsvRow(values: Array<string | number>): string {
  return `${values.map(escapeCsvValue).join(',')}\r\n`
}
