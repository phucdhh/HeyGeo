'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  richTextToHtml,
  RICHTEXT_COLORS,
  BASE_FONT_SIZE,
  MAX_FONT_SIZE,
  clampFontSize,
  isAllowedLinkUrl,
  ALLOWED_LINK_DOMAINS,
} from '@/lib/richtext';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}

function renderToHtml(raw: string): string {
  const parts = raw.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        try {
          return `<div style="margin:0.4em 0;text-align:center">${katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false })}</div>`;
        } catch {
          return escapeHtml(part);
        }
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        try {
          return katex.renderToString(part.slice(1, -1), { displayMode: false, throwOnError: false });
        } catch {
          return escapeHtml(part);
        }
      }
      return richTextToHtml(part);
    })
    .join('');
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Selection-aware [tag]/[tag=attr] wrap helpers -----------------------

function findOpenTagEndingAt(value: string, pos: number, tag: string): { start: number; attr?: string } | null {
  const re = new RegExp(`\\[${tag}(?:=([^\\]]*))?\\]$`);
  const m = value.slice(0, pos).match(re);
  if (!m) return null;
  return { start: pos - m[0].length, attr: m[1] };
}

function findCloseTagStartingAt(value: string, pos: number, tag: string): number | null {
  const closeStr = `[/${tag}]`;
  return value.slice(pos, pos + closeStr.length) === closeStr ? pos : null;
}

interface WrapResult { text: string; selStart: number; selEnd: number }

/** Wrap/re-wrap/unwrap the selection [start,end) of `value` with [tag] or [tag=attr]. */
function computeWrap(
  value: string,
  start: number,
  end: number,
  tag: string,
  attr: string | undefined,
  toggleOffIfSameAttr: boolean
): WrapResult {
  const open = findOpenTagEndingAt(value, start, tag);
  const closeTag = `[/${tag}]`;
  const closeStart = findCloseTagStartingAt(value, end, tag);
  const selected = value.slice(start, end);
  const wrapped = open !== null && closeStart !== null;

  if (wrapped) {
    const head = value.slice(0, open!.start);
    const tail = value.slice(closeStart! + closeTag.length);
    const sameAttr = (open!.attr ?? '') === (attr ?? '');
    if (toggleOffIfSameAttr && sameAttr) {
      const text = head + selected + tail;
      return { text, selStart: head.length, selEnd: head.length + selected.length };
    }
    const openTag = attr !== undefined ? `[${tag}=${attr}]` : `[${tag}]`;
    const text = head + openTag + selected + closeTag + tail;
    return { text, selStart: head.length + openTag.length, selEnd: head.length + openTag.length + selected.length };
  }

  const openTag = attr !== undefined ? `[${tag}=${attr}]` : `[${tag}]`;
  const text = value.slice(0, start) + openTag + selected + closeTag + value.slice(end);
  return { text, selStart: start + openTag.length, selEnd: start + openTag.length + selected.length };
}

function unwrapTag(value: string, start: number, end: number, tag: string): WrapResult | null {
  const open = findOpenTagEndingAt(value, start, tag);
  const closeTag = `[/${tag}]`;
  const closeStart = findCloseTagStartingAt(value, end, tag);
  if (!open || closeStart === null) return null;
  const selected = value.slice(start, end);
  const head = value.slice(0, open.start);
  const tail = value.slice(closeStart + closeTag.length);
  const text = head + selected + tail;
  return { text, selStart: head.length, selEnd: head.length + selected.length };
}

