'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  updateGoogleConsent,
  isConfigured,
  hasSaleShareOptOut,
  subscribeSaleShareOptOut,
} from '@/lib/consent-mode'
import { scriptString } from '@/lib/script-string'

// Environment variables for tracking IDs (replace with actual values)
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX'
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || 'XXXXXXXXXXXXXXX'
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'XXXXXXXXXX'

// Define type for GTM dataLayer events
interface DataLayerEvent {
  event: string
  [key: string]: string | number | boolean | undefined
}

/**
 * A dataLayer write that deliberately carries NO `event` key.
 *
 * GTM merges dataLayer keys, so a push without `event` updates the variables
 * a container reads without firing any trigger. That is what the sale/share
 * opt-out needs: it has to correct the published `marketing_consent` mid-page
 * without re-firing `consent_update`, which would re-trigger every tag keyed
 * on that event and send a duplicate pageview from any whose conditions still
 * hold.
 *
 * `event?: never` rather than `event?: string`: this is not "an event where
 * the name is optional", it is the other kind of write, and keeping them
 * distinct is what stops a push that MEANT to name an event from compiling
 * silently without one.
 */
interface DataLayerValues {
  event?: never
  [key: string]: string | number | boolean | undefined
}

// Extend Window interface to include dataLayer and openCookiePreferences
declare global {
  interface Window {
    dataLayer: (DataLayerEvent | DataLayerValues)[]
    openCookiePreferences?: () => void
  }
}

// The scriptString helper used to be DEFINED here, and a second copy lived
// in the GTM loader. One implementation now lives in src/lib/script-string.ts;
// this module re-exports it so existing importers and its own test keep
// working. Re-exported via import + export rather than
// `export { x } from ...`, because that form creates no local binding and
// this file calls scriptString itself further down.
export { scriptString }

