'use client';

import { useEffect } from 'react';
import i18n from '@/lib/i18n';

const SUPPORTED = ['vi', 'en', 'fr', 'de', 'hi', 'th', 'zh-TW', 'ja', 'ms'];

/** Map browser language codes to our supported codes */
function mapBrowserLang(raw: string): string {
  const lang = raw.split('-')[0].toLowerCase();
  const full = raw.toLowerCase();
  if (full === 'zh-tw' || full === 'zh-hk' || lang === 'zh') return 'zh-TW';
  return SUPPORTED.includes(lang) ? lang : '';
}

/**
 * Wraps the app so all client components can use useTranslation.
 * Language detection runs AFTER hydration (in useEffect) to prevent
 * React hydration mismatch errors (Error #418).
 */
export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Check persisted user preference
    const saved = localStorage.getItem('heygeo-lang');
    if (saved && SUPPORTED.includes(saved)) {
      if (saved !== i18n.language) i18n.changeLanguage(saved);
      return;
    }
    // 2. Fall back to browser language
    const mapped = mapBrowserLang(navigator.language);
    if (mapped && mapped !== i18n.language) {
      i18n.changeLanguage(mapped);
    }
  }, []);

  return <>{children}</>;
}
