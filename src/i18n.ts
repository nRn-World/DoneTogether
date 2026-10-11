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

// WCAG 3.1.1 (Language of Page): keep <html lang> in sync with the language the
// UI actually renders, otherwise assistive tech keeps reading Swedish pronunciation
// after the user switches to English or Turkish.
const syncDocumentLanguage = (lng?: string) => {
  document.documentElement.lang = (lng || 'en').split('-')[0];
};

syncDocumentLanguage(i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
