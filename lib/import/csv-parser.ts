/**
 * In-memory CSV parser for the spreadsheet-import feature.
 *
 * Why not the existing `csv-parser` package: that one's a Node
 * stream parser. Our import endpoints receive the file as a JSON
 * string, parse it once, and produce row arrays — synchronous and
 * small. Wrapping a stream around it would be more code and
 * complexity than the parsing itself.
 *
 * Handles the standard CSV cases that real spreadsheet exports
 * produce:
 *   - Comma- or semicolon-separated values (UK / EU exports use ;)
 *   - Double-quoted fields, with embedded commas and escaped
 *     quotes (`""` inside `"..."` becomes `"`)
 *   - CRLF (Windows / Excel) and LF (Unix / Sheets) line endings
 *   - Trailing newline at end of file (ignored)
 *   - Empty trailing fields ("a,b,," → ['a', 'b', '', ''])
 *
 * Caveats:
 *   - Auto-detects comma vs semicolon by which appears more often
 *     in the header line. Tab-separated files (.tsv) work too if
 *     the header has tabs as the dominant separator.
 *   - Doesn't strip a UTF-8 BOM from the first cell of the header
 *     — handle that via .trim() at the consumer if needed.
 */

export interface ParsedCsv {
  /** Column headers from the first non-empty row, trimmed. */
  headers: string[]
  /** Each row as { header → cell value }. Rows shorter than the
   *  header row pad with empty strings; rows longer drop extras. */
  rows: Record<string, string>[]
}

export const MAX_PREVIEW_ROWS = 5
export const MAX_IMPORT_ROWS = 1000

function detectSeparator(headerLine: string): string {
  const counts = {
    ',': (headerLine.match(/,/g) || []).length,
    ';': (headerLine.match(/;/g) || []).length,
    '\t': (headerLine.match(/\t/g) || []).length,
  }
  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t'
  if (counts[';'] > counts[',']) return ';'
  return ','
}

/** Tokenize one row, respecting double-quoted fields. */
function parseRow(line: string, separator: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote: emit one quote, skip the next char.
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === separator) {
        cells.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  cells.push(current)
  return cells.map((c) => c.trim())
}

/**
 * Split text into logical CSV lines. Honors newlines that fall
 * inside quoted fields — those don't terminate the row.
 */
function splitLines(text: string): string[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      // Toggle quote state, accounting for escaped doubles.
      if (inQuotes && text[i + 1] === '"') {
        current += '""'
        i++
        continue
      }
      inQuotes = !inQuotes
      current += ch
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
      // Line break outside quotes terminates the row. Skip the
      // \n that follows a \r so CRLF counts as one break.
      if (ch === '\r' && text[i + 1] === '\n') i++
      lines.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.length > 0) lines.push(current)
  return lines.filter((l) => l.length > 0)
}

export function parseCsvText(csv: string): ParsedCsv {
  const lines = splitLines(csv)
  if (lines.length === 0) return { headers: [], rows: [] }

  // Strip a UTF-8 BOM that Excel sometimes prepends.
  if (lines[0].charCodeAt(0) === 0xfeff) {
    lines[0] = lines[0].slice(1)
  }

  const separator = detectSeparator(lines[0])
  const headers = parseRow(lines[0], separator)

  const rows: Record<string, string>[] = []
  for (let r = 1; r < lines.length; r++) {
    const cells = parseRow(lines[r], separator)
    // Skip rows that are entirely empty after parsing — common in
    // hand-edited spreadsheets with trailing blank lines.
    if (cells.every((c) => c === '')) continue
    const row: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = cells[c] ?? ''
    }
    rows.push(row)
  }

  return { headers, rows }
}
