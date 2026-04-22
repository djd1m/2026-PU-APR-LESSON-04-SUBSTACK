# [INS-005] Tailwind v4 requires @tailwindcss/postcss package for Next.js

**Date:** 2026-04-22
**Status:** Active
**Severity:** Medium
**Tags:** `tailwind`, `postcss`, `nextjs`, `frontend`, `build`
**Hits:** 1

## Error Signatures
```
Cannot find module '@tailwindcss/postcss'
The PostCSS plugin has moved to a separate package
It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin
```

## Symptoms
Next.js dev server starts but pages return 500. Error in terminal: "Cannot find module '@tailwindcss/postcss'" or "The PostCSS plugin has moved to a separate package".

## Diagnostic Steps
1. First tried `tailwindcss: {}` in postcss.config — error says plugin moved
2. Then tried `@tailwindcss/postcss: {}` — error says module not found
3. Realized: Tailwind v4 split the PostCSS plugin into a separate package

## Root Cause
Tailwind CSS v4 (installed as `tailwindcss@4`) moved the PostCSS plugin to `@tailwindcss/postcss`. The old `tailwindcss` entry in postcss.config.mjs no longer works.

## Solution
1. Install: `npm install @tailwindcss/postcss`
2. Use in `postcss.config.mjs`:
```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

## Prevention
- When using Tailwind v4, always install `@tailwindcss/postcss` alongside `tailwindcss`
- Check Tailwind version before writing postcss.config — v3 and v4 have different configs
- Tailwind v3: `tailwindcss: {}` | Tailwind v4: `'@tailwindcss/postcss': {}`
