import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import sv from './locales/sv.json';
import tr from './locales/tr.json';

const resources = {
  en: { translation: en },
  sv: { translation: sv },
  tr: { translation: tr },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: true,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Always start with English if no language is set
if (!localStorage.getItem('i18nextLng')) {
  i18n.changeLanguage('en');
}

export default i18n;
