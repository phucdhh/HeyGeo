'use client';

/**
 * MathboxStudio – standalone full-page MathBox code editor.
 * Top-level component for /mathbox.
 */

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SaveModelDialog from '@/components/designer/SaveModelDialog';
import type { MathboxPanelHandle } from '@/components/coder/MathboxModePanel';
import MathboxModePanel from '@/components/coder/MathboxModePanel';

interface Props {
  modelId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialIsPublic?: boolean;
  initialCode?: string;
}

export default function MathboxStudio({
  modelId,
  initialTitle,
  initialDescription = '',
  initialIsPublic = false,
  initialCode,
}: Props) {
  const { t } = useTranslation();
  const mathboxPanelRef = useRef<MathboxPanelHandle | null>(null);

  // undefined = untitled; resolved at render so it follows the language after hydration
  const [titleValue,  setTitle]       = useState<string | undefined>(initialTitle);
  const title = titleValue ?? t('mathbox.untitled');
  const [description, setDescription] = useState(initialDescription);
  const [isPublic,    setIsPublic]    = useState(initialIsPublic);
  const [editingId,   setEditingId]   = useState<string | undefined>(modelId);
  const [isDirty,     setIsDirty]     = useState(false);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [saveError,      setSaveError]      = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showSaveSuccess(msg: string) {
    setSaveSuccessMsg(msg);
    if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    saveSuccessTimer.current = setTimeout(() => setSaveSuccessMsg(''), 3000);
  }

  function handleSave() {
    if (editingId) {
      doSave(title, description, isPublic, editingId);
    } else {
      setShowSaveDialog(true);
    }
  }

  const doSave = useCallback(async (
    saveTitle: string,
    saveDesc: string,
    pub: boolean,
    updateId?: string,
  ) => {
    setIsSaving(true);
    setSaveError('');
    try {
      const code = mathboxPanelRef.current?.getCode() ?? '';
      const thumbDataUrl = await mathboxPanelRef.current?.captureThumb() ?? null;

      const jsonData = {
        __type: 'mathbox' as const,
        version: '1.0',
        title: saveTitle,
        code,
      };

      // Auto-tag "MathBox" category when creating a new model
      const isNew = !updateId;

      const url    = updateId ? `/api/models/${updateId}` : '/api/models';
      const method = updateId ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        title: saveTitle,
        description: saveDesc,
        jsonData,
        isPublic: pub,
      };
      if (thumbDataUrl) body.thumbnailSvg = thumbDataUrl;
      if (isNew) {
        body.categories = ['MathBox'];
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setEditingId(json.model?.id ?? updateId ?? editingId);
      setTitle(saveTitle);
      setDescription(saveDesc);
      setIsPublic(pub);
      if (json.model?.description != null) setDescription(json.model.description);
      if (json.model?.isPublic     != null) setIsPublic(json.model.isPublic);
      setIsDirty(false);
      setShowSaveDialog(false);
      showSaveSuccess(t('mathbox.saved'));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('mathbox.unknown_error'));
    } finally {
      setIsSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, t]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-900">
      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-950 text-white text-sm shrink-0 border-b border-gray-800 select-none">
        {/* Logo / back */}
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 font-bold tracking-tight text-cyan-300 hover:text-cyan-200 transition-colors mr-1"
        >
          <img src="/logo.svg" alt="HeyGeo" className="w-5 h-5 flex-shrink-0" />
          HeyGeo
        </a>

        <span className="text-gray-600">·</span>
        <span className="text-cyan-400 text-xs font-semibold">MathBox</span>
        <span className="text-gray-600">·</span>

        {/* Editable title */}
        <input
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setIsDirty(true); }}
          className="bg-transparent text-white font-medium outline-none border-b border-transparent hover:border-gray-600 focus:border-cyan-400 transition-colors px-1 min-w-0 w-48"
          maxLength={120}
        />

        {isDirty && <span className="text-gray-500 text-xs">●</span>}

        <div className="flex-1" />

        <span className="text-gray-600 text-xs hidden sm:inline">{t('mathbox.run_hint')}</span>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
        >
          {t('mathbox.save')}
        </button>

        {/* Dashboard link */}
        <a
          href="/dashboard"
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs transition-colors"
        >
          ← Dashboard
        </a>
      </div>

      {/* ── MathBox panel ── */}
      <MathboxModePanel
        ref={mathboxPanelRef}
        visible={true}
        onBack={() => { window.location.href = '/dashboard'; }}
        initialCode={initialCode}
        hideBackButton
        onCodeChange={() => setIsDirty(true)}
      />

      {/* ── Save dialog ── */}
      {showSaveDialog && (
        <SaveModelDialog
          initialTitle={title}
          initialDesc={description}
          initialPublic={isPublic}
          isSaving={isSaving}
          onSave={(t, d, pub) => doSave(t, d, pub)}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {saveError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-5 py-2 rounded-lg shadow-lg z-50">
          {t('mathbox.error_prefix')}: {saveError}
          <button className="ml-3 underline" onClick={() => setSaveError('')}>{t('mathbox.close')}</button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-700 text-white text-sm px-5 py-2.5 rounded-lg shadow-xl z-50">
          <span>{saveSuccessMsg}</span>
        </div>
      )}
    </div>
  );
}
