import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '../../../../packages/ui/locales/en.json'
import fr from '../../../../packages/ui/locales/fr.json'
import nl from '../../../../packages/ui/locales/nl.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      nl: { translation: nl },
    },
    lng:           'fr',          // default — Belgium is primarily French
    fallbackLng:   'en',
    // escapeValue: react-i18next escapes by default via JSX; no override needed
  })

export default i18n
