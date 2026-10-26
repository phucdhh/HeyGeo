'use client';
/**
 * JSXGraphCodeEditor – CodeMirror 6 editor with:
 *  - JavaScript syntax highlighting (One Dark theme)
 *  - Real-time syntax error linting
 *  - JSXGraph-specific autocomplete
 *  - Tab key inserts 2 spaces
 *  - Ctrl/Cmd+Enter fires onRun
 *  - Exposes getCode() via ref
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, WidgetType, Decoration, type DecorationSet, type KeyBinding } from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completionKeymap, completionStatus } from '@codemirror/autocomplete';
import { lintGutter, linter, type Diagnostic } from '@codemirror/lint';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from '@codemirror/language';
import { jsxgraphCompletions } from './jsxgraphCompletions';

export interface CodeEditorHandle {
  getCode: () => string;
  insertAtCursor: (text: string) => void;
  /** Show ghost-text AI suggestion after the cursor */
  setSuggestion: (text: string) => void;
  /** Clear any visible ghost-text suggestion */
  clearSuggestion: () => void;
}

interface Props {
  initialCode: string;
  onChange: (code: string) => void;
  onRun: () => void;
  /** Called on every keystroke so the parent can trigger AI suggestions */
  onSuggest?: (code: string, charBefore: string) => void;
}

// ─── Ghost-text (AI suggestion) infrastructure ────────────────────────────────

/** StateEffect to set a new suggestion */
const aiSetEffect = StateEffect.define<string>();
/** StateEffect to clear the current suggestion */
const aiClearEffect = StateEffect.define<void>();

/** Widget that renders the ghost text after the cursor */
class GhostTextWidget extends WidgetType {
  constructor(readonly text: string) { super(); }
  eq(other: GhostTextWidget) { return other.text === this.text; }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-ai-ghost';
    span.textContent = this.text;
    return span;
  }
  ignoreEvent() { return true; }
}

/**
 * StateField storing AI suggestion as { text, pos, decos }.
 *
 * Root cause of the crash: `EditorView.decorations.from` internally maps the
 * *previous* DecorationSet through every changeset before the `provide` function
 * can return Decoration.none. If the stored `pos` is at the old doc boundary,
 * the mapping throws RangeError.
 *
 * Fix: store the DecorationSet directly in the field and call `.map(tr.changes)`
 * *before* clearing, so positions are always valid for the current document.
 */
const aiSuggestionField = StateField.define<{
  text: string;
  pos:  number;
} | null>({
  create: () => null,
  update(val, tr) {
    if (tr.docChanged || tr.selection) return null;

    for (const e of tr.effects) {
      if (e.is(aiSetEffect)) {
        return {
          text: e.value,
          pos: tr.state.selection.main.head,
        };
      }
      if (e.is(aiClearEffect)) return null;
    }
    return val;
  },
  provide(field) {
    return EditorView.decorations.from(field, (val) => {
      if (!val) return Decoration.none;
      return Decoration.set([
        Decoration.widget({ widget: new GhostTextWidget(val.text), side: 1 }).range(val.pos),
      ]);
    });
  },
});

/** Tab keymap: accept AI ghost text if no autocomplete dropdown is open */
const aiTabBinding: KeyBinding = {
  key: 'Tab',
  run(view) {
    // If autocomplete dropdown is active, let completionKeymap handle Tab
    if (completionStatus(view.state) !== null) return false;
    const val = view.state.field(aiSuggestionField);
    if (!val) return false;
    const cursorPos = view.state.selection.main.head;
    // Safety: cursor may have drifted
    if (cursorPos !== val.pos) {
      view.dispatch({ effects: aiClearEffect.of() });
      return false;
    }
    view.dispatch({
      changes:  { from: cursorPos, insert: val.text },
      selection: { anchor: cursorPos + val.text.length },
      effects:  aiClearEffect.of(),
    });
    return true;
  },
};

// ─── Syntax linter using `new Function` parse trick ───────────────────────────
const syntaxLinter = linter((view) => {
  const code = view.state.doc.toString();
  const diagnostics: Diagnostic[] = [];
  try {
    // We use Function constructor just to parse & throw SyntaxError — never executed
    // eslint-disable-next-line no-new-func
    new Function(code);
  } catch (e) {
    if (e instanceof SyntaxError) {
      // Try to extract line/col from the error message
      const msg = e.message;
      // Heuristic: mark whole document or try to find the offending line
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
  return diagnostics;
});

// ─── Component ────────────────────────────────────────────────────────────────
const JSXGraphCodeEditor = forwardRef<CodeEditorHandle, Props>(function JSXGraphCodeEditor(
  { initialCode, onChange, onRun, onSuggest },
  ref
) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const viewRef       = useRef<EditorView | null>(null);
  const onRunRef      = useRef(onRun);
  const onChangeRef   = useRef(onChange);
  const onSuggestRef  = useRef(onSuggest);
  onRunRef.current    = onRun;
  onChangeRef.current = onChange;
  onSuggestRef.current = onSuggest;

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
    setSuggestion: (text: string) => {
      const view = viewRef.current;
      if (!view || !text.trim()) return;
      // Skip if autocomplete dropdown is active — calling closeCompletion() then dispatch
      // causes the autocompletion ViewPlugin (fromClass) to crash with RangeError
      if (completionStatus(view.state) !== null) return;
      view.dispatch({ effects: aiSetEffect.of(text) });
    },
    clearSuggestion: () => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({ effects: aiClearEffect.of() });
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
        // Theme
        oneDark,
        // Line numbers & gutter
        lineNumbers(),
        lintGutter(),
        foldGutter(),
        // Editing features
        history(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        drawSelection(),
        // Word wrap
        EditorView.lineWrapping,
        // JavaScript language support
        javascript(),
        syntaxHighlighting(defaultHighlightStyle),
        // Linting
        syntaxLinter,
        // JSXGraph Autocomplete
        autocompletion({
          override: [jsxgraphCompletions],
          activateOnTyping: true,
          closeOnBlur: true,
        }),
        // Key mappings
        // Ghost-text AI suggestion state + decoration
        aiSuggestionField,
        // CSS for ghost text
        EditorView.baseTheme({
          '.cm-ai-ghost': {
            color: '#7a8a9a',
            opacity: '0.7',
            fontStyle: 'italic',
            pointerEvents: 'none',
            userSelect: 'none',
          },
        }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...foldKeymap,
          aiTabBinding,   // accept ghost text with Tab (defers to completionKeymap when dropdown open)
          indentWithTab, // fallback Tab → indent
        ]),
        runKeymap,
        // On-change listener: fires onChange and optionally onSuggest
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const code = update.state.doc.toString();
            const cursorPos = update.state.selection.main.head;
            const charBefore = cursorPos > 0 ? code[cursorPos - 1] : '';
            onChangeRef.current(code);
            onSuggestRef.current?.(code, charBefore);
          }
        }),
        // Editor style
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
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external initialCode changes (e.g. loading a saved model)
  // but only if the editor content differs (avoid cursor reset on every keystroke)
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

export default JSXGraphCodeEditor;