interface CookiePreferences {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be changed
    functional: true, // Always true, cannot be changed - includes Zeffy donation forms
    analytics: false,
    marketing: false,
  })
  const [savedPreferencesBackup, setSavedPreferencesBackup] =
    useState<CookiePreferences>(preferences)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Loads GA4 directly whenever a REAL measurement id is configured — on
  // every pageview, regardless of the analytics toggle. Google Consent Mode
  // (bootstrapped in the root layout) gates what the tag may STORE, not
  // whether it loads.
  //
  // What it stores depends on where the visitor is: inside the EEA/UK/CH the
  // region-scoped default denies, so the tag sends cookieless pings until
  // they accept; everywhere else the unscoped default grants, so it uses
  // cookies from the first pageview unless they decline. This comment used to
  // say "denied-by-default for every visitor worldwide ... there is no
  // granted-by-default branch any more", which is the model this branch
  // reversed. With the shipped placeholder id this stays inert; fleet sites
  // get GA4 delivered through GTM instead.
  const loadGoogleAnalytics = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      isConfigured(GA_MEASUREMENT_ID) &&
      !document.querySelector('script[src*="googletagmanager.com/gtag"]')
    ) {
      const gaScript = document.createElement('script')
      gaScript.async = true
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
      document.head.appendChild(gaScript)

      const gaConfigScript = document.createElement('script')
      const secureFlag =
        typeof window !== 'undefined' && window.location.protocol === 'https:' ? ';Secure' : ''
      gaConfigScript.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', ${scriptString(GA_MEASUREMENT_ID)}, {
          'anonymize_ip': true,
          'cookie_flags': 'SameSite=Lax${secureFlag}'
        });
      `
      document.head.appendChild(gaConfigScript)
    }
  }, [])

  const loadMetaPixel = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      isConfigured(META_PIXEL_ID) &&
      !document.querySelector('script[src*="fbevents.js"]')
    ) {
      const fbScript = document.createElement('script')
      fbScript.textContent = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', ${scriptString(META_PIXEL_ID)});
        fbq('track', 'PageView');
      `
      document.head.appendChild(fbScript)

      const fbNoScript = document.createElement('noscript')
      const img = document.createElement('img')
      img.height = 1
      img.width = 1
      img.style.display = 'none'
      img.src = `https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`
      fbNoScript.appendChild(img)
      document.body.appendChild(fbNoScript)
    }
  }, [])

  const loadMicrosoftClarity = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      isConfigured(CLARITY_PROJECT_ID) &&
      !document.querySelector('script[src*="clarity.ms"]')
    ) {
      const clarityScript = document.createElement('script')
      clarityScript.textContent = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", ${scriptString(CLARITY_PROJECT_ID)});
      `
      document.head.appendChild(clarityScript)
    }
  }, [])

  const expireCookies = useCallback((names: string[]) => {
    // A cookie can only be deleted by a request whose domain attribute
    // MATCHES the one it was set with. GA4 scopes `_ga` to the
    // registrable domain with a leading dot (e.g. `.example.org`) so it
    // is readable across subdomains — so on `www.example.org`, expiring
    // it with only `domain=www.example.org` silently does nothing and
    // the visitor keeps the identifier they just asked us to drop.
    //
    // Try every scope the cookie could plausibly hold: host-only, plus
    // every suffix of the hostname with at least two labels, with and
    // without a leading dot. On a subdomain-hosted deployment (e.g.
    // charity.pages.example.org) a tag may have scoped its cookie to any
    // ancestor domain, so walk the labels rather than guessing one apex.
    // Some suffixes will be public suffixes (e.g. co.uk) — attempting to
    // expire on those is a harmless no-op, because browsers reject
    // cookie writes with a public-suffix Domain attribute.
    const hostname = window.location.hostname
    const labels = hostname.split('.')
    const domains: string[] = []
    for (let i = 0; i < labels.length - 1; i++) {
      const suffix = labels.slice(i).join('.')
      domains.push(suffix, `.${suffix}`)
    }

    names.forEach((name) => {
      const expiry = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      // Host-only (no domain attribute).
      document.cookie = expiry
      domains.forEach((domain) => {
        document.cookie = `${expiry} domain=${domain};`
      })
    })
  }, [])

  // Every advertising cookie this site can be left holding, expired in one
  // place.
  //
  // Three call sites need this list -- the category deletion below, the
  // restore path when there is no banner record, and the window event that
  // carries an opt-out to tags that do not speak Consent Mode -- and each
  // used to carry its own `['_fbp', 'fr']`. Copilot found the consequence:
  // every copy was Meta's only, so an opt-out left Google's identifiers in
  // place while the policy said advertising cookies had been deleted.
  //
  // GOOGLE'S ARE SWEPT BY PREFIX, not enumerated. Which of `_gcl_aw`,
  // `_gcl_dc` and `_gcl_gb` exists depends on the click parameter that brought
  // the visitor, and `_gac_<property-id>` depends on the property configured,
  // so a hardcoded list goes stale without anything failing -- the same reason
  // the `_ga_*` sweep further down exists. The cookie policy names the same
  // families in prose.
  const expireAdvertisingCookies = useCallback(() => {
    // Meta's two only. `_gcl_au` was named here as well, and a mutation
    // removing it was detected by nothing: the `_gcl_` prefix sweep below
    // already catches that name, so the entry was redundant rather than
    // untested. Removed instead of given a test that would assert the sweep
    // twice. Meta's two stay named because neither prefix matches them.
    const names = ['_fbp', 'fr']

    if (typeof document !== 'undefined') {
      const regex = /(?:^|;\s*)((?:_gcl_|_gac_)[^=;\s]*)/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(document.cookie)) !== null) {
        names.push(match[1])
      }
    }

    expireCookies(names)
  }, [expireCookies])

  // Expires the cookies of each category NOT granted in `prefs`. Analytics
  // covers GA4 + Microsoft Clarity; marketing covers the Meta Pixel. Called
  // with no argument it drops both.
  //
  // Scoped by category because a visitor who keeps analytics but drops
  // marketing must not have their `_ga` client id wiped along with the
  // Pixel's.
  const deleteTrackingCookies = useCallback(
    (prefs?: CookiePreferences) => {
      const deleteAnalytics = !prefs || !prefs.analytics
      // A sale/share opt-out (footer control, GPC, or a child-directed site)
      // forces the marketing cookies out regardless of the banner's marketing
      // toggle: it is a statutory right, and it outranks an earlier accept.
      const deleteMarketing = !prefs || !prefs.marketing || hasSaleShareOptOut()

      if (deleteAnalytics) expireCookies(['_ga', '_gid', '_clck', '_clsk'])
      if (deleteMarketing) expireAdvertisingCookies()

      // Dynamically delete all cookies matching _ga_* (e.g., _ga_G-XXXXXXXXXX)
      if (deleteAnalytics && typeof document !== 'undefined') {
        const regex = /(?:^|;\s*)(_ga_[^=;\s]*)/g
        const cookieStr = document.cookie
        const found: string[] = []
        let match: RegExpExecArray | null
        while ((match = regex.exec(cookieStr)) !== null) {
          found.push(match[1])
        }
        expireCookies(found)
      }
    },
    [expireCookies, expireAdvertisingCookies]
  )

  const applyConsent = useCallback(
    (prefs: CookiePreferences) => {
      // Set a cookie to indicate consent status with Secure flag (only on HTTPS)
      const cookieValue = JSON.stringify(prefs)
      const secureFlag =
        typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `cookie-consent=${encodeURIComponent(cookieValue)}; path=/; max-age=31536000; SameSite=Lax${secureFlag}`

      // Delete each non-granted category's cookies on EVERY apply — not only
      // on withdrawal of a stored grant. Storage IS granted outside the
      // EEA/UK/CH before any choice is made, so cookies can already exist the
      // first time a visitor declines; and a restore from storage carries no
      // previous state, while cookies set under an earlier grant outlive the
      // choice that allowed them. Keying on the resulting preferences covers
      // both.
      //
      // `adsDenied` is in the condition, not only inside
      // deleteTrackingCookies, and that matters: an opted-out visitor whose
      // stored choice is accept-everything has both categories granted, so
      // without it this branch never runs and the Pixel keeps its cookies.
      // The clause was first added inside the helper alone, where it was
      // unreachable for exactly that visitor — a mutation run found it inert.
      // The opt-out, read once for the value this apply publishes.
      //
      // It is NOT the only read: deleteTrackingCookies and the Meta loader
      // below call hasSaleShareOptOut() themselves, and an earlier version of
      // this comment claimed otherwise -- it said "ONE read for the whole
      // apply" when there were four. What makes those reads safe is that the
      // helper LATCHES an observed opt-out for the session, so a later read
      // can never be less restrictive than this one; threading a snapshot
      // through every call site would have had to be remembered at each new
      // one. Reported by Copilot, who read the claim against the code.
      const adsDenied = hasSaleShareOptOut()

      if (!prefs.analytics || !prefs.marketing || adsDenied) {
        deleteTrackingCookies(prefs)
      }

      // Push the Google Consent Mode `update`. Under the REGIONAL defaults
      // what this call does depends on the visitor: for an EEA/UK/CH visitor
      // it is the only thing that ever lifts the scoped denial, and for
      // everyone else it mostly re-affirms the granted default and only
      // matters when they actively DECLINE, at which point it pins storage
      // denied with cookieless pings only.
      //
      // This comment has been wrong in both directions — it claimed the
      // denial applied only to EEA/UK/CH under a global model, then that
      // "there is no permissive default left for anyone" under a regional
      // one. There is: the unscoped default.
      //
      // Queued BEFORE the custom `consent_update` event pushed below: both
      // writes land in the same dataLayer queue and GTM processes it in order,
      // so a container trigger keyed on that event would otherwise evaluate
      // consent state before this choice had been applied. The ordering case
      // in this repo's test suite fails if the two are swapped.
      updateGoogleConsent(prefs, { adsDenied })

      // Push consent update to GTM dataLayer
      if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || []
        window.dataLayer.push({
          event: 'consent_update',
          functional_consent: prefs.functional ? 'granted' : 'denied',
          analytics_consent: prefs.analytics ? 'granted' : 'denied',
          // The EFFECTIVE state, not the raw preference. A sale/share opt-out
          // -- footer control, GPC, or a child-directed site -- denies
          // advertising regardless of what the banner's marketing toggle says,
          // and this event is documented for container tags to key on. Until
          // this read `prefs.marketing`, an opted-out visitor who had earlier
          // accepted marketing had 'granted' republished on every pageview,
          // and any GTM tag trusting it fired: the opt-out was honoured for
          // Google tags via Consent Mode and discarded for everything else.
          //
          // `analytics_consent` is deliberately NOT gated the same way. The
          // opt-out is of sale/sharing for advertising; first-party analytics
          // is a separate choice the visitor still holds, and denying it here
          // would withdraw consent they never withdrew.
          marketing_consent: prefs.marketing && !adsDenied ? 'granted' : 'denied',
        })
      }

      // Google tags load on every pageview; Consent Mode gates their
      // storage (see src/lib/consent-mode.ts). This call is a no-op when
      // the GA4 id is still the shipped placeholder.
      loadGoogleAnalytics()

      // NON-Google tags do not speak Consent Mode, so they stay strictly
      // opt-in everywhere: Clarity only on an explicit analytics grant,
      // Meta Pixel only on an explicit marketing grant.
      if (prefs.analytics) {
        loadMicrosoftClarity()
      }
      // The Pixel does NOT speak Consent Mode, so denying ad_storage does
      // nothing to it. It has to be gated here, by hand, or the footer
      // control would claim advertising sharing is off while Meta kept
      // receiving PageView data on every later page. This is also what makes
      // the child-directed guarantee true for non-Google tags:
      // hasSaleShareOptOut() returns true whenever that knob is set.
      if (prefs.marketing && !hasSaleShareOptOut()) {
        loadMetaPixel()
      }
    },
    [deleteTrackingCookies, loadGoogleAnalytics, loadMetaPixel, loadMicrosoftClarity]
  )

  // Helper to load preferences from localStorage and update state
  const loadPreferencesFromLocalStorage = useCallback(
    (showBannerIfMissing = true) => {
      // A sale/share opt-out is a statutory right and does not depend on a
      // banner record existing. Before this, a visitor sending GPC whose
      // stored choice had been cleared -- or whose storage could not be read
      // -- had Google's advertising signals denied by the bootstrap and kept
      // the Meta Pixel's `_fbp`/`fr` cookies, because every missing-choice
      // branch below returns without running any cleanup. The policy says an
      // opt-out deletes those cookies, so it has to.
      //
      // At the top rather than in the branches: there are several ways to
      // reach "no usable preferences" (no record, unparseable JSON, failed
      // validation, storage throwing) and a fix placed in one of them is a
      // fix the next one will not have. Expiring a cookie is idempotent, so
      // doing it on the stored-choice path as well costs nothing.
      //
      // ANALYTICS COOKIES ARE NOT TOUCHED. This is an opt-out of sale and
      // sharing for advertising, not a withdrawal of analytics consent.
      if (hasSaleShareOptOut()) {
        expireAdvertisingCookies()

        // And publish the denial for container tags, from the first pageview.
        //
        // Before this, a visitor with no stored banner choice -- including
        // every first visit to a child-directed site -- had nothing on the
        // dataLayer for a GTM tag to key on until they touched the banner, so
        // the only thing carrying the denial was Consent Mode, which a
        // container tag need not speak. Reported by Copilot.
        //
        // No `event` key, as with the mid-page correction: GTM merges
        // dataLayer keys, so the variable becomes available without firing a
        // trigger on a page where no consent decision has been made.
        if (typeof window !== 'undefined') {
          window.dataLayer = window.dataLayer || []
          window.dataLayer.push({ marketing_consent: 'denied' })
        }
      }

      // No (valid) stored choice: show the banner, and still load the
      // Google tags — they run under the denied-by-default Consent Mode
      // state, which is cookieless everywhere, for everyone. Loading them
      // is not the same as measuring with cookies: the tags send cookieless
      // pings, so an undecided visit is counted in aggregate and stores
      // nothing on the device.
      //
      // ORDERING MATTERS on the stored-choice path below: applyConsent
      // pushes the Consent Mode `update` BEFORE loadGoogleAnalytics queues
      // GA's `config`, so a returning visitor's stored choice is in the
      // dataLayer ahead of the first hit.
      //
      // Under the REGIONAL defaults, which choice is at risk depends on where
      // the visitor is, and both cases now exist at once. Outside the
      // EEA/UK/CH the unscoped default GRANTS analytics, so a stored DENIAL
      // must land first or the opening hit goes out with cookies for someone
      // who said no — a privacy failure. Inside those regions the default
      // DENIES, so a stored GRANT must land first or that hit goes out
      // cookieless — a measurement loss. This comment has described each of
      // those as "the" risk in turn, under a global-grant and then a
      // global-deny model; naming only one was what made it wrong both times.
      // Either way the fix is the same order. Only the undecided branches may
      // load GA without a preceding update — there is no stored choice to
      // apply. Never load GA before this restore has run.
      const handleMissingChoice = () => {
        if (showBannerIfMissing) setShowBanner(true)
        loadGoogleAnalytics()
      }

      try {
        const consent = localStorage.getItem('cookie-consent')
        if (!consent) {
          handleMissingChoice()
          return
        }
        let savedPreferences: CookiePreferences
        try {
          savedPreferences = JSON.parse(consent)
        } catch {
          handleMissingChoice()
          return
        }

        // Validate the structure (functional is optional for backward compatibility)
        if (
          typeof savedPreferences === 'object' &&
          savedPreferences !== null &&
          typeof savedPreferences.necessary === 'boolean' &&
          typeof savedPreferences.analytics === 'boolean' &&
          typeof savedPreferences.marketing === 'boolean'
        ) {
          // Ensure functional is always true (for backward compatibility with old saved preferences)
          // Create a new object to avoid mutation
          const updatedPreferences: CookiePreferences = {
            ...savedPreferences,
            functional: true,
          }
          setPreferences(updatedPreferences)
          setSavedPreferencesBackup(updatedPreferences)
          applyConsent(updatedPreferences)
        } else {
          // Invalid data, show banner again
          handleMissingChoice()
        }
      } catch {
        // If localStorage is unavailable or data is corrupted, show banner
        handleMissingChoice()
      }
    },
    [applyConsent, expireAdvertisingCookies, loadGoogleAnalytics]
  )

  const handleCancelPreferences = useCallback(() => {
    // Restore the backed-up preferences
    setPreferences(savedPreferencesBackup)
    setShowPreferences(false)
  }, [savedPreferencesBackup])

  // Initialize state from localStorage on mount - this is the correct pattern for hydration
  useEffect(() => {
    // Expose method to window for reopening preferences from other components
    window.openCookiePreferences = () => {
      setShowBanner(true)
      setShowPreferences(true)
      loadPreferencesFromLocalStorage(false)
    }

    // Check if user has already made a choice with error handling. This
    // single ordered path also loads the Google tags on every pageview:
    // stored choice → consent update first, then GA; no stored choice →
    // banner + GA under whichever regional default applies. Do NOT load GA
    // before this runs. Which stored choice is at risk depends on the
    // visitor's region — a denial outside the EEA/UK/CH, a grant inside it —
    // and the full reasoning is on the restore path above rather than
    // duplicated here, because keeping two copies in sync is what let this
    // comment go stale twice. BOTH consent defaults carry wait_for_update,
    // but that is a brief hold window (500ms), not an ordering guarantee:
    // this restore-before-load order is what guarantees it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPreferencesFromLocalStorage(true)

    // The footer's "Do Not Sell or Share" control reaches the non-Google tags
    // through this event. Consent Mode governs Google only, so without it the
    // control would deny ad_storage while the Meta Pixel carried on with the
    // cookies it had already set.
    //
    // What this does NOT claim: a Pixel already executing in this page cannot
    // be unloaded. Expiring its cookies and refusing to load it again is the
    // most a client-side control can honestly do, and the policy text says so
    // rather than promising more.
    const onSaleShareOptOut = () => {
      expireAdvertisingCookies()

      // applyConsent published the pre-opt-out `marketing_consent`, and for an
      // opt-out that happens DURING this page nothing republishes it: a GTM
      // container reading that variable would go on seeing 'granted' until the
      // next navigation re-ran applyConsent.
      //
      // Pushed with NO `event` key on purpose. GTM merges dataLayer keys, so
      // this corrects the variable without firing a second `consent_update`.
      // Re-firing it would re-trigger every tag keyed on that event, and any
      // whose conditions still hold -- an analytics tag, for a visitor who
      // consented to analytics -- would send a duplicate pageview. Fixing a
      // privacy defect must not buy a measurement one.
      if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || []
        window.dataLayer.push({ marketing_consent: 'denied' })
      }
    }
    const unsubscribe = subscribeSaleShareOptOut(onSaleShareOptOut)

    // Cleanup function to remove the window method
    return () => {
      delete window.openCookiePreferences
      unsubscribe()
    }
  }, [loadPreferencesFromLocalStorage, expireAdvertisingCookies])

  // Focus management for modal
  useEffect(() => {
    if (showPreferences && modalRef.current) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus the first focusable element in the modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length > 0) {
        ;(focusableElements[0] as HTMLElement).focus()
      }

      // Handle Escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCancelPreferences()
        }
      }
      document.addEventListener('keydown', handleEscape)

      return () => {
        document.removeEventListener('keydown', handleEscape)
        // Restore focus when modal closes
        if (previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }
  }, [showPreferences, handleCancelPreferences])

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    }
    setPreferences(allAccepted)
    try {
      localStorage.setItem('cookie-consent', JSON.stringify(allAccepted))
    } catch (e) {
      // If localStorage is unavailable, continue anyway
      console.warn('Unable to save preferences to localStorage:', e)
    }
    applyConsent(allAccepted)
    setSavedPreferencesBackup(allAccepted)
    setShowBanner(false)
  }

  const handleDeclineAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      functional: true, // Functional cookies (Zeffy) are always enabled for donations
      analytics: false,
      marketing: false,
    }
    setPreferences(onlyNecessary)
    try {
      localStorage.setItem('cookie-consent', JSON.stringify(onlyNecessary))
    } catch (e) {
      // If localStorage is unavailable, continue anyway
      console.warn('Unable to save preferences to localStorage:', e)
    }

    applyConsent(onlyNecessary)
    setSavedPreferencesBackup(onlyNecessary)
    setShowBanner(false)
  }

  const handleSavePreferences = () => {
    try {
      localStorage.setItem('cookie-consent', JSON.stringify(preferences))
    } catch (e) {
      // If localStorage is unavailable, continue anyway
      console.warn('Unable to save preferences to localStorage:', e)
    }
    applyConsent(preferences)
    setSavedPreferencesBackup(preferences)
    setShowBanner(false)
    setShowPreferences(false)
  }

  const handleShowPreferences = () => {
    // Backup current preferences in case user cancels
    setSavedPreferencesBackup(preferences)
    setShowPreferences(true)
  }

  if (!showBanner) {
    return null
  }

  if (showPreferences) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-preferences-title"
        onClick={(e) => {
          // Only close if clicking the overlay itself, not the modal content
          if (e.target === e.currentTarget) {
            handleCancelPreferences()
          }
        }}
      >
        <div
          ref={modalRef}
          className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <h2 id="cookie-preferences-title" className="text-2xl font-bold text-gray-900 mb-4">
              Cookie Preferences
            </h2>
            <p className="text-gray-600 mb-6">
              We use cookies to enhance your browsing experience and analyze our traffic. You can
              choose which types of cookies you allow.
            </p>

            {/* Necessary Cookies */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Necessary Cookies</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.necessary}
                    disabled
                    className="w-5 h-5 text-blue-600 bg-gray-300 rounded cursor-not-allowed"
                  />
                  <span className="ml-2 text-sm text-gray-500">Always Active</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                These cookies are essential for the website to function properly. They enable basic
                features like page navigation and access to secure areas. The website cannot
                function properly without these cookies.
              </p>
            </div>

            {/* Functional Cookies */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Functional Cookies</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    disabled
                    className="w-5 h-5 text-blue-600 bg-gray-300 rounded cursor-not-allowed"
                  />
                  <span className="ml-2 text-sm text-gray-500">Always Active</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                These cookies enable enhanced functionality and features that are essential for our
                core services. This includes our donation processing and application form systems
                which require cookies to function properly.
              </p>
              <p className="text-xs text-gray-500">
                Services: Zeffy (Donation Processing), Microsoft Forms (Application Forms - may
                include HubSpot analytics)
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Analytics Cookies</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences({ ...preferences, analytics: e.target.checked })
                    }
                    className="sr-only peer"
                    aria-label="Enable analytics cookies"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                These cookies help us understand how visitors interact with our website by
                collecting and reporting information anonymously. We use Google Analytics and
                Microsoft Clarity.
              </p>
              <p className="text-xs text-gray-500">Services: Google Analytics, Microsoft Clarity</p>
            </div>

            {/* Marketing Cookies */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Marketing Cookies</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences({ ...preferences, marketing: e.target.checked })
                    }
                    className="sr-only peer"
                    aria-label="Enable marketing cookies"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                These cookies are used to track visitors across websites. The intention is to
                display ads that are relevant and engaging for the individual user.
              </p>
              <p className="text-xs text-gray-500">Services: Meta Pixel (Facebook)</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={handleCancelPreferences}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl"
      role="region"
      aria-label="Cookie consent notice"
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">We Value Your Privacy</h3>
            <p className="text-sm text-gray-600 mb-3">
              We use cookies to improve your experience on our site, analyze traffic, and enable
              certain features. By clicking &quot;Accept All&quot;, you consent to our use of
              cookies for analytics and marketing purposes. You can manage your preferences or
              decline non-essential cookies.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Link href="/privacy-policy" className="text-blue-600 underline">
                Privacy Policy
              </Link>
              <Link href="/cookie-policy" className="text-blue-600 underline">
                Cookie Policy
              </Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={handleDeclineAll}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm whitespace-nowrap"
            >
              Decline All
            </button>
            <button
              onClick={handleShowPreferences}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm whitespace-nowrap"
            >
              Customize
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
