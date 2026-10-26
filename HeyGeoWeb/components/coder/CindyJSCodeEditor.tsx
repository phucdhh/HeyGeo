'use client';
/**
 * CindyJSCodeEditor – CodeMirror 6 editor for CindyJS code.
 * Same as JSXGraphCodeEditor but uses cindyCompletions instead.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { lintGutter, linter, type Diagnostic } from '@codemirror/lint';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from '@codemirror/language';
import { cindyCompletions } from './cindyCompletions';

export interface CodeEditorHandle {
  getCode: () => string;
  insertAtCursor: (text: string) => void;
}

interface Props {
  initialCode: string;
  onChange: (code: string) => void;
  onRun: () => void;
}

// ─── Syntax linter ────────────────────────────────────────────────────────────
// Skip JS syntax check when code is an HTML fragment (gallery paste mode).
const HTML_PATTERN = /^\s*</;

const syntaxLinter = linter((view) => {
  const code = view.state.doc.toString();
  // HTML mode: the browser's HTML parser handles it — no JS linting needed.
  if (HTML_PATTERN.test(code)) return [];
  const diagnostics: Diagnostic[] = [];
  try {
    // eslint-disable-next-line no-new-func
    new Function(code);
  } catch (e) {
    if (e instanceof SyntaxError) {
      const msg = e.message;
      const lineMatch = msg.match(/line (\d+)/i);
      const lineNum = lineMatch ? parseInt(lineMatch[1], 10) - 1 : 0;
      const docLine = view.state.doc.line(Math.max(1, Math.min(lineNum + 1, view.state.doc.lines)));
      diagnostics.push({
        from: docLine.from,
        to: docLine.to,
        severity: 'error',
        message: `SyntaxError: ${msg}`,
      });
    }
  }
  // Warn if CindyJS() is not called — required for canvas + thumbnail.
  if (!code.includes('CindyJS(')) {
    diagnostics.push({
      from: 0,
      to: view.state.doc.line(1).to,
      severity: 'warning',
      message: 'Thiếu CindyJS(…). Editor này dành riêng cho CindyJS — hãy dùng CindyJS({ ports, scripts, … }) để tạo mô hình có canvas (canvas cần thiết để tạo thumbnail).',
    });
  }
  return diagnostics;
});

// ─── Component ────────────────────────────────────────────────────────────────
const CindyJSCodeEditor = forwardRef<CodeEditorHandle, Props>(function CindyJSCodeEditor(
  { initialCode, onChange, onRun },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef      = useRef<EditorView | null>(null);
  const onRunRef     = useRef(onRun);
  const onChangeRef  = useRef(onChange);
  onRunRef.current   = onRun;
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    getCode: () => viewRef.current?.state.doc.toString() ?? '',
    insertAtCursor: (text: string) => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
      view.focus();
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const runKeymap = keymap.of([
      {
        key: 'Ctrl-Enter',
        mac: 'Cmd-Enter',
        run: () => { onRunRef.current(); return true; },
      },
    ]);

    const state = EditorState.create({
      doc: initialCode,
      extensions: [
        oneDark,
        lineNumbers(),
        lintGutter(),
        foldGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        drawSelection(),
        EditorView.lineWrapping,
        javascript(),
        syntaxHighlighting(defaultHighlightStyle),
        syntaxLinter,
        autocompletion({
          override: [cindyCompletions],
          activateOnTyping: true,
          closeOnBlur: true,
        }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),
        runKeymap,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13.5px',
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'inherit' },
          '.cm-content': { padding: '8px 0' },
          '.cm-gutters': { borderRight: '1px solid #333' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when initialCode changes (e.g. loading a saved model)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== initialCode) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: initialCode },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden h-full"
      style={{ minHeight: 0 }}
    />
  );
});

export default CindyJSCodeEditor;
