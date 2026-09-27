// Self-hosted fonts. Every family is loaded with next/font/local from the
// woff2 files committed under src/fonts/, so `next build` never contacts
// Google. The Google Fonts loader downloads from fonts.googleapis.com at build
// time and intermittently failed the build
// (FreeForCharity/FFC-IN-Footer_Only_Template#163). The drift guard
// (scripts/check-drift.mjs) and __tests__/lib/fonts.test.ts both fail if it
// comes back.
//
// The files are the latin-subset, normal-style woff2 builds from the
// @fontsource/<family> packages (v5.3.0), each shipped with its SIL Open Font
// License in src/fonts/<family>/LICENSE. To add a weight, copy the matching
// `<family>-latin-<weight>-normal.woff2` from that package and list it below.
//
// Export names and CSS variable names are unchanged from the Google version, so
// src/app/layout.tsx and src/app/globals.css need no edits.
//
// next/font/local requires literal options at module scope, which is why each
// family is spelled out rather than built by a helper.
import localFont from 'next/font/local'

export const openSans = localFont({
  src: [
    { path: '../fonts/open-sans/open-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/open-sans/open-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/open-sans/open-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/open-sans/open-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/open-sans/open-sans-latin-800-normal.woff2', weight: '800', style: 'normal' },
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
    { path: '../fonts/raleway/raleway-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/raleway/raleway-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/raleway/raleway-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/raleway/raleway-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-raleway',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const faustina = localFont({
  src: [
    { path: '../fonts/faustina/faustina-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/faustina/faustina-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/faustina/faustina-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/faustina/faustina-latin-700-normal.woff2', weight: '700', style: 'normal' },
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
      path: '../fonts/montserrat/montserrat-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/montserrat/montserrat-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/montserrat/montserrat-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../fonts/montserrat/montserrat-latin-700-normal.woff2',
      weight: '700',
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
    { path: '../fonts/cinzel/cinzel-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/cinzel/cinzel-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/cinzel/cinzel-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/cinzel/cinzel-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-cinzel',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
})
