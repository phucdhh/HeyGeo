'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

const LANGUAGES = [
  { code: 'vi',    flag: '🇻🇳' },
  { code: 'en',    flag: '🇬🇧' },
  { code: 'fr',    flag: '🇫🇷' },
  { code: 'de',    flag: '🇩🇪' },
  { code: 'hi',    flag: '🇮🇳' },
  { code: 'th',    flag: '🇹🇭' },
  { code: 'zh-TW', flag: '🇹🇼' },
  { code: 'ja',    flag: '🇯🇵' },
  { code: 'ms',    flag: '🇲🇾' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('heygeo-lang', code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Select language"
        className="flex items-center gap-1.5 text-sm text-amber-200 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline font-medium">{t(`lang.${current.code}`)}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-80 overflow-y-auto">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                i18n.language === lang.code
                  ? 'text-brand-700 font-semibold bg-amber-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{t(`lang.${lang.code}`)}</span>
              {i18n.language === lang.code && (
                <svg className="ml-auto w-4 h-4 text-brand-600" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
