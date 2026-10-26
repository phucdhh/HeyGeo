'use client';

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { richTextToHtml } from '@/lib/richtext';

interface Props {
  children: string;
  className?: string;
}

/**
 * Renders a string that may contain inline ($...$) and display ($$...$$) LaTeX.
 * Plain text is HTML-escaped. Math is rendered via KaTeX.
 */
function renderToHtml(raw: string): string {
  // Split on $$...$$ first, then $...$
  const parts = raw.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        try {
          return `<div class="katex-display-wrap">${katexSilent(
            wrapNonAscii(part.slice(2, -2)),
            { displayMode: true, throwOnError: false, strict: 'ignore' }
          )}</div>`;
        } catch {
          return escapeHtml(part);
        }
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        try {
          return katexSilent(
            wrapNonAscii(part.slice(1, -1)),
            { displayMode: false, throwOnError: false, strict: 'ignore' }
          );
        } catch {
          return escapeHtml(part);
        }
      }
      return richTextToHtml(part);
    })
    .join('');
}

/** katex.renderToString with console.warn suppressed for the duration of the call. */
function katexSilent(
  input: string,
  opts: Parameters<typeof katex.renderToString>[1]
): string {
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    return katex.renderToString(input, opts);
  } finally {
    console.warn = origWarn;
  }
}

/**
 * Wraps sequences of non-ASCII characters in \text{} so KaTeX renders them
 * as plain text using the document font rather than trying to find them in
 * math glyph tables (which causes "Unrecognized Unicode character" for
 * Vietnamese / CJK / accented letters).
 */
function wrapNonAscii(latex: string): string {
  return latex.replace(/([^\x00-\x7F]+)/g, (match) => `\\text{${match}}`);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function LatexRenderer({ children, className }: Props) {
  const html = useMemo(() => renderToHtml(children), [children]);
  return (
    <span
      className={`latex-content${className ? ' ' + className : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
