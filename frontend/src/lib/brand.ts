/**
 * The product name in one place. To rename the product set VITE_APP_NAME (and
 * the other values below) in frontend/.env; see docs/RENAME.md for the rest
 * (index.html, manifest, native app ids, backend APP_NAME, e-mails).
 */
export const BRAND = (import.meta.env.VITE_APP_NAME as string | undefined) || 'DilGO'
/** The lowercase wordmark split into its two coloured halves (logo, footer). */
export const WORDMARK: [string, string] = [
  (import.meta.env.VITE_WORDMARK_A as string | undefined) || 'dil',
  (import.meta.env.VITE_WORDMARK_B as string | undefined) || 'go',
]
export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'destek@dilgo.app'
