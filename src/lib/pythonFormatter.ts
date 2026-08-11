/**
 * Python Code Formatter (Black / PEP 8 Style Engine)
 * Automatically formats Python code blocks with standard 4-space indentation,
 * operator spacing, comment normalization, and clean line separation.
 */

export function formatPythonCode(sourceCode: string): string {
  if (!sourceCode || !sourceCode.trim()) return sourceCode;

  // Normalize line endings
  const lines = sourceCode.replace(/\r\n/g, '\n').split('\n');
  const formattedLines: string[] = [];

  let indentLevel = 0;
  let inMultiLineString = false;
  let multiLineQuote = '';
  let consecutiveEmptyLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Preserve multiline strings (''' or """)
    if (inMultiLineString) {
      formattedLines.push(rawLine);
      if (trimmed.includes(multiLineQuote)) {
        const matches = (trimmed.match(new RegExp(multiLineQuote === '"""' ? '"""' : "'''", 'g')) || []).length;
        if (matches % 2 !== 0) {
          inMultiLineString = false;
          multiLineQuote = '';
        }
      }
      continue;
    }

    // Check for multiline string start
    const tripleDoubleMatches = (trimmed.match(/"""/g) || []).length;
    const tripleSingleMatches = (trimmed.match(/'''/g) || []).length;

    if (tripleDoubleMatches % 2 !== 0) {
      inMultiLineString = true;
      multiLineQuote = '"""';
    } else if (tripleSingleMatches % 2 !== 0) {
      inMultiLineString = true;
      multiLineQuote = "'''";
    }

    // Handle Empty Lines
    if (!trimmed) {
      consecutiveEmptyLines++;
      if (consecutiveEmptyLines <= 2) {
        formattedLines.push('');
      }
      continue;
    }
    consecutiveEmptyLines = 0;

    // Check for de-indentation keywords or closing brackets
    const isDeindentKeyword = /^(elif\b|else\b|except\b|finally\b)/.test(trimmed);
    const isClosingBracket = /^[}\]\)]/.test(trimmed);

    if (isDeindentKeyword || isClosingBracket) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Format spacing inside line
    const formattedLineContent = formatLineSpacing(trimmed);

    // Apply 4-space indentation level
    const currentIndent = ' '.repeat(indentLevel * 4);
    formattedLines.push(`${currentIndent}${formattedLineContent}`);

    // Determine if next lines should increase indentation
    // Block openers ending with colon ':' (e.g. def, class, if, for, while, with, try, except, else)
    const isBlockOpener = /:\s*(#.*)?$/.test(trimmed) && !trimmed.startsWith('#');

    // Count open/close bracket imbalance
    const openBrackets = (trimmed.match(/[\(\[\{]/g) || []).length;
    const closeBrackets = (trimmed.match(/[\)\]\}]/g) || []).length;
    const bracketImbalance = openBrackets - closeBrackets;

    if (isBlockOpener || bracketImbalance > 0) {
      indentLevel++;
    } else if (isDeindentKeyword) {
      // Re-indent body of elif/else/except/finally
      indentLevel++;
    }
  }

  // Join lines and clean up excessive trailing newlines
  let result = formattedLines.join('\n');

  // Enforce single trailing newline
  result = result.trimEnd() + '\n';

  return result;
}

/**
 * Normalizes spacing for operators, commas, and comments inside a line
 */
function formatLineSpacing(line: string): string {
  // If line is purely a comment, normalize comment prefix `# `
  if (line.startsWith('#')) {
    return line.replace(/^#([^\s#])/, '# $1');
  }

  // Split code and inline comment
  let codePart = line;
  let commentPart = '';

  let inQuote = false;
  let quoteChar = '';
  let commentIdx = -1;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && (i === 0 || line[i - 1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = ch;
      } else if (quoteChar === ch) {
        inQuote = false;
      }
    } else if (ch === '#' && !inQuote) {
      commentIdx = i;
      break;
    }
  }

  if (commentIdx !== -1) {
    codePart = line.substring(0, commentIdx).trimEnd();
    const rawComment = line.substring(commentIdx);
    commentPart = '  ' + rawComment.replace(/^#([^\s#])/, '# $1');
  }

  // 1. Ensure space after comma: e.g., `a,b,c` -> `a, b, c`
  codePart = codePart.replace(/,([^\s\)\],])/g, ', $1');

  // 2. Ensure spacing around binary comparison and assignment operators (`==`, `!=`, `<=`, `>=`, `+=`, `-=`, `*=`, `/=`, `=`)
  // Avoid replacing inside quotes or keyword arguments in functions
  codePart = codePart.replace(/([^=!<>\s])\s*([=+\-*/%]=|==|!=|<=|>=)\s*([^=!<>\s])/g, '$1 $2 $3');

  // 3. Ensure space after colon in dictionaries / type hints if not inside slice
  codePart = codePart.replace(/:(?=[^\s:\]\)])/g, ': ');

  return codePart + commentPart;
}
