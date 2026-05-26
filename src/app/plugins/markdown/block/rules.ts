import { BlockMDRule } from './type';

const HEADING_REG_1 = /^(#{1,6}) +(.+)\n?/m;
export const HeadingRule: BlockMDRule = {
  match: (text) => text.match(HEADING_REG_1),
  html: (match, parseInline) => {
    const [, g1, g2] = match;
    const level = g1.length;
    return `<h${level} data-md="${g1}">${parseInline ? parseInline(g2) : g2}</h${level}>`;
  },
};

// opening fence: 3 or more backticks
// capture the exact fence length in group 1
// optional info string in group 2
// code content in group 3
// closing fence must match the exact same fence sequence via \1
const CODEBLOCK_REG_1 = /^(`{3,})(?!`)(\S*)\n((?:.*\n)+?)\1 *(?!.)\n?/m;
export const CodeBlockRule: BlockMDRule = {
  match: (text) => text.match(CODEBLOCK_REG_1),
  html: (match) => {
    const [, fence, g1, g2] = match;
    // use last identifier after dot, e.g. for "example.json" gets us "json" as language code.
    const langCode = g1 ? g1.substring(g1.lastIndexOf('.') + 1) : null;
    const filename = g1 !== langCode ? g1 : null;
    const classNameAtt = langCode ? ` class="language-${langCode}"` : '';
    const filenameAtt = filename ? ` data-label="${filename}"` : '';
    return `<pre data-md="${fence}"><code${classNameAtt}${filenameAtt}>${g2}</code></pre>`;
  },
};

const isTableDelimiterCell = (cell: string): boolean => {
  const trimmed = cell.trim();
  if (trimmed === '') return false;
  // GFM table delimiter cell: --- , :--- , ---: , :---:
  return /^:?-{3,}:?$/.test(trimmed);
};

const splitTableRow = (rowText: string): string[] => {
  const trimmed = rowText.trim();
  const raw = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const content = raw.endsWith('|') ? raw.slice(0, -1) : raw;

  const cells: string[] = [];
  let current = '';

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];
    if (ch === '\\' && next === '|') {
      current += '|';
      i += 1;
      continue;
    }
    if (ch === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
};

const TABLE_REG_G =
  /^([^\n]*\|[^\n]*)\r?\n([ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*)\r?\n((?:(?:[^\n]*\|[^\n]*)(?:\r?\n|$))*)/gm;
export const TableRule: BlockMDRule = {
  match: (text) => {
    TABLE_REG_G.lastIndex = 0;
    for (let match = TABLE_REG_G.exec(text); match !== null; match = TABLE_REG_G.exec(text)) {
      const headerCells = splitTableRow(match[1]);
      const delimiterCells = splitTableRow(match[2]);
      if (headerCells.length < 2 || delimiterCells.length < 2) continue;
      if (!delimiterCells.every(isTableDelimiterCell)) continue;
      return match;
    }
    return null;
  },
  html: (match, parseInline) => {
    const [, headerLine, delimiterLine, bodyBlock = ''] = match;

    const headerCells = splitTableRow(headerLine);
    const delimiterCells = splitTableRow(delimiterLine);
    if (headerCells.length < 2 || delimiterCells.length < 2) return match[0];
    if (!delimiterCells.every(isTableDelimiterCell)) return match[0];

    const bodyLines = bodyBlock
      .replace(/\r?\n$/, '')
      .split(/\r?\n/)
      .filter((l) => l.trim() !== '');

    const colCount = Math.max(headerCells.length, delimiterCells.length);

    const thead = `<thead><tr>${Array.from({ length: colCount })
      .map((_, i) => {
        const rawCell = (headerCells[i] ?? '').trim();
        const content = parseInline ? parseInline(rawCell) : rawCell;
        return `<th>${content}</th>`;
      })
      .join('')}</tr></thead>`;

    const tbodyRows = bodyLines
      .map((line) => {
        const rowCells = splitTableRow(line);
        const tds = Array.from({ length: colCount })
          .map((_, i) => {
            const rawCell = (rowCells[i] ?? '').trim();
            const content = parseInline ? parseInline(rawCell) : rawCell;
            return `<td>${content}</td>`;
          })
          .join('');
        return `<tr>${tds}</tr>`;
      })
      .join('');

    const tbody = tbodyRows ? `<tbody>${tbodyRows}</tbody>` : '';
    return `<table>${thead}${tbody}</table>`;
  },
};

const BLOCKQUOTE_MD_1 = '>';
const QUOTE_LINE_PREFIX = /^> */;
const BLOCKQUOTE_TRAILING_NEWLINE = /\n$/;
const BLOCKQUOTE_REG_1 = /(^>.*\n?)+/m;
export const BlockQuoteRule: BlockMDRule = {
  match: (text) => text.match(BLOCKQUOTE_REG_1),
  html: (match, parseInline) => {
    const [blockquoteText] = match;

    const lines = blockquoteText
      .replace(BLOCKQUOTE_TRAILING_NEWLINE, '')
      .split('\n')
      .map((lineText) => {
        const line = lineText.replace(QUOTE_LINE_PREFIX, '');
        if (parseInline) return `${parseInline(line)}<br/>`;
        return `${line}<br/>`;
      })
      .join('');
    return `<blockquote data-md="${BLOCKQUOTE_MD_1}">${lines}</blockquote>`;
  },
};

const ORDERED_LIST_MD_1 = '-';
const UNORDERED_LIST_MD_1 = '*';
const LIST_ITEM_REG = /^( *)([-*]|[\da-zA-Z]\.) +(.+)$/;
type ListType = 'ol' | 'ul';

function getListType(marker: string): ListType {
  return marker === '*' ? 'ul' : 'ol';
}

function getOrderedMeta(marker: string) {
  const startMatch = marker.match(/^(\d)\./);
  const typeMatch = marker.match(/^([aAiI])\./);

  return {
    start: startMatch?.[1],
    type: typeMatch?.[1],
  };
}

interface ParsedLine {
  indent: number;
  marker: string;
  content: string;
  listType: ListType;
}

function parseLines(text: string): ParsedLine[] {
  return text
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => {
      const match = line.match(LIST_ITEM_REG);

      if (!match) return null;

      const [, spaces, marker, content] = match;

      return {
        indent: spaces.length,
        marker,
        content,
        listType: getListType(marker),
      };
    })
    .filter(Boolean) as ParsedLine[];
}

function openList(line: ParsedLine) {
  if (line.listType === 'ul') {
    return `<ul data-md="${UNORDERED_LIST_MD_1}">`;
  }
  const { type, start } = getOrderedMeta(line.marker);
  const dataMdAtt = `data-md="${type || start || ORDERED_LIST_MD_1}"`;
  const startAtt = start ? ` start="${start}"` : '';
  const typeAtt = type ? ` type="${type}"` : '';
  return `<ol ${dataMdAtt}${startAtt}${typeAtt}>`;
}

function closeList(listType: ListType) {
  return listType === 'ul' ? '</ul>' : '</ol>';
}

function buildList(lines: ParsedLine[], parseInline?: (s: string) => string): string {
  let html = '';

  const stack: ('ul' | 'ol')[] = [];

  lines.forEach((line, index) => {
    const prev = lines[index - 1];
    const next = lines[index + 1];

    const content = parseInline ? parseInline(line.content) : line.content;

    // FIRST ITEM
    if (!prev) {
      html += openList(line);
      stack.push(line.listType);
    }

    // DEEPER INDENT > open nested list
    else if (line.indent > prev.indent) {
      html += openList(line);
      stack.push(line.listType);
    }

    // SAME LEVEL
    else if (line.indent === prev.indent) {
      html += '</li>';

      // different list type
      if (line.listType !== prev.listType) {
        html += closeList(stack.pop()!);

        html += openList(line);
        stack.push(line.listType);
      }
    }

    // GOING BACK UP
    else if (line.indent < prev.indent) {
      html += '</li>';

      while (stack.length > line.indent + 1) {
        html += closeList(stack.pop()!);
        html += '</li>';
      }

      if (line.listType !== stack[stack.length - 1]) {
        html += closeList(stack.pop()!);

        html += openList(line);
        stack.push(line.listType);
      }
    }

    html += `<li><p>${content}</p>`;

    // LAST ITEM cleanup
    if (!next) {
      html += '</li>';

      while (stack.length) {
        html += closeList(stack.pop()!);
      }
    }
  });

  return html;
}

const LIST_REG_1 = /^(?: *(?:[-*]|[\da-zA-Z]\.) +.+\n?)+/m;
export const ListRule: BlockMDRule = {
  match: (text) => text.match(LIST_REG_1),
  html: (match, parseInline) => {
    const [listText] = match;

    const lines = parseLines(listText);

    const html = buildList(lines, parseInline);

    return html;
  },
};

export const UN_ESC_BLOCK_SEQ = /^\\*(#{1,6} +|```|>|(-|[\da-zA-Z]\.) +|\* +)/;
export const ESC_BLOCK_SEQ = /^\\(\\*(#{1,6} +|```|>|(-|[\da-zA-Z]\.) +|\* +))/;
