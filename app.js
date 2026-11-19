/* ============================================================
   Analizador Sintáctico Visual
   HTML5 + CSS3 + JavaScript nativo. Sin dependencias.
   ============================================================ */
'use strict';

/* ------------------------- Lenguajes ------------------------- */

const LANGUAGES = {
  python: {
    name: 'Python',
    keywords: new Set([
      'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
      'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
      'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
      'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
      'match', 'case'
    ]),
    literalWords: new Set(['True', 'False', 'None']),
    lineComment: '#',
    blockComment: null
  },
  java: {
    name: 'Java',
    keywords: new Set([
      'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
      'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
      'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
      'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
      'package', 'private', 'protected', 'public', 'return', 'short', 'static',
      'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
      'transient', 'try', 'var', 'void', 'volatile', 'while', 'record'
    ]),
    literalWords: new Set(['true', 'false', 'null']),
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  javascript: {
    name: 'JavaScript',
    keywords: new Set([
      'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
      'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends',
      'false', 'finally', 'for', 'function', 'if', 'import', 'in',
      'instanceof', 'let', 'new', 'null', 'of', 'return', 'static', 'super',
      'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void',
      'while', 'with', 'yield'
    ]),
    literalWords: new Set(['true', 'false', 'null', 'undefined']),
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  c: {
    name: 'C',
    keywords: new Set([
      'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
      'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
      'inline', 'int', 'long', 'register', 'restrict', 'return', 'short',
      'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union',
      'unsigned', 'void', 'volatile', 'while', 'bool'
    ]),
    literalWords: new Set(['NULL', 'true', 'false']),
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  rust: {
    name: 'Rust',
    keywords: new Set([
      'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn',
      'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in',
      'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
      'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type',
      'unsafe', 'use', 'where', 'while'
    ]),
    literalWords: new Set(['true', 'false']),
    lineComment: '//',
    blockComment: ['/*', '*/']
  }
};

/* ------------------------- Léxico ------------------------- */

const MULTI_OPERATORS = [
  '>>>=', '===', '!==', '>>>', '..=', '<<=', '>>=', '**=', '//=', '...',
  '::', '->', '=>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '==',
  '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '**', '//', '<<',
  '>>', '..'
].sort((a, b) => b.length - a.length);

const SINGLE_OPERATORS = '+-*/%=<>!&|^~?:.@#';
const DELIMITERS = '(){}[],;';

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch) {
  return !!ch && /[A-Za-z_$]/.test(ch);
}

function isIdentPart(ch) {
  return !!ch && /[A-Za-z0-9_$]/.test(ch);
}

function languageOf(code) {
  const lang = LANGUAGES[code];
  if (!lang) throw new Error('Lenguaje no soportado: ' + code);
  return lang;
}

function tokenize(source, langCode) {
  const lang = languageOf(langCode);
  const tokens = [];
  const n = source.length;
  const python = langCode === 'python';
  const indentStack = [0];
  let i = 0;
  let line = 1;
  let col = 1;
  let parenDepth = 0;
  let lineHasCode = false;
  let atLineStart = true;

  function advance(count) {
    for (let k = 0; k < count; k++) {
      if (source[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  }

  function push(type, value, startLine, startCol, extra) {
    const token = { type, value, line: startLine, col: startCol };
    if (extra) Object.assign(token, extra);
    tokens.push(token);
    return token;
  }

  while (i < n) {
    /* Indentación significativa de Python */
    if (python && atLineStart && parenDepth === 0) {
      let j = i;
      let width = 0;
      while (j < n && (source[j] === ' ' || source[j] === '\t')) {
        width += source[j] === '\t' ? 4 : 1;
        j++;
      }
      const nextCh = source[j];
      const blank = nextCh === undefined || nextCh === '\n' || nextCh === '\r';
      const commentLine = nextCh === lang.lineComment;

      if (blank || commentLine) {
        if (j > i) advance(j - i);
        atLineStart = false;
        continue;
      }

      if (j > i) advance(j - i);

      const current = indentStack[indentStack.length - 1];
      if (width > current) {
        indentStack.push(width);
        push('indent', '', line, col);
      } else if (width < current) {
        while (indentStack.length > 1 && width < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          push('dedent', '', line, col);
        }
      }
      atLineStart = false;
    }

    const ch = source[i];
    const startLine = line;
    const startCol = col;

    /* Espacios */
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      advance(1);
      continue;
    }

    /* Salto de línea */
    if (ch === '\n') {
      advance(1);
      if (python && parenDepth === 0) {
        if (lineHasCode) {
          push('nueva_linea', '\n', startLine, startCol);
          lineHasCode = false;
        }
        atLineStart = true;
      }
      continue;
    }

    /* Comentarios */
    if (lang.lineComment && source.startsWith(lang.lineComment, i)) {
      let j = i;
      while (j < n && source[j] !== '\n') j++;
      push('comentario', source.slice(i, j), startLine, startCol);
      advance(j - i);
      continue;
    }

    if (lang.blockComment && source.startsWith(lang.blockComment[0], i)) {
      const close = lang.blockComment[1];
      let end = source.indexOf(close, i + lang.blockComment[0].length);
      end = end === -1 ? n : end + close.length;
      push('comentario', source.slice(i, end), startLine, startCol);
      advance(end - i);
      continue;
    }

    /* Directivas del preprocesador de C */
    if (langCode === 'c' && ch === '#') {
      const lineBegin = source.lastIndexOf('\n', i - 1) + 1;
      if (/^\s*$/.test(source.slice(lineBegin, i))) {
        let j = i + 1;
        while (j < n && (source[j] === ' ' || source[j] === '\t')) j++;
        const wordStart = j;
        while (j < n && /[A-Za-z_]/.test(source[j])) j++;
        const word = source.slice(wordStart, j);
        push('directiva', '#' + word, startLine, startCol);
        lineHasCode = true;

        if (word === 'include') {
          let k = j;
          while (k < n && (source[k] === ' ' || source[k] === '\t')) k++;
          if (source[k] === '<') {
            const closeIdx = source.indexOf('>', k);
            if (closeIdx !== -1) {
              push('cadena', source.slice(k, closeIdx + 1), startLine, startCol + (k - i));
              advance(closeIdx + 1 - i);
              continue;
            }
          }
        }
        advance(j - i);
        continue;
      }
    }

    /* Cadenas y caracteres */
    if (ch === '"' || ch === "'" || (ch === '`' && langCode === 'javascript')) {
      /* Referencias de por vida en Rust: 'a, 'static */
      if (langCode === 'rust' && ch === "'" && isIdentStart(source[i + 1])) {
        const match = /^'[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));
        if (match && source[i + match[0].length] !== "'") {
          push('identificador', match[0], startLine, startCol);
          advance(match[0].length);
          continue;
        }
      }

      const quote = ch;
      let j = i + 1;
      let triple = false;
      if (python && source.startsWith(quote.repeat(3), i)) {
        triple = true;
        j = i + 3;
      }

      while (j < n) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (triple && source.startsWith(quote.repeat(3), j)) {
          j += 3;
          break;
        }
        if (!triple && source[j] === quote) {
          j++;
          break;
        }
        if (!triple && source[j] === '\n') break;
        j++;
      }

      push('cadena', source.slice(i, j), startLine, startCol);
      lineHasCode = true;
      advance(j - i);
      continue;
    }

    /* Números */
    if (isDigit(ch) || (ch === '.' && isDigit(source[i + 1]))) {
      let j = i;
      if (ch === '0' && /[xXbBoO]/.test(source[i + 1] || '')) {
        j = i + 2;
        while (j < n && /[0-9a-fA-F_]/.test(source[j])) j++;
      } else {
        while (j < n && /[0-9_]/.test(source[j])) j++;
        if (source[j] === '.' && isDigit(source[j + 1])) {
          j++;
          while (j < n && /[0-9_]/.test(source[j])) j++;
        }
        if (/[eE]/.test(source[j] || '') && /[0-9+\-]/.test(source[j + 1] || '')) {
          j += 2;
          while (j < n && /[0-9_]/.test(source[j])) j++;
        }
      }
      while (j < n && /[A-Za-z]/.test(source[j])) j++;
      push('numero', source.slice(i, j), startLine, startCol);
      lineHasCode = true;
      advance(j - i);
      continue;
    }

    /* Identificadores y palabras clave */
    if (isIdentStart(ch)) {
      let j = i + 1;
      while (j < n && isIdentPart(source[j])) j++;
      const word = source.slice(i, j);
      const type = lang.keywords.has(word) ? 'palabra_clave' : 'identificador';
      push(type, word, startLine, startCol);
      if (!python || parenDepth === 0) lineHasCode = true;
      advance(j - i);
      continue;
    }

    /* Delimitadores */
    if (DELIMITERS.indexOf(ch) !== -1) {
      if (ch === '(' || ch === '[' || ch === '{') parenDepth++;
      else if (ch === ')' || ch === ']' || ch === '}') parenDepth = Math.max(0, parenDepth - 1);
      push('delimitador', ch, startLine, startCol);
      lineHasCode = true;
      advance(1);
      continue;
    }

    /* Operadores (multi-carácter primero) */
    let op = null;
    for (const candidate of MULTI_OPERATORS) {
      if (source.startsWith(candidate, i)) {
        op = candidate;
        break;
      }
    }
    if (!op && SINGLE_OPERATORS.indexOf(ch) !== -1) op = ch;

    if (op) {
      push('operador', op, startLine, startCol);
      lineHasCode = true;
      advance(op.length);
      continue;
    }

    /* Carácter desconocido */
    push('operador', ch, startLine, startCol);
    lineHasCode = true;
    advance(1);
  }

  if (python) {
    if (lineHasCode) {
      push('nueva_linea', '\n', line, col);
      lineHasCode = false;
    }
    while (indentStack.length > 1) {
      indentStack.pop();
      push('dedent', '', line, col);
    }
  }

  push('eof', '', line, col);
  return tokens;
}

/* ------------------------- Detección ------------------------- */

function stripNoise(source) {
  let out = '';
  let i = 0;
  const n = source.length;

  while (i < n) {
    const ch = source[i];

    if (ch === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }

    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      while (i < stop) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      const triple = source.startsWith(quote.repeat(3), i);
      const width = triple ? 3 : 1;
      i += width;
      out += ' '.repeat(width);
      while (i < n) {
        if (source[i] === '\\') {
          out += ' ';
          i++;
          if (i < n) {
            out += source[i] === '\n' ? '\n' : ' ';
            i++;
          }
          continue;
        }
        if (triple ? source.startsWith(quote.repeat(3), i) : source[i] === quote) {
          out += ' '.repeat(width);
          i += width;
          break;
        }
        const c = source[i];
        out += c === '\n' ? '\n' : ' ';
        i++;
        if (!triple && c === '\n') break;
      }
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

const DETECTION_FEATURES = {
  python: [
    [/^[ \t]*def[ \t]+\w+[ \t]*\(/m, 8],
    [/^[ \t]*class[ \t]+\w+/m, 5],
    [/\belif\b/, 7],
    [/\bself\b/, 5],
    [/^[ \t]*(?:from[ \t]+[\w.]+[ \t]+)?import[ \t]+[\w.]+/m, 5],
    [/^[ \t]*(?:if|for|while|with|try|except|finally|else)\b[^\n{]*:[ \t]*(?:#.*)?$/m, 4],
    [/\b(?:print|len|range|append)\s*\(/, 4],
    [/\b(?:None|True|False)\b/, 4],
    [/^[ \t]*@\w+/m, 3]
  ],
  java: [
    [/^[ \t]*import[ \t]+java\./m, 9],
    [/\bSystem\.(?:out|err)\.print/, 8],
    [/\bpublic[ \t]+static[ \t]+void[ \t]+main[ \t]*\([ \t]*String/, 9],
    [/\bpublic[ \t]+(?:final[ \t]+)?(?:class|interface|enum)[ \t]+\w+/, 7],
    [/\b(?:private|protected|public)[ \t]+[\w<>,.\[\]]+[ \t]+\w+/, 4],
    [/@Override\b/, 7],
    [/\bnew[ \t]+[A-Z]\w*[ \t]*\(/, 3],
    [/\b(?:ArrayList|HashMap|Scanner|StringBuilder|LinkedList)\b/, 6],
    [/\bString[ \t]*\[[ \t]*\][ \t]*\w+/, 5],
    [/\b(?:extends|implements)[ \t]+\w+/, 4]
  ],
  javascript: [
    [/\bconsole\.(?:log|error|warn|info)[ \t]*\(/, 8],
    [/\b(?:const|let)[ \t]+\w+[ \t]*=/, 5],
    [/\bfunction[ \t]+\w*[ \t]*\(/, 5],
    [/=>/, 5],
    [/\bdocument\.(?:getElementById|querySelector|querySelectorAll|addEventListener)\b/, 8],
    [/\b(?:window|localStorage|sessionStorage)\./, 4],
    [/\b(?:require[ \t]*\(|module\.exports)/, 6],
    [/(?:===|!==)/, 4],
    [/\bJSON\.(?:parse|stringify)\b/, 6],
    [/\baddEventListener[ \t]*\(/, 4]
  ],
  c: [
    [/^[ \t]*#include[ \t]*[<"]/m, 9],
    [/\bprintf[ \t]*\(/, 7],
    [/\bint[ \t]+main[ \t]*\(/, 8],
    [/^[ \t]*#define[ \t]+\w+/m, 7],
    [/\btypedef[ \t]+(?:struct|enum|union)/, 7],
    [/\bstruct[ \t]+\w+[ \t]*\{/, 5],
    [/\b(?:malloc|calloc|realloc|free|sizeof)\b/, 4],
    [/\b(?:NULL|FILE)\b/, 4],
    [/\b(?:scanf|fprintf|sprintf|fgets)[ \t]*\(/, 5],
    [/\b(?:unsigned|signed)[ \t]+(?:int|char|long|short)\b/, 4]
  ],
  rust: [
    [/\bfn[ \t]+\w+[ \t]*\(/, 8],
    [/\blet[ \t]+mut\b/, 8],
    [/\bprintln![ \t]*\(/, 9],
    [/\bvec![ \t]*\(/, 6],
    [/\b(?:Vec|Option|Result|HashMap|String)[ \t]*</, 5],
    [/->[ \t]*(?:i32|u32|u64|f32|f64|String|bool|&)/, 6],
    [/\b(?:impl|trait)[ \t]+\w+/, 6],
    [/\buse[ \t]+[\w:]+;/, 5],
    [/&mut\b|&str\b/, 6],
    [/\bmatch[ \t]+[\w&:]*[ \t]*\{/, 4],
    [/\bpub[ \t]+(?:fn|struct|enum|mod)/, 6]
  ]
};

const FOREIGN_PATTERNS = [
  { name: 'HTML', re: /<!doctype\s+html|<html\b|<head\b|<body\b|<div\b|<span\b|<script\b/i },
  { name: 'PHP', re: /<\?php\b/i },
  { name: 'XML', re: /<\?xml\b/i },
  { name: 'SQL', re: /\b(?:select|insert\s+into|update|delete\s+from|create\s+table)\b[\s\S]{0,200}\b(?:from|into|set|table|where)\b/i }
];

const MIN_SCORE = 4;
const DOMINANCE = 2;

function detectLanguage(source) {
  const text = stripNoise(source);
  const trimmed = text.trim();

  if (!trimmed) {
    return { ok: false, reason: 'empty', name: null, scores: {}, foreign: null };
  }

  const foreign = FOREIGN_PATTERNS.find((entry) => entry.re.test(text)) || null;
  const foreignHtml = FOREIGN_PATTERNS.slice(0, 3).find((entry) => entry.re.test(text));
  if (foreignHtml) {
    return {
      ok: false,
      reason: 'foreign',
      name: foreignHtml.name,
      scores: {},
      foreign: foreignHtml.name
    };
  }

  const scores = {};
  for (const code of Object.keys(LANGUAGES)) {
    let score = 0;
    for (const [re, weight] of DETECTION_FEATURES[code]) {
      const matches = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
      const count = matches ? matches.length : 0;
      score += weight * Math.min(count, 2);
    }
    scores[code] = score;
  }

  if (foreign && foreign.name === 'SQL') {
    const best = Math.max(...Object.values(scores));
    if (best < 9) {
      return { ok: false, reason: 'foreign', name: 'SQL', scores, foreign: 'SQL' };
    }
  }

  const ranked = Object.keys(scores)
    .map((code) => ({ code, score: scores[code] }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const second = ranked[1];

  if (best.score < MIN_SCORE) {
    return {
      ok: false,
      reason: 'unknown',
      name: null,
      scores,
      foreign: foreign ? foreign.name : null
    };
  }

  if (best.score - second.score < DOMINANCE) {
    return {
      ok: false,
      reason: 'ambiguous',
      name: null,
      scores,
      candidates: [best.code, second.code].map((code) => ({
        code,
        name: LANGUAGES[code].name,
        score: scores[code]
      })),
      foreign: null
    };
  }

  return {
    ok: true,
    lang: best.code,
    name: LANGUAGES[best.code].name,
    score: best.score,
    scores
  };
}

/* ------------------------- Ejemplos ------------------------- */

const EXAMPLES = {
  python: [
    'def calcular_promedio(numeros):',
    '    total = 0',
    '    for n in numeros:',
    '        if n > 0 and n % 2 == 0:',
    '            total += n',
    '    return total / len(numeros)',
    '',
    'def main():',
    '    valores = [10, 20, 30, 40]',
    '    resultado = calcular_promedio(valores)',
    '    print("Promedio:", resultado)',
    '',
    'if __name__ == "__main__":',
    '    main()'
  ].join('\n'),
  java: [
    'import java.util.ArrayList;',
    '',
    'public class Demo {',
    '    public static void main(String[] args) {',
    '        ArrayList<Integer> numeros = new ArrayList<>();',
    '        for (int i = 1; i <= 5; i++) {',
    '            numeros.add(i * 2);',
    '        }',
    '        if (numeros.size() > 0) {',
    '            System.out.println("Total: " + numeros.size());',
    '        } else {',
    '            System.out.println("Lista vacía");',
    '        }',
    '    }',
    '}'
  ].join('\n'),
  javascript: [
    'const precios = [120, 80, 45, 200];',
    '',
    'function aplicarDescuento(lista, porcentaje) {',
    '  return lista.map((precio) => precio - precio * porcentaje / 100);',
    '}',
    '',
    'const total = precios.reduce((acc, precio) => acc + precio, 0);',
    '',
    'if (total > 300) {',
    '  console.log("Total alto: " + total);',
    '} else {',
    '  console.log("Total moderado: " + total);',
    '}'
  ].join('\n'),
  c: [
    '#include <stdio.h>',
    '',
    'typedef struct {',
    '    int x;',
    '    int y;',
    '} Punto;',
    '',
    'int suma(int a, int b) {',
    '    return a + b;',
    '}',
    '',
    'int main() {',
    '    Punto p = {3, 4};',
    '    int total = suma(p.x, p.y);',
    '    if (total > 5) {',
    '        printf("Total grande: %d\\n", total);',
    '    } else {',
    '        printf("Total pequeño: %d\\n", total);',
    '    }',
    '    return 0;',
    '}'
  ].join('\n'),
  rust: [
    'use std::collections::HashMap;',
    '',
    'fn promedio(valores: &Vec<i32>) -> f64 {',
    '    let mut total = 0;',
    '    for v in valores {',
    '        total += *v;',
    '    }',
    '    total as f64 / valores.len() as f64',
    '}',
    '',
    'fn main() {',
    '    let mut notas = vec![10, 20, 30];',
    '    notas.push(40);',
    '    let resultado = promedio(&notas);',
    '    if resultado > 20.0 {',
    '        println!("Promedio alto: {}", resultado);',
    '    } else {',
    '        println!("Promedio bajo");',
    '    }',
    '}'
  ].join('\n')
};

/* ------------------------- Utilidades ------------------------- */

const TOKEN_LABELS = {
  palabra_clave: 'Palabra clave',
  identificador: 'Identificador',
  numero: 'Número',
  cadena: 'Cadena',
  operador: 'Operador',
  delimitador: 'Delimitador',
  comentario: 'Comentario',
  directiva: 'Directiva',
  nueva_linea: 'Nueva línea',
  indent: 'Indentación',
  dedent: 'Dedentación',
  eof: 'Fin de archivo'
};

function lineOfNewlines(value) {
  return (value.match(/\n/g) || []).length;
}

/* ------------------------- Parser ------------------------- */

const PRECEDENCE = {
  'or': 1, '||': 2, '??': 2,
  'and': 3, '&&': 4,
  '|': 5, '^': 6, '&': 7,
  '==': 8, '!=': 8, '===': 8, '!==': 8, 'is': 8,
  '<': 9, '>': 9, '<=': 9, '>=': 9, 'instanceof': 9, 'in': 9, 'not in': 9,
  '<<': 10, '>>': 10, '>>>': 10,
  '+': 11, '-': 11,
  '*': 12, '/': 12, '%': 12, '//': 12,
  '**': 13
};

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '//=', '&=', '|=', '^=', '<<=', '>>=', '>>>=']);

const TYPE_KEYWORDS = {
  java: new Set(['boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void', 'String']),
  c: new Set(['char', 'double', 'float', 'int', 'long', 'short', 'signed', 'unsigned', 'void', 'struct', 'enum', 'union', 'const', 'static', 'bool', 'size_t']),
  rust: new Set(['i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64', 'f32', 'f64', 'bool', 'char', 'str', 'String', 'usize', 'isize'])
};

const JAVA_MODIFIERS = new Set([
  'public', 'private', 'protected', 'static', 'final', 'abstract',
  'synchronized', 'native', 'transient', 'volatile', 'default', 'strictfp'
]);

const RUST_MODIFIERS = new Set(['pub', 'async', 'unsafe', 'extern']);

function createNode(type, label, children) {
  return { type, label: label == null ? type : label, children: children || [] };
}

function compactTokens(text) {
  let out = String(text).replace(/\s+/g, ' ').trim();
  out = out.replace(/\s*::\s*/g, '\u0000');
  out = out.replace(/\s*([(\[<])\s*/g, '$1');
  out = out.replace(/\s*([)\]}>])/g, '$1');
  out = out.replace(/\s*([&*])\s*/g, '$1');
  out = out.replace(/\s*([,;])\s*/g, '$1 ');
  out = out.replace(/\s*(->|\.)\s*/g, '$1');
  out = out.replace(/\s*:\s*/g, ': ');
  out = out.replace(/\u0000/g, '::');
  return out.trim();
}

class Parser {
  constructor(tokens, langCode) {
    this.lang = langCode;
    this.py = langCode === 'python';
    this.tokens = tokens.filter((t) => t.type !== 'comentario');
    this.pos = 0;
  }

  peek(offset) {
    const index = this.pos + (offset || 0);
    return this.tokens[index] || this.tokens[this.tokens.length - 1];
  }

  next() {
    const token = this.peek();
    if (this.pos < this.tokens.length - 1) this.pos++;
    return token;
  }

  atEnd() {
    return this.peek().type === 'eof';
  }

  check(value) {
    return this.peek().value === value;
  }

  match(value) {
    if (this.check(value)) return this.next();
    return null;
  }

  expect(value) {
    return this.match(value);
  }

  checkType(type) {
    return this.peek().type === type;
  }

  skipNewlines() {
    while (this.checkType('nueva_linea')) this.next();
  }

  skipSeparators() {
    while (this.check(';') || this.checkType('nueva_linea')) this.next();
  }

  parseProgram() {
    const root = createNode('programa', 'programa');
    this.skipSeparators();
    while (!this.atEnd()) {
      const before = this.pos;
      const stmt = this.parseStatement();
      if (stmt) root.children.push(stmt);
      this.skipSeparators();
      if (this.pos === before) this.next();
    }
    return root;
  }

  /* ---------- Bloques ---------- */

  parseSuite() {
    this.skipNewlines();
    const block = createNode('bloque', 'bloque');

    if (this.checkType('indent')) {
      this.next();
      while (!this.atEnd() && !this.checkType('dedent')) {
        const before = this.pos;
        const stmt = this.parseStatement();
        if (stmt) block.children.push(stmt);
        this.skipNewlines();
        if (this.pos === before) this.next();
      }
      if (this.checkType('dedent')) this.next();
      return block;
    }

    const stmt = this.parseStatement();
    if (stmt) block.children.push(stmt);
    return block;
  }

  parseBlock() {
    const block = createNode('bloque', 'bloque');
    if (!this.check('{')) return block;
    this.next();
    this.skipSeparators();
    while (!this.atEnd() && !this.check('}')) {
      const before = this.pos;
      const stmt = this.parseStatement();
      if (stmt) block.children.push(stmt);
      this.skipSeparators();
      if (this.pos === before) this.next();
    }
    this.match('}');
    return block;
  }

  parseBlockOrStatement() {
    if (this.check('{')) return this.parseBlock();
    const stmt = this.parseStatement();
    return stmt || createNode('bloque', 'bloque');
  }

  /* ---------- Sentencias ---------- */

  parseStatement() {
    this.skipSeparators();
    const token = this.peek();
    if (!token || token.type === 'eof') return null;
    if (token.value === '}') return null;
    if (token.type === 'directiva') return this.parseDirective();

    const value = token.value;

    if (token.type === 'palabra_clave') {
      switch (value) {
        case 'if': return this.parseIf();
        case 'for': return this.parseFor();
        case 'while': return this.parseWhile();
        case 'do': return this.parseDoWhile();
        case 'return': return this.parseReturn();
        case 'break':
        case 'continue':
        case 'pass':
          this.next();
          this.match(';');
          return createNode('control', value);
        case 'try': return this.parseTry();
        case 'switch': return this.parseSwitch();
        case 'match': if (this.lang === 'rust') return this.parseMatch(); break;
        case 'else':
          this.next();
          this.match(':');
          return createNode('control', 'else');
        default: break;
      }
    }

    if (this.lang === 'python') {
      if (value === 'def') return this.parsePythonDef();
      if (value === 'class') return this.parseClassLike('');
      if (value === 'import' || value === 'from') return this.parseImport();
      if (value === 'with' || value === 'async') return this.parseWithLike();
      if (value === 'raise' || value === 'del' || value === 'global' || value === 'nonlocal') {
        return this.parseKeywordStatement();
      }
    }

    if (this.lang === 'java') {
      if (value === 'import' || value === 'package') return this.parseImport();
      if (value === 'class' || value === 'interface' || value === 'enum') return this.parseClassLike('');
      if (JAVA_MODIFIERS.has(value)) return this.parseJavaModified();
      if (TYPE_KEYWORDS.java.has(value)) return this.parseTypedStatement('');
      if (this.looksLikeTypedDeclaration()) return this.parseTypedStatement('');
    }

    if (this.lang === 'javascript') {
      if (value === 'import') return this.parseImport();
      if (value === 'export') return this.parseExport();
      if (value === 'function') return this.parseJsFunction('');
      if (value === 'class') return this.parseClassLike('');
      if (value === 'const' || value === 'let' || value === 'var') return this.parseVarDecl();
    }

    if (this.lang === 'c') {
      if (value === 'typedef') return this.parseTypedef();
      if (value === 'struct' || value === 'enum' || value === 'union') return this.parseStructLike();
      if (TYPE_KEYWORDS.c.has(value)) return this.parseTypedStatement('');
      if (this.looksLikeTypedDeclaration()) return this.parseTypedStatement('');
    }

    if (this.lang === 'rust') {
      if (value === 'use') return this.parseImport();
      if (value === 'fn') return this.parseRustFn('');
      if (value === 'let') return this.parseLet();
      if (value === 'struct' || value === 'enum') return this.parseStructLike();
      if (value === 'impl' || value === 'trait' || value === 'mod') return this.parseImplLike();
      if (RUST_MODIFIERS.has(value)) return this.parseRustModified();
    }

    return this.parseExpressionStatement();
  }

  parseKeywordStatement() {
    const kw = this.next().value;
    const node = createNode('control', kw);
    if (!this.checkType('nueva_linea') && !this.check(';') && !this.check('}') && !this.atEnd()) {
      const expr = this.parseExpression();
      if (expr) node.children.push(expr);
    }
    this.match(';');
    return node;
  }

  parseDirective() {
    const directive = this.next();
    const node = createNode('directiva', directive.value);
    if (this.peek().type === 'cadena') {
      node.children.push(createNode('literal', this.next().value));
    }
    return node;
  }

  /* ---------- Control ---------- */

  parseIf() {
    this.next();
    const node = createNode('control', 'if');
    const condition = this.parseExpression();
    if (condition) node.children.push(createNode('condicion', 'condición', [condition]));

    if (this.py) {
      this.expect(':');
      node.children.push(this.parseSuite());
      this.skipNewlines();
      while (this.check('elif')) {
        this.next();
        const elifCondition = this.parseExpression();
        this.expect(':');
        const branch = createNode('control', 'elif');
        if (elifCondition) branch.children.push(createNode('condicion', 'condición', [elifCondition]));
        branch.children.push(this.parseSuite());
        node.children.push(branch);
        this.skipNewlines();
      }
      if (this.check('else')) {
        this.next();
        this.expect(':');
        node.children.push(createNode('control', 'else', [this.parseSuite()]));
      }
      return node;
    }

    node.children.push(this.parseBlockOrStatement());
    this.skipNewlines();
    if (this.check('else')) {
      this.next();
      if (this.check('if')) {
        node.children.push(this.parseIf());
      } else {
        node.children.push(createNode('control', 'else', [this.parseBlockOrStatement()]));
      }
    }
    return node;
  }

  parseFor() {
    this.next();
    const node = createNode('control', 'for');

    if (this.py || this.lang === 'rust') {
      const targetParts = [];
      while (!this.atEnd() && !this.check('in') && !this.check(':') && !this.check('{')) {
        targetParts.push(this.next().value);
      }
      node.children.push(createNode('identificador', compactTokens(targetParts.join(' ')) || 'variable'));
      if (this.check('in')) this.next();
      const iterable = this.parseExpression();
      if (iterable) node.children.push(createNode('iterable', 'iterable', [iterable]));
      if (this.py) {
        this.expect(':');
        node.children.push(this.parseSuite());
      } else {
        node.children.push(this.parseBlock());
      }
      return node;
    }

    if (this.check('(')) {
      this.next();
      const init = this.parseForInit();
      this.match(';');
      const cond = this.check(';') ? null : this.parseExpression();
      this.match(';');
      const update = this.check(')') ? null : this.parseExpression();
      this.match(')');
      if (init) node.children.push(createNode('declaracion', 'inicialización', [init]));
      if (cond) node.children.push(createNode('condicion', 'condición', [cond]));
      if (update) node.children.push(createNode('actualizacion', 'actualización', [update]));
    }

    node.children.push(this.parseBlockOrStatement());
    return node;
  }

  parseForInit() {
    const value = this.peek().value;
    if (this.lang !== 'c' && (value === 'const' || value === 'let' || value === 'var')) {
      return this.parseVarDecl(true);
    }
    if (this.lang === 'c' && (TYPE_KEYWORDS.c.has(value) || this.looksLikeTypedDeclaration())) {
      return this.parseTypedStatement('', true);
    }
    if (this.lang === 'java' && (TYPE_KEYWORDS.java.has(value) || this.looksLikeTypedDeclaration())) {
      return this.parseTypedStatement('', true);
    }
    return this.parseExpression();
  }

  parseWhile() {
    this.next();
    const node = createNode('control', 'while');
    const condition = this.parseExpression();
    if (condition) node.children.push(createNode('condicion', 'condición', [condition]));
    if (this.py) {
      this.expect(':');
      node.children.push(this.parseSuite());
    } else {
      node.children.push(this.parseBlockOrStatement());
    }
    return node;
  }

  parseDoWhile() {
    this.next();
    const node = createNode('control', 'do-while');
    node.children.push(this.parseBlockOrStatement());
    if (this.check('while')) {
      this.next();
      if (this.check('(')) {
        this.next();
        const condition = this.parseExpression();
        this.match(')');
        if (condition) node.children.push(createNode('condicion', 'condición', [condition]));
      }
    }
    this.match(';');
    return node;
  }

  parseReturn() {
    this.next();
    const node = createNode('control', 'return');
    const t = this.peek();
    if (t && t.type !== 'eof' && t.value !== ';' && t.value !== '}' && t.type !== 'nueva_linea' && t.type !== 'dedent') {
      const expr = this.parseExpression();
      if (expr) node.children.push(expr);
    }
    this.match(';');
    return node;
  }

  parseTry() {
    this.next();
    const node = createNode('control', 'try');
    if (this.py) {
      this.expect(':');
      node.children.push(this.parseSuite());
    } else {
      node.children.push(this.parseBlock());
    }
    this.skipNewlines();

    while (this.check('catch') || this.check('except') || this.check('finally')) {
      const keyword = this.next().value;
      const part = createNode('control', keyword);
      if (keyword !== 'finally') {
        if (this.check('(')) {
          part.children.push(this.parseParams());
        } else if (!this.py) {
          const typeTokens = [];
          while (!this.atEnd() && !this.check('{') && !this.check(':') && !this.checkType('nueva_linea')) {
            typeTokens.push(this.next().value);
          }
          if (typeTokens.length) part.children.push(createNode('parametro', compactTokens(typeTokens.join(' '))));
        } else if (!this.check(':')) {
          const caught = [];
          while (!this.atEnd() && !this.check(':')) caught.push(this.next().value);
          if (caught.length) part.children.push(createNode('identificador', compactTokens(caught.join(' '))));
        }
      }
      if (this.py) {
        this.expect(':');
        part.children.push(this.parseSuite());
      } else {
        part.children.push(this.parseBlock());
      }
      node.children.push(part);
      this.skipNewlines();
    }
    return node;
  }

  parseSwitch() {
    this.next();
    const node = createNode('control', 'switch');
    if (this.check('(')) {
      this.next();
      const subject = this.parseExpression();
      this.match(')');
      if (subject) node.children.push(createNode('condicion', 'expresión', [subject]));
    }

    if (!this.check('{')) return node;
    this.next();
    const cases = createNode('bloque', 'casos');
    while (!this.atEnd() && !this.check('}')) {
      if (this.check('case') || this.check('default')) {
        const isCase = this.check('case');
        this.next();
        const parts = [];
        if (isCase) {
          while (!this.atEnd() && !this.check(':')) parts.push(this.next().value);
        }
        this.match(':');
        cases.children.push(createNode('control', (isCase ? 'case ' : 'default') + compactTokens(parts.join(' '))));
      } else {
        const before = this.pos;
        const stmt = this.parseStatement();
        if (stmt) cases.children.push(stmt);
        if (this.pos === before) this.next();
        this.skipSeparators();
      }
    }
    this.match('}');
    node.children.push(cases);
    return node;
  }

  parseMatch() {
    this.next();
    const node = createNode('control', 'match');
    const subject = this.parseExpression();
    if (subject) node.children.push(createNode('condicion', 'sujeto', [subject]));
    if (!this.check('{')) return node;
    this.next();
    const arms = createNode('bloque', 'brazos');
    while (!this.atEnd() && !this.check('}')) {
      const before = this.pos;
      const pattern = [];
      while (!this.atEnd() && !this.check('=>') && !this.check('}')) pattern.push(this.next().value);
      if (this.check('=>')) this.next();
      const arm = createNode('control', compactTokens(pattern.join(' ')) + ' =>');
      if (this.check('{')) {
        arm.children.push(this.parseBlock());
      } else {
        const expr = this.parseExpression();
        if (expr) arm.children.push(expr);
      }
      arms.children.push(arm);
      this.match(',');
      if (this.pos === before) this.next();
    }
    this.match('}');
    node.children.push(arms);
    return node;
  }

  parseWithLike() {
    const keyword = this.next().value;
    const node = createNode('control', keyword);
    const expr = this.parseExpression();
    if (expr) node.children.push(expr);
    if (this.check(':')) {
      this.next();
      node.children.push(this.parseSuite());
    }
    return node;
  }

  /* ---------- Declaraciones ---------- */

  parseImport() {
    const keyword = this.next();
    const parts = [keyword.value];
    while (!this.atEnd()) {
      const t = this.peek();
      if (t.type === 'nueva_linea' || t.type === 'dedent') break;
      if (t.value === ';' || t.value === '}') break;
      parts.push(this.next().value);
    }
    this.match(';');
    return createNode('declaracion', compactTokens(parts.join(' ')));
  }

  parseClassLike(modifiers) {
    this.next();
    const nameToken = this.peek();
    const name = nameToken.type === 'identificador' || nameToken.type === 'palabra_clave'
      ? this.next().value
      : '';
    const prefix = modifiers ? modifiers + ' ' : '';
    const node = createNode('declaracion', prefix + 'class ' + name);

    while (!this.atEnd() && !this.check('{') && !this.check(':')) this.next();

    if (this.py) {
      this.expect(':');
      node.children.push(this.parseSuite());
    } else if (this.check('{')) {
      node.children.push(this.parseBlock());
    }
    return node;
  }

  parsePythonDef() {
    this.next();
    const nameToken = this.next();
    const node = createNode('funcion', 'def ' + (nameToken.value || 'anónima'));
    node.children.push(this.parseParams());
    this.expect(':');
    node.children.push(this.parseSuite());
    return node;
  }

  parseJsFunction(prefix) {
    this.next();
    let name = '';
    if (this.peek().type === 'identificador') name = this.next().value;
    const node = createNode('funcion', (prefix ? prefix + ' ' : '') + (name || 'anónima') + '()');
    node.children.push(this.parseParams());
    if (this.check('{')) node.children.push(this.parseBlock());
    return node;
  }

  parseExport() {
    this.next();
    if (this.check('default')) this.next();
    if (this.check('function')) return this.parseJsFunction('export');
    if (this.check('class')) return this.parseClassLike('export');
    if (this.check('const') || this.check('let') || this.check('var')) {
      const decl = this.parseVarDecl();
      if (decl) decl.label = 'export ' + decl.label;
      return decl;
    }
    const stmt = this.parseStatement();
    return stmt || createNode('declaracion', 'export');
  }

  parseVarDecl(stopAtSemicolon) {
    const keyword = this.next().value;
    const node = createNode('declaracion', keyword);

    if (this.peek().type !== 'identificador') {
      while (!this.atEnd() && !this.check(';') && !this.check(')') && !this.checkType('nueva_linea')) this.next();
      if (!stopAtSemicolon) this.match(';');
      return node;
    }

    const name = this.next().value;
    node.label = keyword + ' ' + name;

    if (this.match('=')) {
      const arrow = this.tryParseArrowFunction(name, keyword);
      const value = arrow || this.parseExpression();
      if (value) node.children.push(value);
    }

    while (this.check(',')) {
      this.next();
      const extraName = this.peek().type === 'identificador' ? this.next().value : '';
      const extra = createNode('declaracion', keyword + ' ' + extraName);
      if (this.match('=')) {
        const value = this.parseExpression();
        if (value) extra.children.push(value);
      }
      node.children.push(extra);
    }

    if (!stopAtSemicolon) this.match(';');
    return node;
  }

  tryParseArrowFunction(name, prefix) {
    const save = this.pos;
    let params = null;

    if (this.check('(')) {
      params = this.parseParams();
      if (!this.check('=>')) {
        this.pos = save;
        return null;
      }
    } else if (this.peek().type === 'identificador' && this.peek(1).value === '=>') {
      params = createNode('parametros', 'parámetros', [createNode('parametro', this.next().value)]);
    } else {
      return null;
    }

    this.next();
    const label = (prefix ? prefix + ' ' : '') + (name || '') + ' = (' +
      params.children.map((p) => p.label).join(', ') + ') =>';
    const fn = createNode('funcion', label);
    fn.children.push(params);
    if (this.check('{')) {
      fn.children.push(this.parseBlock());
    } else {
      const body = this.parseExpression();
      if (body) fn.children.push(body);
    }
    return fn;
  }

  looksLikeTypedDeclaration() {
    const token = this.peek();
    const types = TYPE_KEYWORDS[this.lang];
    if (types && types.has(token.value)) return true;
    if (token.type !== 'identificador') return false;

    let offset = 1;
    if (this.peek(offset).value === '<') {
      let depth = 0;
      let guard = 0;
      while (guard++ < 30) {
        const t = this.peek(offset);
        if (!t || t.type === 'eof') return false;
        if (t.value === '<') depth++;
        else if (t.value === '>') {
          depth--;
          if (depth === 0) {
            offset++;
            break;
          }
        }
        offset++;
      }
    }
    while (['[', ']', '*', '&'].includes(this.peek(offset).value)) offset++;
    return this.peek(offset).type === 'identificador';
  }

  parseTypedStatement(modifiers, stopAtSemicolon) {
    const startPos = this.pos;
    const typeParts = [];
    let guard = 0;

    while (!this.atEnd() && guard++ < 24) {
      const t = this.peek();
      if (t.type === 'identificador' || t.type === 'palabra_clave') {
        const after = this.peek(1);
        const endsName = t.type === 'identificador' && after &&
          ['(', '=', ';', '[', ',', ')', '{'].includes(after.value);
        if (endsName) break;
        typeParts.push(this.next().value);
        if (this.check('<')) {
          const generics = [];
          let depth = 0;
          while (!this.atEnd()) {
            const g = this.next();
            generics.push(g.value);
            if (g.value === '<') depth++;
            if (g.value === '>') {
              depth--;
              if (depth === 0) break;
            }
          }
          typeParts.push(generics.join(' '));
        }
        continue;
      }
      if (['*', '&', '[', ']'].includes(t.value)) {
        typeParts.push(this.next().value);
        continue;
      }
      break;
    }

    const typeText = compactTokens(typeParts.join(' '));
    const prefix = modifiers ? modifiers + ' ' : '';

    if (this.peek().type !== 'identificador') {
      if (this.pos === startPos) return this.parseExpressionStatement();
      const node = createNode('declaracion', prefix + (typeText || 'declaración'));
      if (this.check('{')) node.children.push(this.parseBlock());
      this.match(';');
      return node;
    }

    const name = this.next().value;

    if (this.check('(')) {
      const label = prefix + (typeText ? typeText + ' ' : '') + name + '()';
      const fn = createNode('funcion', label);
      fn.children.push(this.parseParams());

      if (this.lang === 'rust' && this.check('->')) {
        this.next();
        const returnType = [];
        while (!this.atEnd() && !this.check('{') && !this.check(';')) returnType.push(this.next().value);
        if (returnType.length) fn.children.push(createNode('tipo', '→ ' + compactTokens(returnType.join(' '))));
      }

      if (this.check('{')) fn.children.push(this.parseBlock());
      else this.match(';');
      return fn;
    }

    const decl = createNode('declaracion', prefix + (typeText ? typeText + ' ' : '') + name);

    if (this.check('[')) {
      const suffix = [];
      while (!this.atEnd() && !['=', ';', ','].includes(this.peek().value)) suffix.push(this.next().value);
      if (suffix.length) decl.label += compactTokens(suffix.join(''));
    }

    if (this.match('=')) {
      const value = this.parseExpression();
      if (value) decl.children.push(value);
    }

    while (this.check(',')) {
      this.next();
      if (this.peek().type !== 'identificador') break;
      const extraName = this.next().value;
      const extra = createNode('declaracion', (typeText ? typeText + ' ' : '') + extraName);
      if (this.match('=')) {
        const value = this.parseExpression();
        if (value) extra.children.push(value);
      }
      decl.children.push(extra);
    }

    if (!stopAtSemicolon) this.match(';');
    return decl;
  }

  parseJavaModified() {
    const modifiers = [];
    while (JAVA_MODIFIERS.has(this.peek().value)) modifiers.push(this.next().value);
    const joined = modifiers.join(' ');

    if (['class', 'interface', 'enum'].includes(this.peek().value)) return this.parseClassLike(joined);
    if (this.peek().type === 'identificador' && this.peek(1).value === '(') return this.parseTypedStatement(joined);
    if (this.peek().value === 'void' || (TYPE_KEYWORDS.java.has(this.peek().value)) || this.looksLikeTypedDeclaration()) {
      return this.parseTypedStatement(joined);
    }
    return this.parseTypedStatement(joined);
  }

  parseRustModified() {
    const modifiers = [];
    while (RUST_MODIFIERS.has(this.peek().value)) modifiers.push(this.next().value);
    const joined = modifiers.join(' ');
    if (this.peek().value === 'fn') return this.parseRustFn(joined);
    if (this.peek().value === 'struct' || this.peek().value === 'enum') return this.parseStructLike(joined);
    if (this.peek().value === 'impl' || this.peek().value === 'trait' || this.peek().value === 'mod') return this.parseImplLike(joined);
    return this.parseStatement();
  }

  parseRustFn(prefix) {
    this.next();
    const name = this.peek().type === 'identificador' ? this.next().value : 'anónima';
    const fn = createNode('funcion', (prefix ? prefix + ' ' : '') + 'fn ' + name);
    fn.children.push(this.parseParams());
    if (this.check('->')) {
      this.next();
      const parts = [];
      while (!this.atEnd() && !this.check('{') && !this.check(';') && !this.check('where')) parts.push(this.next().value);
      if (parts.length) fn.children.push(createNode('tipo', '→ ' + compactTokens(parts.join(' '))));
    }
    if (this.check('{')) fn.children.push(this.parseBlock());
    else this.match(';');
    return fn;
  }

  parseLet() {
    this.next();
    let label = 'let';
    if (this.check('mut')) {
      this.next();
      label += ' mut';
    }
    if (this.peek().type === 'identificador') label += ' ' + this.next().value;
    const node = createNode('declaracion', label);

    if (this.check(':')) {
      this.next();
      const typeParts = [];
      while (!this.atEnd() && !['=', ';', '{', '}'].includes(this.peek().value)) typeParts.push(this.next().value);
      if (typeParts.length) node.children.push(createNode('tipo', compactTokens(typeParts.join(' '))));
    }
    if (this.match('=')) {
      const value = this.parseExpression();
      if (value) node.children.push(value);
    }
    this.match(';');
    return node;
  }

  parseTypedef() {
    this.next();
    const node = createNode('declaracion', 'typedef');

    if (['struct', 'enum', 'union'].includes(this.peek().value)) {
      const keyword = this.next().value;
      let name = '';
      if (this.peek().type === 'identificador') name = this.next().value;
      if (this.check('{')) node.children.push(this.parseBlock());
      const alias = this.peek().type === 'identificador' ? this.next().value : name;
      node.label = 'typedef ' + keyword + ' ' + (alias || name || 'anónimo');
      if (alias) node.children.push(createNode('tipo', alias));
      this.match(';');
      return node;
    }

    const parts = [];
    while (!this.atEnd() && !this.check(';') && !this.check('{')) parts.push(this.next().value);
    if (this.check('{')) node.children.push(this.parseBlock());
    if (parts.length) node.label = 'typedef ' + compactTokens(parts.join(' '));
    this.match(';');
    return node;
  }

  parseStructLike(prefix) {
    const keyword = this.next().value;
    let name = '';
    if (this.peek().type === 'identificador') name = this.next().value;
    const node = createNode('declaracion', (prefix ? prefix + ' ' : '') + keyword + ' ' + (name || 'anónimo'));

    if (this.check('{')) node.children.push(this.parseBlock());
    else this.match(';');

    if (this.lang === 'rust' && this.check(';')) this.next();
    if (this.lang === 'c' && this.peek().type === 'identificador') this.next();
    this.match(';');
    return node;
  }

  parseImplLike(prefix) {
    const keyword = this.next().value;
    const nameParts = [];
    while (!this.atEnd() && !this.check('{') && !this.check(';')) nameParts.push(this.next().value);
    const node = createNode('declaracion', (prefix ? prefix + ' ' : '') + keyword + ' ' + compactTokens(nameParts.join(' ')));
    if (this.check('{')) node.children.push(this.parseBlock());
    this.match(';');
    return node;
  }

  parseExpressionStatement() {
    const before = this.pos;
    const expr = this.parseExpression();

    const token = this.peek();
    if (expr && token && token.type === 'operador' && ASSIGN_OPS.has(token.value)) {
      this.next();
      const right = this.parseExpression();
      const assignment = createNode('asignacion', token.value, expr ? [expr, right].filter(Boolean) : [right].filter(Boolean));
      this.match(';');
      return assignment;
    }

    this.match(';');

    if (!expr) {
      if (this.pos === before && !this.atEnd()) this.next();
      return null;
    }
    return expr;
  }

  /* ---------- Parámetros ---------- */

  parseParams() {
    const params = createNode('parametros', 'parámetros');
    if (!this.check('(')) return params;
    this.next();

    let guard = 0;
    while (!this.atEnd() && !this.check(')') && guard++ < 200) {
      const before = this.pos;
      const param = this.parseParam();
      if (param) params.children.push(param);
      if (!this.match(',')) {
        if (!this.check(')')) this.next();
        else break;
      }
      if (this.pos === before) this.next();
    }
    this.match(')');
    return params;
  }

  parseParam() {
    const parts = [];
    const before = this.pos;
    let depth = 0;

    while (!this.atEnd()) {
      const t = this.peek();
      if (depth === 0 && (t.value === ',' || t.value === ')')) break;
      if (t.type === 'nueva_linea' || t.type === 'dedent') break;
      if (t.value === '(' || t.value === '<' || t.value === '[') depth++;
      else if (t.value === ')' || t.value === '>' || t.value === ']') depth--;
      if (t.value === ';') break;
      parts.push(this.next().value);
    }

    if (this.pos === before) {
      this.next();
      return null;
    }
    return createNode('parametro', compactTokens(parts.join(' ')) || 'parámetro');
  }

  /* ---------- Expresiones ---------- */

  parseExpression(minPrecedence) {
    const min = minPrecedence == null ? 0 : minPrecedence;
    let left = this.parseUnaryExpression();

    if (left && left.type === 'identificador' && this.check('=>')) {
      this.next();
      const params = createNode('parametros', 'parámetros', [createNode('parametro', left.label)]);
      const fn = createNode('funcion', left.label + ' =>');
      fn.children.push(params);
      if (this.check('{')) fn.children.push(this.parseBlock());
      else {
        const body = this.parseExpression();
        if (body) fn.children.push(body);
      }
      left = fn;
    }

    let guard = 0;
    while (left && guard++ < 300) {
      const token = this.peek();
      if (!token || token.type === 'eof') break;

      let operator = null;
      let consume = 1;

      if (token.type === 'palabra_clave' && token.value === 'not' && this.peek(1).value === 'in') {
        operator = 'not in';
        consume = 2;
      } else if (token.type === 'operador' && PRECEDENCE[token.value] !== undefined) {
        operator = token.value;
      } else if (token.type === 'palabra_clave' && PRECEDENCE[token.value] !== undefined) {
        operator = token.value;
      }

      if (!operator) break;
      const precedence = PRECEDENCE[operator];
      if (precedence < min) break;

      for (let k = 0; k < consume; k++) this.next();
      const rightAssociative = operator === '**';
      const right = this.parseExpression(rightAssociative ? precedence : precedence + 1);

      if (!right) break;
      left = createNode('operador', operator, [left, right]);
    }

    return left;
  }

  parseUnaryExpression() {
    const token = this.peek();
    if (!token || token.type === 'eof') return null;

    if (token.type === 'operador' && ['-', '+', '!', '~', '*', '&', '++', '--', '#'].includes(token.value)) {
      this.next();
      const operand = this.parseUnaryExpression();
      return createNode('operador', token.value, operand ? [operand] : []);
    }

    if (token.type === 'palabra_clave' && ['not', 'typeof', 'await', 'sizeof', 'new', 'delete', 'void', 'move', 'ref', 'mut'].includes(token.value)) {
      this.next();
      const operand = this.parseUnaryExpression();
      return createNode('operador', token.value, operand ? [operand] : []);
    }

    return this.parsePostfixExpression();
  }

  looksLikeTypeArgs() {
    let depth = 0;
    let offset = 0;
    let guard = 0;

    while (guard++ < 50) {
      const t = this.peek(offset);
      if (!t || t.type === 'eof') return false;

      if (t.value === '<') {
        depth++;
      } else if (t.value === '>') {
        depth--;
        if (depth === 0) {
          offset++;
          break;
        }
      } else if (!(t.type === 'identificador' || t.type === 'palabra_clave' ||
        [',', '.', '?', '[', ']', '&', '::'].includes(t.value))) {
        return false;
      }
      offset++;
    }

    if (depth !== 0) return false;
    const after = this.peek(offset);
    if (!after) return false;
    return after.type === 'identificador' ||
      ['(', ')', ',', ';', '.', '[', '>', '{', ':', '=>'].includes(after.value);
  }

  consumeTypeArgs() {
    const parts = [];
    let depth = 0;
    while (!this.atEnd()) {
      const t = this.next();
      parts.push(t.value);
      if (t.value === '<') depth++;
      if (t.value === '>') {
        depth--;
        if (depth === 0) break;
      }
    }
    return compactTokens(parts.join(' '));
  }

  parsePostfixExpression() {
    let expr = this.parsePrimaryExpression();
    let guard = 0;

    while (expr && guard++ < 200) {
      const token = this.peek();
      if (!token || token.type === 'eof') break;

      if (token.value === '(') {
        const args = this.parseArguments();
        expr = createNode('llamada', 'llamada', [expr, args]);
        continue;
      }

      if (token.value === '.' || token.value === '?.' || token.value === '::') {
        this.next();
        const prop = this.peek();
        if (prop.type === 'identificador' || prop.type === 'palabra_clave') {
          this.next();
          expr = createNode('acceso', token.value + prop.value, [expr, createNode('identificador', prop.value)]);
        } else {
          expr = createNode('acceso', token.value, [expr]);
        }
        continue;
      }

      if (token.value === '[') {
        this.next();
        const index = this.parseExpression();
        this.match(']');
        expr = createNode('indice', '[]', index ? [expr, index] : [expr]);
        continue;
      }

      if (token.type === 'palabra_clave' && token.value === 'as') {
        this.next();
        const typeParts = [];
        while (!this.atEnd() && typeParts.length < 8 &&
          (this.peek().type === 'identificador' || ['*', '&', '[', ']', '<', '>'].includes(this.peek().value))) {
          typeParts.push(this.next().value);
        }
        expr = createNode('operador', 'as ' + compactTokens(typeParts.join(' ')), [expr]);
        continue;
      }

      if (token.value === '!' && (this.peek(1).value === '(' || this.peek(1).value === '[')) {
        this.next();
        let args;
        if (this.check('(')) {
          args = this.parseArguments();
        } else {
          const items = this.parsePrimaryExpression();
          args = createNode('argumentos', 'argumentos', items ? [items] : []);
        }
        expr = createNode('llamada', 'macro!', [expr, args]);
        continue;
      }

      if (token.value === '++' || token.value === '--') {
        this.next();
        expr = createNode('operador', token.value, [expr]);
        continue;
      }

      if (token.value === '<' && this.lang !== 'python' && this.looksLikeTypeArgs()) {
        const args = this.consumeTypeArgs();
        expr = createNode('tipo', args, [expr]);
        continue;
      }

      break;
    }

    return expr;
  }

  parseArguments() {
    const args = createNode('argumentos', 'argumentos');
    if (!this.check('(')) return args;
    this.next();

    let guard = 0;
    while (!this.atEnd() && !this.check(')') && guard++ < 200) {
      const before = this.pos;
      const expr = this.parseExpression();
      if (expr) args.children.push(expr);
      if (!this.match(',')) {
        if (!this.check(')')) this.next();
        else break;
      }
      if (this.pos === before) this.next();
    }
    this.match(')');
    return args;
  }

  parsePrimaryExpression() {
    const token = this.peek();
    if (!token || token.type === 'eof') return null;

    if (token.type === 'numero' || token.type === 'cadena') {
      this.next();
      return createNode('literal', token.type === 'cadena' ? shortenString(token.value) : token.value);
    }

    if (token.type === 'identificador') {
      this.next();
      return createNode('identificador', token.value);
    }

    if (token.type === 'palabra_clave') {
      const literalWords = LANGUAGES[this.lang].literalWords;
      if (literalWords.has(token.value) || ['True', 'False', 'None', 'NULL', 'nullptr'].includes(token.value)) {
        this.next();
        return createNode('literal', token.value);
      }
      if (['this', 'self', 'super', 'Self'].includes(token.value)) {
        this.next();
        return createNode('identificador', token.value);
      }
      this.next();
      return createNode('identificador', token.value);
    }

    if (token.value === '(') {
      const save = this.pos;
      const params = this.parseParams();
      if (this.check('=>')) {
        this.next();
        const fn = createNode('funcion', '(' + params.children.map((p) => p.label).join(', ') + ') =>');
        fn.children.push(params);
        if (this.check('{')) fn.children.push(this.parseBlock());
        else {
          const body = this.parseExpression();
          if (body) fn.children.push(body);
        }
        return fn;
      }
      this.pos = save;
      this.next();
      const inner = this.parseExpression();
      this.match(')');
      return inner || createNode('literal', '( )');
    }

    if (token.value === '[') {
      this.next();
      const list = createNode('literal', '[lista]');
      while (!this.atEnd() && !this.check(']')) {
        const before = this.pos;
        const item = this.parseExpression();
        if (item) list.children.push(item);
        if (!this.match(',')) {
          if (!this.check(']')) this.next();
          else break;
        }
        if (this.pos === before) this.next();
      }
      this.match(']');
      return list;
    }

    if (token.value === '{') {
      this.next();
      const literal = createNode('literal', '{ ... }');
      while (!this.atEnd() && !this.check('}')) {
        const before = this.pos;
        if (this.peek().type === 'identificador' || this.peek().type === 'cadena') {
          const key = this.next().value;
          if (this.match(':')) {
            const value = this.parseExpression();
            literal.children.push(createNode('asignacion', shortenString(key), value ? [value] : []));
          } else {
            literal.children.push(createNode('literal', shortenString(key)));
          }
        } else {
          const value = this.parseExpression();
          if (value) literal.children.push(value);
        }
        if (!this.match(',')) break;
        if (this.pos === before) this.next();
      }
      this.match('}');
      return literal;
    }

    /* Recuperación: token inesperado */
    this.next();
    return createNode('identificador', token.value || TOKEN_LABELS[token.type] || token.type);
  }
}

function shortenString(value) {
  const text = String(value).replace(/\s+/g, ' ');
  return text.length > 24 ? text.slice(0, 21) + '…' : text;
}

function parse(tokens, langCode) {
  return new Parser(tokens, langCode).parseProgram();
}

/* ------------------------- Visualización ------------------------- */

const SVG_NS = 'http://www.w3.org/2000/svg';
const NODE_H = 34;
const LEVEL_H = 92;
const GAP_X = 22;
const MAX_LABEL = 26;

const NODE_STYLES = {
  programa: { fill: '#152a4a', stroke: '#6ea8fe' },
  declaracion: { fill: '#33280f', stroke: '#f7b955' },
  directiva: { fill: '#2c2513', stroke: '#e0c06a' },
  funcion: { fill: '#2c1f3d', stroke: '#c792ea' },
  control: { fill: '#3a1f29', stroke: '#ff8fa3' },
  operador: { fill: '#123329', stroke: '#4dd4ac' },
  identificador: { fill: '#132c3c', stroke: '#79d0ff' },
  literal: { fill: '#23300f', stroke: '#a5e075' },
  llamada: { fill: '#1c2330', stroke: '#9aa7bd' },
  bloque: { fill: '#161d2a', stroke: '#6b7b92' },
  tipo: { fill: '#2a2436', stroke: '#d0a9f5' },
  asignacion: { fill: '#2b2114', stroke: '#e0b070' },
  acceso: { fill: '#1b2836', stroke: '#8fb8d8' },
  indice: { fill: '#1b2836', stroke: '#8fb8d8' },
  argumentos: { fill: '#141b26', stroke: '#5f6f86' },
  parametros: { fill: '#141b26', stroke: '#5f6f86' },
  parametro: { fill: '#182130', stroke: '#7f93ad' },
  condicion: { fill: '#221b2c', stroke: '#b39ddb' },
  iterable: { fill: '#12251f', stroke: '#5ec8a4' },
  actualizacion: { fill: '#17222e', stroke: '#6f9fb8' }
};

const TOKEN_STYLES = {
  palabra_clave: { bg: '#2b2440', fg: '#d8c4ff', border: '#3d3157' },
  identificador: { bg: '#142c3a', fg: '#a9e2ff', border: '#22475c' },
  numero: { bg: '#253018', fg: '#c8ef9a', border: '#3a4a22' },
  cadena: { bg: '#2a2514', fg: '#ffe08a', border: '#4a4122' },
  operador: { bg: '#123329', fg: '#9df0d2', border: '#1e4d3e' },
  delimitador: { bg: '#1c2330', fg: '#c3d1e2', border: '#2f3b4e' },
  comentario: { bg: '#1e242e', fg: '#8294ad', border: '#2b3442' },
  directiva: { bg: '#33280f', fg: '#ffd894', border: '#4f3d18' },
  nueva_linea: { bg: '#171d27', fg: '#7d90a8', border: '#26303f' },
  indent: { bg: '#171d27', fg: '#7d90a8', border: '#26303f' },
  dedent: { bg: '#171d27', fg: '#7d90a8', border: '#26303f' }
};

const state = {
  tokens: [],
  ast: null,
  lang: null,
  collapsed: new Set(),
  nodes: []
};

const view = { scale: 1, x: 0, y: 0 };

const dom = {};

function svgElement(name, attributes) {
  const element = document.createElementNS(SVG_NS, name);
  if (attributes) {
    for (const key of Object.keys(attributes)) element.setAttribute(key, attributes[key]);
  }
  return element;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function truncateLabel(label) {
  const text = String(label == null ? '' : label);
  return text.length > MAX_LABEL ? text.slice(0, MAX_LABEL - 2) + '…' : text;
}

/* ---------- Layout del árbol ---------- */

function computeLayout(root, collapsed) {
  let cursor = 0;
  const infos = [];

  function visit(node, depth) {
    const visibleChildren = collapsed.has(node) ? [] : node.children;
    const childInfos = visibleChildren.map((child) => visit(child, depth + 1));
    const label = truncateLabel(node.label);
    const width = Math.min(230, Math.max(64, label.length * 7.2 + 30));

    let center;
    if (childInfos.length) {
      center = (childInfos[0].center + childInfos[childInfos.length - 1].center) / 2;
    } else {
      center = cursor;
      cursor += width + GAP_X;
    }

    const info = {
      node,
      depth,
      center,
      width,
      label,
      hiddenCount: node.children.length - visibleChildren.length,
      children: childInfos
    };
    infos.push(info);
    return info;
  }

  const rootInfo = visit(root, 0);

  // Árbol horizontal: usamos la profundidad para la posición Y (fila por nivel)
  // y el centro para la posición X (de izquierda a derecha)
  let minCenter = Infinity;
  let maxCenter = -Infinity;
  for (const info of infos) {
    minCenter = Math.min(minCenter, info.center - info.width / 2);
    maxCenter = Math.max(maxCenter, info.center + info.width / 2);
  }

  const padding = 34;
  for (const info of infos) {
    // Y horizontal: posición por fila (profundidad)
    info.y = padding + info.depth * (NODE_H + GAP_X);
    // X horizontal: basado en el centro (izquierda a derecha)
    info.x = info.center - minCenter + padding;
  }

  return {
    infos,
    rootInfo,
    width: padding * 2 + (maxCenter - minCenter) + NODE_H,
    height: padding * 2 + infos.length * (NODE_H + GAP_X)
  };
}

/* ---------- Dibujo ---------- */

function clearTreeLayers() {
  while (dom.nodesLayer.firstChild) dom.nodesLayer.removeChild(dom.nodesLayer.firstChild);
  while (dom.edgesLayer.firstChild) dom.edgesLayer.removeChild(dom.edgesLayer.firstChild);
}

function drawTree() {
  if (!state.ast || !dom.nodesLayer) return;

  clearTreeLayers();
  const layout = computeLayout(state.ast, state.collapsed);
  state.nodes = layout.infos.map((info) => info.node);

  for (const info of layout.infos) {
    for (const child of info.children) {
      // Arista horizontal: del padre al hijo (izquierda-derecha)
      const x1 = info.x + info.width / 2;
      const y1 = info.y + NODE_H / 2;
      const x2 = child.x + child.width / 2;
      const y2 = child.y + NODE_H / 2;
      const path = svgElement('path', {
        class: 'edge',
        d: 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2
      });
      dom.edgesLayer.appendChild(path);
    }
  }

  layout.infos.forEach((info, index) => {
    const style = NODE_STYLES[info.node.type] || NODE_STYLES.identificador;
    const group = svgElement('g', {
      class: 'node',
      transform: 'translate(' + info.x + ', ' + info.y + ')',
      'data-idx': String(index),
      tabindex: '0',
      role: 'button',
      'aria-label': info.node.type + ': ' + (info.node.label || '')
    });

    const rect = svgElement('rect', {
      class: 'node-rect',
      x: '0',
      y: '0',
      width: String(info.width),
      height: String(NODE_H),
      rx: '9',
      fill: style.fill,
      stroke: style.stroke
    });
    group.appendChild(rect);

    const title = svgElement('title');
    title.textContent = info.node.type + ': ' + (info.node.label || '') +
      (info.node.children.length ? ' (' + info.node.children.length + ' hijos)' : '');
    group.appendChild(title);

    const label = svgElement('text', {
      class: 'node-label',
      x: String(info.hiddenCount > 0 ? info.width / 2 - 7 : info.width / 2),
      y: '21',
      'text-anchor': 'middle'
    });
    label.textContent = info.label;
    group.appendChild(label);

    if (info.hiddenCount > 0) {
      const badge = svgElement('text', {
        class: 'node-badge',
        x: String(info.width - 8),
        y: '21',
        'text-anchor': 'end'
      });
      badge.textContent = '+' + info.hiddenCount;
      group.appendChild(badge);
    }

    dom.nodesLayer.appendChild(group);
  });
}

function applyView() {
  if (!dom.viewport) return;
  dom.viewport.setAttribute(
    'transform',
    'translate(' + view.x + ', ' + view.y + ') scale(' + view.scale + ')'
  );
}

function fitView() {
  if (!state.ast || !dom.svg) return;

  const svgBox = dom.svg.getBoundingClientRect();
  if (!svgBox.width || !svgBox.height) return;

  const content = dom.nodesLayer.getBBox();
  if (!content.width || !content.height) return;

  const padding = 48;
  const scale = clamp(
    Math.min(
      (svgBox.width - padding * 2) / content.width,
      (svgBox.height - padding * 2) / content.height,
      1.2
    ),
    0.15,
    1.2
  );

  view.scale = scale;
  view.x = (svgBox.width - content.width * scale) / 2 - content.x * scale;
  view.y = (svgBox.height - content.height * scale) / 2 - content.y * scale;
  applyView();
}

function zoomBy(factor) {
  if (!dom.svg) return;
  const box = dom.svg.getBoundingClientRect();
  const cx = box.width / 2;
  const cy = box.height / 2;
  const nextScale = clamp(view.scale * factor, 0.12, 2.8);
  view.x = cx - (cx - view.x) * (nextScale / view.scale);
  view.y = cy - (cy - view.y) * (nextScale / view.scale);
  view.scale = nextScale;
  applyView();
}

function toggleNode(index) {
  const node = state.nodes[index];
  if (!node || !node.children.length) return;
  if (state.collapsed.has(node)) state.collapsed.delete(node);
  else state.collapsed.add(node);
  drawTree();
}

/* ---------- Paneles ---------- */

function setStatus(kind, message) {
  if (!dom.status) return;
  const icons = { success: '✓', error: '✕', warn: '!', idle: '•' };
  dom.status.className = 'status status--' + kind;
  dom.statusIcon.textContent = icons[kind] || '•';
  dom.statusText.textContent = message;
}

function setLanguagePill(name) {
  if (!dom.langPill) return;
  if (!name) {
    dom.langPill.textContent = 'Sin analizar';
    dom.langPill.className = 'pill pill--muted';
    return;
  }
  dom.langPill.textContent = 'Lenguaje detectado: ' + name;
  dom.langPill.className = 'pill pill--lang';
}

function showEmpty(title, text) {
  if (!dom.emptyState) return;
  dom.emptyState.classList.remove('hidden');
  const titleEl = dom.emptyState.querySelector('.empty-title');
  const textEl = dom.emptyState.querySelector('.empty-text');
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
}

function resetResults(title, text) {
  state.ast = null;
  state.tokens = [];
  state.nodes = [];
  state.collapsed = new Set();
  clearTreeLayers();
  showEmpty(title || 'Todavía no hay árbol', text || 'Analiza un fragmento de código para ver sus tokens y la jerarquía sintáctica.');
  setLanguagePill(null);
  if (dom.tokenCount) dom.tokenCount.textContent = '0 tokens';
  if (dom.tokensSummary) dom.tokensSummary.textContent = '0 tokens';
  renderTokenRows([]);
}

function renderTokenRows(tokens) {
  if (!dom.tokensBody) return;
  dom.tokensBody.textContent = '';
  const visible = tokens.filter((token) => token.type !== 'eof');

  if (!visible.length) {
    const row = document.createElement('tr');
    row.className = 'table-empty';
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = 'Sin tokens todavía.';
    row.appendChild(cell);
    dom.tokensBody.appendChild(row);
    return;
  }

  visible.forEach((token, index) => {
    const row = document.createElement('tr');

    const indexCell = document.createElement('td');
    indexCell.className = 'col-index';
    indexCell.textContent = String(index + 1);
    row.appendChild(indexCell);

    // Formato de la tabla: <'elemento', tipo>
    const raw = token.type === 'nueva_linea'
      ? '¶'
      : token.type === 'indent'
        ? '→'
        : token.type === 'dedent'
          ? '←'
          : token.value;
    const isSpecial = token.type === 'indent' || token.type === 'dedent' || token.type === 'nueva_linea';

    const syntaxCell = document.createElement('td');
    syntaxCell.className = 'token-syntax';
    syntaxCell.appendChild(document.createTextNode('< '));

    const valueSpan = document.createElement('span');
    valueSpan.className = 'token-value' + (isSpecial ? ' is-empty' : '');
    valueSpan.textContent = "'" + raw + "'";
    syntaxCell.appendChild(valueSpan);
    syntaxCell.appendChild(document.createTextNode(', '));

    const typeSpan = document.createElement('span');
    typeSpan.className = 'token-type';
    const style = TOKEN_STYLES[token.type] || TOKEN_STYLES.delimitador;
    typeSpan.textContent = TOKEN_LABELS[token.type] || token.type;
    typeSpan.style.color = style.fg;
    syntaxCell.appendChild(typeSpan);
    syntaxCell.appendChild(document.createTextNode(' >'));

    row.appendChild(syntaxCell);

    const lineCell = document.createElement('td');
    lineCell.className = 'col-line';
    lineCell.textContent = String(token.line);
    row.appendChild(lineCell);

    dom.tokensBody.appendChild(row);
  });
}

function updateGutter() {
  if (!dom.gutter || !dom.input) return;
  const lines = dom.input.value.split('\n').length;
  let text = '';
  for (let i = 1; i <= lines; i++) text += i + (i < lines ? '\n' : '');
  dom.gutter.textContent = text;
  dom.gutter.scrollTop = dom.input.scrollTop;
}

/* ---------- Análisis ---------- */

function analyze() {
  if (!dom.input) return;
  const code = dom.input.value;

  if (!code.trim()) {
    setStatus('warn', 'El editor está vacío. Escribe o carga un ejemplo para comenzar.');
    resetResults('No hay código que analizar', 'El editor está vacío. Pega código Python, Java, JavaScript, C o Rust.');
    return;
  }

  const detection = detectLanguage(code);

  if (!detection.ok) {
    let message;
    if (detection.reason === 'foreign') {
      message = 'El código parece ' + detection.name +
        ', que no está en la lista de lenguajes registrados (Python, Java, JavaScript, C o Rust). Se detiene la generación del árbol.';
    } else if (detection.reason === 'ambiguous') {
      const names = (detection.candidates || []).map((c) => c.name).join(' o ');
      message = 'No se pudo determinar el lenguaje con seguridad' +
        (names ? ' (¿' + names + '?)' : '') +
        '. Añade más código característico para desambiguar. Se detiene la generación del árbol.';
    } else if (detection.reason === 'empty') {
      message = 'No se encontró código analizable.';
    } else {
      message = 'El código no pertenece a ninguno de los lenguajes registrados (Python, Java, JavaScript, C o Rust)' +
        (detection.foreign ? '; parece ' + detection.foreign : '') +
        '. Se detiene la generación del árbol.';
    }
    setStatus('error', message);
    resetResults('Lenguaje no reconocido', message);
    return;
  }

  try {
    const tokens = tokenize(code, detection.lang);
    const ast = parse(tokens, detection.lang);
    const visibleCount = tokens.filter((token) => token.type !== 'eof').length;

    state.tokens = tokens;
    state.ast = ast;
    state.lang = detection.lang;
    state.collapsed = new Set();

    renderTokenRows(tokens);
    drawTree();
    if (dom.emptyState) dom.emptyState.classList.add('hidden');
    setLanguagePill(detection.name);
    // Habilitar botón Modal solo cuando hay árbol analizado
    const modalBtn = document.getElementById('btn-modal');
    if (modalBtn && state.ast) {
      modalBtn.disabled = false;
      modalBtn.title = 'Ver diagrama en modal (' + detection.name + ')';
    }
    if (dom.tokenCount) dom.tokenCount.textContent = visibleCount + ' tokens';
    if (dom.tokensSummary) dom.tokensSummary.textContent = visibleCount + ' tokens';

    requestAnimationFrame(() => fitView());

    const nodeCount = countNodes(ast);
    setStatus(
      'success',
      'Lenguaje detectado: ' + detection.name + ' · ' + visibleCount + ' tokens · ' +
      nodeCount + ' nodos en el AST. Clic en un nodo para plegarlo.'
    );
  } catch (error) {
    console.error(error);
    setStatus('error', 'Error inesperado al analizar el código: ' + error.message);
    resetResults('Error de análisis', 'No fue posible construir el árbol. Revisa la sintaxis del fragmento.');
  }
}

function countNodes(node) {
  if (!node) return 0;
  let total = 1;
  for (const child of node.children) total += countNodes(child);
  return total;
}

function loadExample(code) {
  if (!dom.input) return;
  dom.input.value = code;
  updateGutter();
  analyze();
}

/* ---------- Inicialización ---------- */

function init() {
  dom.input = document.getElementById('code-input');
  dom.gutter = document.getElementById('gutter');
  dom.svg = document.getElementById('ast-svg');
  dom.viewport = document.getElementById('viewport');
  dom.edgesLayer = document.getElementById('edges-layer');
  dom.nodesLayer = document.getElementById('nodes-layer');
  dom.emptyState = document.getElementById('empty-state');
  dom.status = document.getElementById('status');
  dom.statusIcon = dom.status ? dom.status.querySelector('.status-icon') : null;
  dom.statusText = dom.status ? dom.status.querySelector('.status-text') : null;
  dom.langPill = document.getElementById('lang-pill');
  dom.tokenCount = document.getElementById('token-count');
  dom.tokensBody = document.getElementById('tokens-body');
  dom.tokensSummary = document.getElementById('tokens-summary');
  dom.tokensDetails = document.getElementById('tokens-details');
  dom.analyzeBtn = document.getElementById('btn-analyze');
  dom.clearBtn = document.getElementById('btn-clear');
  dom.zoomIn = document.getElementById('btn-zoom-in');
  dom.zoomOut = document.getElementById('btn-zoom-out');
  dom.fitBtn = document.getElementById('btn-fit');
  dom.canvasWrap = document.getElementById('canvas-wrap');

  if (!dom.input || !dom.svg) return;

  updateGutter();

  dom.input.addEventListener('input', updateGutter);
  dom.input.addEventListener('scroll', updateGutter);
  dom.input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      analyze();
    }
  });

  if (dom.analyzeBtn) dom.analyzeBtn.addEventListener('click', analyze);

  if (dom.clearBtn) {
    dom.clearBtn.addEventListener('click', () => {
      dom.input.value = '';
      updateGutter();
      resetResults();
      setStatus('idle', 'Editor limpio. Esperando código para analizar.');
      dom.input.focus();
    });
  }

  document.querySelectorAll('[data-example]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-example');
      if (EXAMPLES[key]) loadExample(EXAMPLES[key]);
    });
  });

  dom.nodesLayer.addEventListener('click', (event) => {
    if (dragState.moved) return;
    const group = event.target.closest('.node');
    if (!group) return;
    toggleNode(Number(group.getAttribute('data-idx')));
  });

  dom.nodesLayer.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const group = event.target.closest('.node');
    if (!group) return;
    event.preventDefault();
    toggleNode(Number(group.getAttribute('data-idx')));
  });

  if (dom.zoomIn) dom.zoomIn.addEventListener('click', () => zoomBy(1.2));
  if (dom.zoomOut) dom.zoomOut.addEventListener('click', () => zoomBy(1 / 1.2));
  if (dom.fitBtn) dom.fitBtn.addEventListener('click', fitView);

  /* Sidebar toggle */
  const hamburger = document.getElementById('hamburger');
  const layout = document.querySelector('.layout');
  if (hamburger && layout) {
    hamburger.addEventListener('click', () => {
      layout.classList.toggle('sidebar-open');
      hamburger.classList.toggle('active');
    });
  }

  /* Modal AST */
  const modalBtn = document.getElementById('btn-modal');
  if (modalBtn) {
    modalBtn.addEventListener('click', openModalAST);
  }

  /* Zoom con rueda */
  dom.svg.addEventListener('wheel', (event) => {
    if (!state.ast) return;
    event.preventDefault();
    const box = dom.svg.getBoundingClientRect();
    const mx = event.clientX - box.left;
    const my = event.clientY - box.top;
    const factor = Math.exp(-event.deltaY * 0.0015);
    const nextScale = clamp(view.scale * factor, 0.12, 2.8);
    view.x = mx - (mx - view.x) * (nextScale / view.scale);
    view.y = my - (my - view.y) * (nextScale / view.scale);
    view.scale = nextScale;
    applyView();
  }, { passive: false });

  /* Arrastre para desplazar */
  dom.svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !state.ast) return;
    dragState.active = true;
    dragState.moved = false;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.originX = view.x;
    dragState.originY = view.y;
    dragState.pointerId = event.pointerId;
    dom.svg.classList.add('is-panning');
    if (dom.svg.setPointerCapture) dom.svg.setPointerCapture(event.pointerId);
  });

  dom.svg.addEventListener('pointermove', (event) => {
    if (!dragState.active) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) dragState.moved = true;
    if (!dragState.moved) return;
    view.x = dragState.originX + dx;
    view.y = dragState.originY + dy;
    applyView();
  });

  function endDrag() {
    if (!dragState.active) return;
    dragState.active = false;
    dom.svg.classList.remove('is-panning');
    if (dom.svg.releasePointerCapture && dragState.pointerId != null) {
      try { dom.svg.releasePointerCapture(dragState.pointerId); } catch (error) { /* ignorar */ }
    }
    setTimeout(() => { dragState.moved = false; }, 0);
  }

  dom.svg.addEventListener('pointerup', endDrag);
  dom.svg.addEventListener('pointercancel', endDrag);
  dom.svg.addEventListener('pointerleave', (event) => {
    if (dragState.active && event.buttons === 0) endDrag();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === '0' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      fitView();
    }
  });

  showEmpty(
    'Todavía no hay árbol',
    'Analiza un fragmento de código para ver sus tokens y la jerarquía sintáctica.'
  );
}

/* ------------------------- Modal AST ------------------------- */

const domModal = {
  overlay: null,
  content: null,
  svg: null,
  closeBtn: null
};

function openModalAST() {
  const nodes = document.querySelectorAll("#ast-svg g.node");
  const edges = document.querySelectorAll("#ast-svg .edge");

  if (!domModal.overlay) {
    // Crear overlay
    domModal.overlay = document.createElement("div");
    domModal.overlay.className = "modal-overlay";

    // Crear contenido del modal
    domModal.content = document.createElement("div");
    domModal.content.className = "modal-content";

    // Título
    const modalTitle = document.createElement("h3");
    modalTitle.className = "modal-title";
    modalTitle.textContent = "Árbol de Sintaxis Abstracta";

    // Botón de close
    domModal.closeBtn = document.createElement("button");
    domModal.closeBtn.className = "modal-close";
    domModal.closeBtn.setAttribute("aria-label", "Cerrar modal");
    domModal.closeBtn.innerHTML = "×";

    // Contenedor del SVG
    const modalSVGWrap = document.createElement("div");
    modalSVGWrap.className = "modal-svg";

    // Clonar el SVG actual
    const originalSvg = document.querySelector("#ast-svg");
    if (originalSvg) {
      const svgClone = originalSvg.cloneNode(true);
      svgClone.setAttribute("style", "width: 100%; height: auto; max-height: 600px;");
      // Añadir focus-visible para nodos
      const nodesInClone = svgClone.querySelectorAll(".node");
      nodesInClone.forEach((n, i) => {
        n.setAttribute("role", "button");
        n.datasetIdx = i;
      });
      modalSVGWrap.appendChild(svgClone);
    }

    // Controles de zoom del modal
    const modalZoomWrap = document.createElement("div");
    modalZoomWrap.className = "modal-zoom-controls";
    const modalZoomIn = document.createElement("button");
    modalZoomIn.className = "modal-zoom-btn";
    modalZoomIn.title = "Acercar";
    modalZoomIn.innerHTML = "+";
    modalZoomIn.addEventListener("click", () => {
      const svg = modalSVGWrap.querySelector("svg");
      if (svg) {
        let current = parseFloat(svg.getAttribute("scale") || "1");
        svg.setAttribute("scale", Math.min(current + 0.2, 3).toString());
      }
    });
    const modalZoomOut = document.createElement("button");
    modalZoomOut.className = "modal-zoom-btn";
    modalZoomOut.title = "Alejar";
    modalZoomOut.innerHTML = "−";
    modalZoomOut.addEventListener("click", () => {
      const svg = modalSVGWrap.querySelector("svg");
      if (svg) {
        let current = parseFloat(svg.getAttribute("scale") || "1");
        svg.setAttribute("scale", Math.max(current - 0.2, 0.1).toString());
      }
    });
    const modalZoomFit = document.createElement("button");
    modalZoomFit.className = "modal-zoom-btn";
    modalZoomFit.title = "Ajustar a pantalla";
    modalZoomFit.innerHTML = "⛶";
    modalZoomFit.addEventListener("click", fitViewModal);
    modalZoomWrap.append(modalZoomIn, modalZoomOut, modalZoomFit);

    // Pista
    const modalHint = document.createElement("div");
    modalHint.className = "modal-hint";
    modalHint.textContent = "Rueda: zoom · Clic en nodo: plegar · Arrastra para mover";

    // Ensamblar modal
    domModal.content.appendChild(modalTitle);
    domModal.content.appendChild(domModal.closeBtn);
    domModal.content.appendChild(modalZoomWrap);
    domModal.content.appendChild(modalSVGWrap);
    domModal.content.appendChild(modalHint);

    domModal.overlay.appendChild(domModal.content);
    document.body.appendChild(domModal.overlay);

    // Eventos de nodo: clic para plegar/desplegar
    const modalNodes = modalSVGWrap.querySelectorAll(".node");
    modalNodes.forEach(n => {
      n.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = n.datasetIdx != null ? n.datasetIdx : 0;
        toggleNode(idx);
      });
    });

    // Funcionalidad de arrastre (pan) para el SVG del modal
    let modalDragging = false;
    let modalDragStartX = 0;
    let modalDragStartY = 0;
    let modalSVGOriginX = 0;
    let modalSVGOriginY = 0;
    const modalSvg = modalSVGWrap.querySelector('svg');
    if (modalSvg) {
      modalSvg.addEventListener('mousedown', (e) => {
        if (e.target === modalSvg || e.target.closest('.node') === null) {
          e.preventDefault();
          modalDragging = true;
          modalDragStartX = e.clientX;
          modalDragStartY = e.clientY;
          modalSVGOriginX = parseFloat(modalSvg.getAttribute('scale')) || 1;
          modalSvg.setPointerCapture(e.pointerId);
        }
      });
      window.addEventListener('mousemove', (e) => {
        if (!modalDragging) return;
        const deltaX = e.clientX - modalDragStartX;
        const deltaY = e.clientY - modalDragStartY;
        const currentScale = parseFloat(modalSvg.getAttribute('scale')) || 1;
        modalSvg.setAttribute('scale', Math.max(0.1, Math.min(3, currentScale)));      });
      window.addEventListener('mouseup', () => {
        modalDragging = false;
      });
      modalSvg.addEventListener('mouseleave', () => {
        modalDragging = false;
      });
      // Soporte táctil
      modalSvg.addEventListener('touchstart', (e) => {
        e.preventDefault();
        modalDragging = true;
        modalDragStartX = e.touches[0].clientX;
        modalDragStartY = e.touches[0].clientY;
        modalSVGOriginX = parseFloat(modalSvg.getAttribute('scale')) || 1;
      });
      modalSvg.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!modalDragging) return;
        const deltaX = e.touches[0].clientX - modalDragStartX;
        const deltaY = e.touches[0].clientY - modalDragStartY;
        const currentScale = parseFloat(modalSvg.getAttribute('scale')) || 1;
        modalSvg.setAttribute('scale', Math.max(0.1, Math.min(3, currentScale)));      });
      modalSvg.addEventListener('touchend', () => {
        modalDragging = false;
      });
    }

    // Eventos
    domModal.closeBtn.addEventListener("click", closeModalAST);
    domModal.overlay.addEventListener("click", (e) => {
      if (e.target === domModal.overlay) closeModalAST();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModalAST();
    });
  }

  domModal.overlay.classList.add("active");
  document.body.classList.add('body-modal-open');
  document.body.style.overflow = "hidden";
}

function closeModalAST() {
  if (domModal.overlay) {
    domModal.overlay.classList.remove("active");
  }
  if (domModal.closeBtn) {
    domModal.closeBtn.removeEventListener("click", closeModalAST);
  }
  document.removeEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModalAST();
  });
  if (domModal.overlay && domModal.overlay.parentNode) {
    domModal.overlay.parentNode.removeChild(domModal.overlay);
    domModal.overlay = null;
  }
  document.body.classList.remove('body-modal-open');
  document.body.style.overflow = "";
}

function fitViewModal() {
  const modalSvg = domModal.content.querySelector('.modal-svg svg');
  if (!modalSvg) return;
  const content = modalSvg.getBBox();
  if (!content.width || !content.height) return;

  const modalContent = domModal.content;
  const maxWidth = parseFloat(getComputedStyle(modalContent).maxWidth) || 960;
  const maxHeight = parseFloat(getComputedStyle(modalContent).maxHeight) || 880;
  const modalRect = modalContent.getBoundingClientRect();
  const scale = Math.min((modalRect.width - 48) / content.width, (modalRect.height - 48) / content.height);

  modalSvg.setAttribute('scale', scale.toString());
}

const dragState = { active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0, pointerId: null };

/* ------------------------- Arranque ------------------------- */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LANGUAGES,
    EXAMPLES,
    TOKEN_LABELS,
    tokenize,
    detectLanguage,
    stripNoise,
    parse,
    compactTokens
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
