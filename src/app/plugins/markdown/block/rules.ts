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

const CODEBLOCK_MD_1 = '```';
const CODEBLOCK_REG_1 = /^`{3}(\S*)\n((?:.*\n)+?)`{3} *(?!.)\n?/m;
export const CodeBlockRule: BlockMDRule = {
  match: (text) => text.match(CODEBLOCK_REG_1),
  html: (match) => {
    const [, g1, g2] = match;
    const classNameAtt = g1 ? ` class="language-${g1}"` : '';
    return `<pre data-md="${CODEBLOCK_MD_1}"><code${classNameAtt}>${g2}</code></pre>`;
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
const O_LIST_ITEM_PREFIX = /^(-|[\da-zA-Z]\.) */;
const O_LIST_START = /^([\d])\./;
const O_LIST_TYPE = /^([aAiI])\./;
const O_LIST_TRAILING_NEWLINE = /\n$/;
const ORDERED_LIST_REG_1 = /(^(?:-|[\da-zA-Z]\.) +.+\n?)+/m;
export const OrderedListRule: BlockMDRule = {
  match: (text) => text.match(ORDERED_LIST_REG_1),
  html: (match, parseInline) => {
    const [listText] = match;
    const [, listStart] = listText.match(O_LIST_START) ?? [];
    const [, listType] = listText.match(O_LIST_TYPE) ?? [];

    const lines = listText
      .replace(O_LIST_TRAILING_NEWLINE, '')
      .split('\n')
      .map((lineText) => {
        const line = lineText.replace(O_LIST_ITEM_PREFIX, '');
        const txt = parseInline ? parseInline(line) : line;
        return `<li><p>${txt}</p></li>`;
      })
      .join('');

    const dataMdAtt = `data-md="${listType || listStart || ORDERED_LIST_MD_1}"`;
    const startAtt = listStart ? ` start="${listStart}"` : '';
    const typeAtt = listType ? ` type="${listType}"` : '';
    return `<ol ${dataMdAtt}${startAtt}${typeAtt}>${lines}</ol>`;
  },
};

const UNORDERED_LIST_MD_1 = '*';
const U_LIST_ITEM_PREFIX = /^\* */;
const U_LIST_TRAILING_NEWLINE = /\n$/;
const UNORDERED_LIST_REG_1 = /(^\* +.+\n?)+/m;
export const UnorderedListRule: BlockMDRule = {
  match: (text) => text.match(UNORDERED_LIST_REG_1),
  html: (match, parseInline) => {
    const [listText] = match;

    const lines = listText
      .replace(U_LIST_TRAILING_NEWLINE, '')
      .split('\n')
      .map((lineText) => {
        const line = lineText.replace(U_LIST_ITEM_PREFIX, '');
        const txt = parseInline ? parseInline(line) : line;
        return `<li><p>${txt}</p></li>`;
      })
      .join('');

    return `<ul data-md="${UNORDERED_LIST_MD_1}">${lines}</ul>`;
  },
};

export const UN_ESC_BLOCK_SEQ = /^\\*(#{1,6} +|```|>|(-|[\da-zA-Z]\.) +|\* +)/;
export const ESC_BLOCK_SEQ = /^\\(\\*(#{1,6} +|```|>|(-|[\da-zA-Z]\.) +|\* +))/;
