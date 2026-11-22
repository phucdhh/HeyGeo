'use client';

/**
 * HtmlCodeEditor – CodeMirror 6 editor for a complete HTML document.
 *
 * Unlike the JSXGraph, CindyJS and MathBox editors there is nothing to lint or
 * complete here: the document is whatever the author (or their AI assistant)
 * wrote, including script tags HeyGeo does not understand.  The language pack
 * still highlights the markup and the embedded CSS and JavaScript.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  foldGutter,
  foldKeymap,
  indentOnInput,
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';

export interface HtmlEditorHandle {
  getCode: () => string;
}

interface Props {
  initialCode: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onSave: () => void;
}

const HtmlCodeEditor = forwardRef<HtmlEditorHandle, Props>(function HtmlCodeEditor(
  { initialCode, onChange, onRun, onSave },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef      = useRef<EditorView | null>(null);
  const onRunRef     = useRef(onRun);
  const onSaveRef    = useRef(onSave);
  const onChangeRef  = useRef(onChange);
  onRunRef.current    = onRun;
  onSaveRef.current   = onSave;
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    getCode: () => viewRef.current?.state.doc.toString() ?? '',
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: initialCode,
      extensions: [
        oneDark,
        lineNumbers(),
        foldGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        drawSelection(),
        EditorView.lineWrapping,
        html({ matchClosingTags: true, autoCloseTags: true }),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([
          { key: 'Ctrl-Enter', mac: 'Cmd-Enter', run: () => { onRunRef.current(); return true; } },
          { key: 'Mod-s',      run: () => { onSaveRef.current(); return true; } },
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13.5px',
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'inherit' },
          '.cm-content':    { padding: '8px 0' },
          '.cm-gutters':    { borderRight: '1px solid #333' },
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

  return <div ref={containerRef} className="flex-1 overflow-hidden h-full" style={{ minHeight: 0 }} />;
});

export default HtmlCodeEditor;
