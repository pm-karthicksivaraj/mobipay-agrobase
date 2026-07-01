/**
 * Agrobase V3 — Lightweight i18n Translation Dictionary
 * MobiPay AgroSys Limited
 *
 * A simple, synchronous, client-friendly translation map for the most common
 * UI strings. Uses a flat dotted-key lookup (`dashboard.title`,
 * `farmers.add`, etc.) so callers can request any locale without async I/O.
 *
 * Languages covered: English (en), Swahili (sw), Luganda (lg), French (fr).
 *
 * Fallback chain (handled by `t()` in `./index.ts`, not here):
 *   1. Requested language
 *   2. English (`en`)
 *   3. The key itself
 *
 * NOTE: For tenant-customisable, server-side, or namespace-backed translations
 * use `@/lib/i18n/engine` (DB-backed `I18nEngine`) instead. This file is the
 * lightweight client-side companion — keep it small and hand-curated.
 */

export type Language = 'en' | 'sw' | 'lg' | 'fr'

export type TranslationDictionary = Record<Language, Record<string, string>>

/**
 * Master translation dictionary. Add new keys here in all four languages.
 * Keep keys namespaced with dots (`module.string`) for readability.
 */
export const TRANSLATIONS: TranslationDictionary = {
  en: {
    'dashboard.title': 'Dashboard',
    'farmers.title': 'Farmer Registry',
    'farmers.add': 'Add Farmer',
    'farmers.search': 'Search by name, phone, or code...',
    'vsla.title': 'VSLA Management',
    'training.title': 'Training & Groups',
    'carbon.title': 'Carbon & Compliance',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search...',
    'common.loading': 'Loading...',
    'common.noData': 'No data found',
  },
  sw: {
    'dashboard.title': 'Dashibodi',
    'farmers.title': 'Usajili wa Wakulima',
    'farmers.add': 'Ongeza Mkulima',
    'farmers.search': 'Tafuta kwa jina, simu, au nambari...',
    'vsla.title': 'Usimamizi wa VSLA',
    'training.title': 'Mafunzo na Makundi',
    'carbon.title': 'Kaboni na Uzingatiaji',
    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
    'common.delete': 'Futa',
    'common.edit': 'Hariri',
    'common.search': 'Tafuta...',
    'common.loading': 'Inapakia...',
    'common.noData': 'Hakuna data iliyopatikana',
  },
  lg: {
    'dashboard.title': 'Dashibodi',
    'farmers.title': 'Oluwandiika lwa Balimi',
    'farmers.add': 'Gatta Omulimi',
    'farmers.search': 'Noonya erinnya, ennamba, oba koodi...',
    'vsla.title': 'Ekitundu kya VSLA',
    'training.title': "Amasomo n'Ebibiina",
    'carbon.title': "Kaboni n'Okugobeleza",
    'common.save': 'Tereka',
    'common.cancel': 'Sazaamu',
    'common.delete': 'Gyawo',
    'common.edit': 'Kyusa',
    'common.search': 'Noonya...',
    'common.loading': 'Kutikka...',
    'common.noData': 'Tewali bipakidwa',
  },
  fr: {
    'dashboard.title': 'Tableau de bord',
    'farmers.title': 'Registre des Agriculteurs',
    'farmers.add': 'Ajouter un Agriculteur',
    'farmers.search': 'Rechercher par nom, téléphone ou code...',
    'vsla.title': 'Gestion VSLA',
    'training.title': 'Formations et Groupes',
    'carbon.title': 'Carbone et Conformité',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.search': 'Rechercher...',
    'common.loading': 'Chargement...',
    'common.noData': 'Aucune donnée trouvée',
  },
}

/**
 * List of all known translation keys (derived from the English dictionary,
 * which is the canonical/source-of-truth language).
 */
export const TRANSLATION_KEYS: string[] = Object.keys(TRANSLATIONS.en)

/**
 * Type guard: is the given value a supported language code?
 */
export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'sw' || value === 'lg' || value === 'fr'
}