function ToolbarButton({
  onClick, title, children, disabled, active,
}: { onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      // Prevent the textarea from losing its selection when the toolbar is clicked.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[1.75rem] h-7 px-1.5 flex items-center justify-center rounded-md text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Generic toolbar dropdown: a trigger button that reveals a floating panel
 * (closed on outside click). Reused for the color menu today; new toolbar
 * features (highlight, font family, alignment, …) can follow the same shape.
 */
function ToolbarDropdown({
  trigger, title, disabled, open, onOpenChange, children,
}: {
  trigger: React.ReactNode;
  title: string;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={containerRef}>
      <ToolbarButton title={title} disabled={disabled} active={open} onClick={() => onOpenChange(!open)}>
        {trigger}
      </ToolbarButton>
      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-20 top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * A two-panel LaTeX-aware editor:
 * left pane  = raw text input  (textarea) + formatting toolbar
 * right pane = live KaTeX / rich-text preview
 */
export default function LatexEditor({ label, value, onChange, rows = 6, placeholder }: Props) {
  const html = useMemo(() => renderToHtml(value), [value]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkHasExisting, setLinkHasExisting] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  const updateSelectionState = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    setHasSelection(ta.selectionStart !== ta.selectionEnd);
  };

  const applyResult = (r: WrapResult) => {
    const ta = textareaRef.current;
    onChange(r.text);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(r.selStart, r.selEnd);
      updateSelectionState();
    });
  };

  const toggleTag = (tag: string) => {
    const ta = textareaRef.current;
    if (!ta || ta.selectionStart === ta.selectionEnd) return;
    applyResult(computeWrap(ta.value, ta.selectionStart, ta.selectionEnd, tag, undefined, true));
  };

  const applyColor = (key: string) => {
    const ta = textareaRef.current;
    if (!ta || ta.selectionStart === ta.selectionEnd) return;
    applyResult(computeWrap(ta.value, ta.selectionStart, ta.selectionEnd, 'color', key, true));
    setColorMenuOpen(false);
  };

  const applySizeDelta = (delta: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end, value: val } = ta;
    if (start === end) return;

    const open = findOpenTagEndingAt(val, start, 'size');
    const closeStart = findCloseTagStartingAt(val, end, 'size');
    const wrapped = open !== null && closeStart !== null;
    const closeTag = '[/size]';
    const selected = val.slice(start, end);

    const curr = wrapped ? clampFontSize(parseInt(open!.attr ?? '', 10)) : BASE_FONT_SIZE;
    const next = clampFontSize(curr + delta);

    const head = wrapped ? val.slice(0, open!.start) : val.slice(0, start);
    const tail = wrapped ? val.slice(closeStart! + closeTag.length) : val.slice(end);

    let text: string;
    let selStart: number;
    if (next === BASE_FONT_SIZE) {
      text = head + selected + tail;
      selStart = head.length;
    } else {
      const openTag = `[size=${next}]`;
      text = head + openTag + selected + closeTag + tail;
      selStart = head.length + openTag.length;
    }
    applyResult({ text, selStart, selEnd: selStart + selected.length });
  };

  const openLinkPopover = () => {
    const ta = textareaRef.current;
    if (!ta || ta.selectionStart === ta.selectionEnd) return;
    const open = findOpenTagEndingAt(ta.value, ta.selectionStart, 'url');
    const closeStart = findCloseTagStartingAt(ta.value, ta.selectionEnd, 'url');
    const existing = open !== null && closeStart !== null;
    setLinkHasExisting(existing);
    setLinkValue(existing ? (open!.attr ?? '') : 'https://');
    setLinkError('');
    setLinkOpen(true);
  };

  const confirmLink = () => {
    const ta = textareaRef.current;
    if (!ta || ta.selectionStart === ta.selectionEnd) return;
    if (!isAllowedLinkUrl(linkValue)) {
      setLinkError(`Chỉ cho phép liên kết https tới ${ALLOWED_LINK_DOMAINS.join(' hoặc ')} (và tên miền con của chúng).`);
      return;
    }
    applyResult(computeWrap(ta.value, ta.selectionStart, ta.selectionEnd, 'url', linkValue.trim(), false));
    setLinkOpen(false);
    setLinkError('');
  };

  const removeLink = () => {
    const ta = textareaRef.current;
    if (!ta || ta.selectionStart === ta.selectionEnd) return;
    const r = unwrapTag(ta.value, ta.selectionStart, ta.selectionEnd, 'url');
    if (r) applyResult(r);
    setLinkOpen(false);
    setLinkError('');
  };

  return (
    <div>
      <label className="text-xs font-bold text-indigo-600 block mb-1">{label}</label>

      {/* hint */}
      <p className="text-[10px] text-gray-400 mb-2">
        Sử dụng <code className="bg-gray-100 px-0.5 rounded">$…$</code> cho công thức nội tuyến,{' '}
        <code className="bg-gray-100 px-0.5 rounded">$$…$$</code> cho công thức hiển thị. Bôi đen văn bản rồi dùng
        thanh công cụ bên dưới để định dạng.
      </p>

      {/* Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-1 mb-2 p-1 bg-gray-50 border border-gray-200 rounded-lg">
        <ToolbarButton title="In đậm" disabled={!hasSelection} onClick={() => toggleTag('b')}>
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton title="In xiêng" disabled={!hasSelection} onClick={() => toggleTag('i')}>
          <i>I</i>
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-0.5" />

        <ToolbarDropdown
          title="Màu chữ"
          disabled={!hasSelection}
          open={colorMenuOpen}
          onOpenChange={setColorMenuOpen}
          trigger={<span style={{ color: '#dc2626' }}>A</span>}
        >
          <div className="grid grid-cols-5 gap-1.5 w-[9.5rem]">
            {RICHTEXT_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                title={c.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyColor(c.key)}
                className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </ToolbarDropdown>

        <span className="w-px h-5 bg-gray-300 mx-0.5" />

        <ToolbarButton title={`Giảm cỡ chữ (tối thiểu ${BASE_FONT_SIZE}px)`} disabled={!hasSelection} onClick={() => applySizeDelta(-1)}>
          A-
        </ToolbarButton>
        <ToolbarButton title={`Tăng cỡ chữ (tối đa ${MAX_FONT_SIZE}px)`} disabled={!hasSelection} onClick={() => applySizeDelta(1)}>
          A+
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-300 mx-0.5" />

        <ToolbarButton title="Chèn liên kết" disabled={!hasSelection} onClick={openLinkPopover} active={linkOpen}>
          🔗
        </ToolbarButton>
      </div>

      {linkOpen && (
        <div className="mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
          <p className="text-[10px] text-gray-400 mb-1">
            Chỉ chấp nhận liên kết https tới {ALLOWED_LINK_DOMAINS.join(', ')} (hoặc tên miền con, ví dụ heygeo.pedu.vn).
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={linkValue}
              onChange={(e) => { setLinkValue(e.target.value); setLinkError(''); }}
              placeholder="https://heygeo.pedu.vn/…"
              className="input-field text-sm flex-1"
            />
            <button type="button" onClick={confirmLink} className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">
              Chèn
            </button>
            {linkHasExisting && (
              <button type="button" onClick={removeLink} className="text-xs px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                Bỏ liên kết
              </button>
            )}
            <button type="button" onClick={() => { setLinkOpen(false); setLinkError(''); }} className="text-xs px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              ✕
            </button>
          </div>
          {linkError && <p className="text-[10px] text-red-600 mt-1">{linkError}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-0.5">
        <span className="font-medium">✏️ Văn bản thô</span>
        <span className="font-medium">👁 Xem trước</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Raw editor */}
        <textarea
          ref={textareaRef}
          rows={rows}
          className="input-field text-sm resize-y font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={updateSelectionState}
          onMouseUp={updateSelectionState}
          onKeyUp={updateSelectionState}
          placeholder={placeholder}
        />

        {/* Preview */}
        <div
          className="input-field text-sm overflow-y-auto bg-gray-50 latex-content"
          style={{ minHeight: `${rows * 1.625}rem` }}
          dangerouslySetInnerHTML={{ __html: html || `<span class="text-gray-300 italic">${placeholder ?? 'Xem trước…'}</span>` }}
        />
      </div>
    </div>
  );
}
