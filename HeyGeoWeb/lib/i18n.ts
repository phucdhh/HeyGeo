import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import vi from '@/app/locales/vi.json';
import en from '@/app/locales/en.json';
import fr from '@/app/locales/fr.json';
import de from '@/app/locales/de.json';
import hi from '@/app/locales/hi.json';
import th from '@/app/locales/th.json';
import zhTW from '@/app/locales/zh-TW.json';
import ja from '@/app/locales/ja.json';
import ms from '@/app/locales/ms.json';

// Always init with 'vi' so server-render and client initial hydration match.
// Language detection from localStorage/navigator happens in I18nProvider via useEffect,
// AFTER hydration is complete, to avoid React hydration mismatch (Error #418).
//
// initImmediate: false → maps to initAsync:false in i18next v25, ensures SYNCHRONOUS
// initialization. Without this, i18next v25 defers completion via setTimeout, so
// useTranslation() sees isInitialized=false during client hydration, throws a Suspense
// Promise and aborts the hydration subtree → React error #418.
i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi:    { translation: vi },
      en:    { translation: en },
      fr:    { translation: fr },
      de:    { translation: de },
      hi:    { translation: hi },
      th:    { translation: th },
      'zh-TW': { translation: zhTW },
      ja:    { translation: ja },
      ms:    { translation: ms },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    defaultNS: 'translation',
    supportedLngs: ['vi', 'en', 'fr', 'de', 'hi', 'th', 'zh-TW', 'ja', 'ms'],
    interpolation: { escapeValue: false },
    initImmediate: false,
  });

export default i18n;
