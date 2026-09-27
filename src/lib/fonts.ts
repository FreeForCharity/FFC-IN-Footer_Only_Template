// Self-hosted fonts. Every family is loaded with next/font/local from the
// woff2 files committed under src/fonts/, so `next build` never contacts
// Google. The Google Fonts loader downloads from fonts.googleapis.com at build
// time and intermittently failed the build
// (FreeForCharity/FFC-IN-Footer_Only_Template#163). The drift guard
// (scripts/check-drift.mjs) and __tests__/lib/fonts.test.ts both fail if it
// comes back.
//
// The files are the latin-subset, normal-style woff2 builds from the
// @fontsource packages (v5.3.0), each shipped with its SIL Open Font License in
// src/fonts/<family>/LICENSE. Families with a variable build (Open Sans,
// Raleway, Faustina, Montserrat, Cinzel) load ONE `<family>-latin-wght-normal.woff2`
// from @fontsource-variable/<family> covering a weight range - the same single
// file per family the Google loader served. Lato, Cantata One and Fauna One have
// no variable build, so they load one `<family>-latin-<weight>-normal.woff2` per
// weight from @fontsource/<family>. Every file is preloaded, so loading the
// variable families one file per weight (25 files instead of 9) lowered the
// Lighthouse performance score.
//
// Export names and CSS variable names are unchanged from the Google version, so
// src/app/layout.tsx and src/app/globals.css need no edits.
//
// next/font/local requires literal options at module scope, which is why each
// family is spelled out rather than built by a helper.
import localFont from 'next/font/local'

export const openSans = localFont({
  src: [
    {
      path: '../fonts/open-sans/open-sans-latin-wght-normal.woff2',
      weight: '300 800',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-open-sans',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const lato = localFont({
  src: [
    { path: '../fonts/lato/lato-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/lato/lato-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-lato',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const raleway = localFont({
  src: [
    {
      path: '../fonts/raleway/raleway-latin-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-raleway',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const faustina = localFont({
  src: [
    {
      path: '../fonts/faustina/faustina-latin-wght-normal.woff2',
      weight: '300 800',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-faustina',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
})

export const cantataOne = localFont({
  src: [
    {
      path: '../fonts/cantata-one/cantata-one-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-cantata-one',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
})

export const faunaOne = localFont({
  src: [
    { path: '../fonts/fauna-one/fauna-one-latin-400-normal.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-fauna-one',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
})

export const montserrat = localFont({
  src: [
    {
      path: '../fonts/montserrat/montserrat-latin-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-montserrat',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const cinzel = localFont({
  src: [
    { path: '../fonts/cinzel/cinzel-latin-wght-normal.woff2', weight: '400 900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-cinzel',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
})
