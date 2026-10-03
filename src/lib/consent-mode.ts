// Google Consent Mode v2 defaults.
//
// Policy: the most permissive configuration Google's own rules allow.
//
// Google's EU User Consent Policy binds this site as a Google Analytics /
// Ads customer, and it requires opt-IN consent before setting cookies or
// reading identifiers for visitors in the EEA, the UK and Switzerland.
// Nowhere else does a Google-imposed requirement exist, so storage defaults
// to GRANTED outside those regions and measurement is complete from the
// first pageview.
//
// THIS REVERSES AN EARLIER REVISION OF THIS BRANCH, which denied every
// measurement signal worldwide. These are US charities; treating every
// visitor as an EEA visitor discarded measurement no law asks them to give
// up. The reversal was a deliberate direction change, not a regression.
//
// Precisely, because the precision is the whole point of this block. The
// region-scoped default denies analytics_storage, ad_storage, ad_user_data,
// ad_personalization and personalization_storage. The unscoped default
// grants analytics_storage, and grants ad_storage and ad_user_data unless
// the visitor has opted out of sale/sharing; it leaves ad_personalization
// and personalization_storage denied unless AD_PERSONALIZATION is on.
// security_storage is granted in both. functionality_storage is granted by
// default — a site that cannot remember a consent choice cannot honour one —
// and thereafter follows the visitor's own functional toggle through
// updateGoogleConsent, so it is not something that "stays" granted.
//
// That summary has been wrong twice before, in opposite directions: once
// flat ("storage is DENIED"), which ignored the granted types, and once
// narrowed to "analytics and advertising", which dropped
// personalization_storage. Summarising a list is a claim about every item
// in it, so every item is named above.
//
// What this means at runtime. The Google tags LOAD on every visit; what
// changes by region is permission to use storage:
//
//   - Outside EEA/UK/CH → granted immediately. Full cookie-based
//                         measurement with no banner interaction needed.
//   - Inside EEA/UK/CH  → denied until the visitor accepts. GA4 still sends
//                         COOKIELESS pings, so pageviews are modeled in
//                         aggregate rather than lost, and no identifier is
//                         set or read. Accepting flips storage to granted
//                         via a `consent update`.
//
// Which default applies is resolved by Google from the visitor's IP address.
// That is documented Consent Mode behaviour for the `region` parameter, and
// the policy pages say so.
//
// Note what this is NOT: it is not "no requests to Google until consent",
// even inside the EEA. The tags load and ping cookielessly in the denied
// state. That is Google's documented denied-state behaviour and the reason
// Consent Mode preserves aggregate measurement at all. A site wanting zero
// contact with Google before consent has to not load the tag, which is a
// different design.
//
// ADVERTISING IS A SEPARATE AXIS FROM REGION. These sites advertise through
// Google Ad Grants, whose conversion tracking needs ad_storage and
// ad_user_data. Sharing that data with Google is a "sale" or "share" under
// the California, Colorado and Connecticut regimes, which require an opt-out
// AND require honouring universal opt-out signals. So the bootstrap reads
// Global Privacy Control and this site's own stored opt-out BEFORE the first
// `consent default`, and denies advertising for that visitor in every region.
//
// NON-Google scripts do not speak Consent Mode, so they do NOT get the
// permissive default: Microsoft Clarity loads only on an explicit analytics
// grant and the Meta Pixel only on an explicit marketing grant, everywhere
// in the world.
//
// `wait_for_update` holds tags briefly so a returning visitor's stored
// choice is applied before the first hit fires, instead of the hit going
// out under the default and the consent arriving a beat too late.

/**
 * localStorage key holding the visitor's "Do Not Sell or Share" choice.
 *
 * Read SYNCHRONOUSLY by the bootstrap, so a returning visitor who opted out
 * has advertising denied at `consent default` time — before any tag
 * evaluates consent — rather than a beat later via `consent update`.
 *
 * Deliberately SEPARATE from the cookie-banner preferences. This is a
 * statutory right under California, Colorado and Connecticut law, and it
 * must survive a visitor who otherwise accepts everything.
 */
export const SALE_SHARE_OPT_OUT_KEY = 'ffc-sale-share-opt-out'

/**
 * Window event dispatched when the visitor opts out of sale/sharing.
 *
 * Consent Mode only governs GOOGLE tags. The Meta Pixel does not speak it, so
 * denying `ad_storage` does nothing to a Pixel that is already running or to
 * the cookies it has already set — and the footer control would be claiming
 * "advertising sharing is off" while Meta kept receiving PageView data.
 *
 * This event is how the opt-out reaches the non-Google tags. The cookie-consent
 * component listens for it and expires the Pixel's cookies using the same
 * domain-candidate helper it uses everywhere else; duplicating that logic in
 * this module is exactly the divergence that the shared `scriptString` fix
 * existed to prevent.
 *
 * What it cannot do, stated plainly because the policy text depends on it: a
 * Pixel already executing in the current page cannot be unloaded. The opt-out
 * expires its cookies and stops it loading on any later page, which is the
 * most a client-side control can honestly offer.
 */
export const SALE_SHARE_OPT_OUT_EVENT = 'ffc:sale-share-opt-out'

/**
 * TRUE when this site is directed to children — a youth sports club, a
 * preschool, a children's programme. Denies every advertising signal for
 * every visitor, everywhere, regardless of region or consent. COPPA and
 * Google's own policies do not permit ad personalisation on child-directed
 * properties, and a child's "accept" is not a valid legal basis. Analytics
 * is unaffected. When in doubt set it TRUE: the cost is remarketing a
 * child-directed site cannot lawfully use anyway.
 *
 * Declared here rather than in a config module because this template has no
 * analytics config file; a site that needs it flips the constant.
 */
const CHILD_DIRECTED = false

/**
 * TRUE only when this site deliberately runs PERSONALISED advertising —
 * remarketing, audience targeting, Display. Google Ad Grants accounts
 * CANNOT do any of that (Grants are search-only), so a Grant-funded site
 * should leave this FALSE: it buys nothing, and ad_personalization is the
 * signal that most squarely enables cross-context behavioural advertising
 * under California, Colorado and Connecticut law. Ad Grants conversion
 * tracking does NOT need it — that runs on ad_storage and ad_user_data,
 * which stay granted outside the EEA/UK/CH.
 */
const AD_PERSONALIZATION = false && !CHILD_DIRECTED

/**
 * ISO 3166 region codes where Google's EU User Consent Policy applies:
 * the 27 EU member states + the 3 non-EU EEA states (IS, LI, NO), plus
 * the UK (GB) and Switzerland (CH).
 */
export const EU_CONSENT_REGIONS = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  // Non-EU EEA
  'IS',
  'LI',
  'NO',
  // UK + Switzerland
  'GB',
  'CH',
] as const

/**
 * Milliseconds tags wait for a `consent update` before firing with the
 * default state. 500ms is Google's documented starting point: long enough
 * for a synchronous localStorage read, short enough not to meaningfully
 * delay the first hit.
 */
export const CONSENT_WAIT_FOR_UPDATE_MS = 500

/**
 * The inline bootstrap that must execute BEFORE any Google tag loads.
 *
 * Emitted into <head> in the root layout, above <GoogleTagManager />. TWO
 * `consent default` calls, in Google's documented shape: the region-scoped
 * denial, then the unscoped default. Google resolves the most specific
 * matching region, so EEA/UK/CH visitors get denied-by-default and everyone
 * else gets the unscoped one. Their ORDER does not matter to Google —
 * specificity decides — but the region-scoped call is written first because
 * that is the one whose loss would be silent.
 *
 * The GPC / stored-opt-out read is wrapped in try/catch because an
 * unguarded `localStorage` read THROWS in some privacy modes, and a throw
 * here would abort the whole inline script — leaving NO consent defaults at
 * all, which fails open. The catch makes a storage failure cost the
 * opt-out's persistence, not the entire consent state.
 *
 * `ffcAdsDenied` can only ever TIGHTEN. It is applied to the unscoped
 * default alone; the region-scoped denial is already total, so mixing the
 * flag into it could only ever loosen something and is deliberately absent.
 *
 * `url_passthrough` keeps click ids (gclid/wbraid) flowing through
 * navigation when cookies are denied, and `ads_data_redaction` strips ad
 * identifiers from tag requests while `ad_storage` is denied — both are
 * no-ops once consent is granted, so they cost nothing outside the EEA.
 *
 * Declared as a function declaration so `gtag` lands on `window` and every
 * later caller shares one queue.
 */
export const CONSENT_MODE_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var ffcAdsDenied = ${CHILD_DIRECTED ? 'true' : 'false'};
try {
  if (navigator.globalPrivacyControl === true) ffcAdsDenied = true;
  if (localStorage.getItem(${JSON.stringify(SALE_SHARE_OPT_OUT_KEY)}) === 'true') ffcAdsDenied = true;
} catch (e) {}
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'analytics_storage': 'denied',
  'functionality_storage': 'granted',
  'personalization_storage': 'denied',
  'security_storage': 'granted',
  'wait_for_update': ${CONSENT_WAIT_FOR_UPDATE_MS},
  'region': ${JSON.stringify([...EU_CONSENT_REGIONS])}
});
gtag('consent', 'default', {
  'ad_storage': ffcAdsDenied ? 'denied' : 'granted',
  'ad_user_data': ffcAdsDenied ? 'denied' : 'granted',
  'ad_personalization': ${AD_PERSONALIZATION ? "ffcAdsDenied ? 'denied' : 'granted'" : "'denied'"},
  'analytics_storage': 'granted',
  'functionality_storage': 'granted',
  'personalization_storage': ${AD_PERSONALIZATION ? "ffcAdsDenied ? 'denied' : 'granted'" : "'denied'"},
  'security_storage': 'granted',
  'wait_for_update': ${CONSENT_WAIT_FOR_UPDATE_MS}
});
gtag('set', 'url_passthrough', true);
gtag('set', 'ads_data_redaction', true);
`.trim()

/** The consent categories the cookie banner exposes. */
export interface ConsentPreferences {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * True when a tracking id has been swapped for a real value.
 *
 * The template ships placeholder ids (`G-XXXXXXXXXX`, `XXXXXXXXXXXXXXX`,
 * `XXXXXXXXXX`) so that every integration is effectively inert until a
 * site sets its own id. Loaders must honor that promise: a falsy,
 * whitespace-only, or shipped-placeholder value means "not configured, do
 * not load".
 */
export function isConfigured(id: string | undefined | null): boolean {
  if (!id) return false
  const trimmed = id.trim()
  if (!trimmed) return false
  return !/^[A-Z0-9-]*X{6,}$/.test(trimmed)
}

/**
 * Push a Consent Mode `update` reflecting the visitor's actual choice.
 *
 * This runs on every banner interaction AND on page load when a stored
 * choice exists. For an EEA/UK/CH visitor it is what lifts the regional
 * default from denied to granted; for everyone else it mostly re-affirms
 * the granted default, and only matters when they actively DECLINE — at
 * which point storage flips to denied and GA4 falls back to cookieless
 * pings rather than disappearing entirely.
 *
 * A sale/share opt-out overrides the banner's marketing toggle here, the
 * same way it does in the bootstrap: accepting everything cannot switch
 * advertising back on for a visitor whose browser sends GPC.
 */
export function updateGoogleConsent(
  prefs: ConsentPreferences,
  opts?: { adsDenied?: boolean }
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return

  // `adsDenied` lets a caller that ALREADY KNOWS the opt-out state say so,
  // instead of this function re-deriving it from storage.
  //
  // That re-read was a real hole. `setSaleShareOptOut(true, prefs)` wrote the
  // flag, and if the write threw — a private window — delegated here, where
  // `hasSaleShareOptOut()` read storage, threw, and its catch reported false.
  // A `prefs.marketing === true` then GRANTED advertising, silently discarding
  // the opt-out argument that was the whole point of the call.
  //
  // This is the same defect that was already fixed in the no-prefs branch
  // below, surviving in the prefs branch: the invariant was stated in one
  // layer and violated in the next, which is why the suite went green over it.
  const optedOut = opts?.adsDenied ?? hasSaleShareOptOut()
  const analytics = prefs.analytics ? 'granted' : 'denied'
  const marketing = prefs.marketing && !optedOut ? 'granted' : 'denied'
  const personalization = marketing === 'granted' && AD_PERSONALIZATION ? 'granted' : 'denied'

  window.gtag('consent', 'update', {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: personalization,
    personalization_storage: personalization,
    functionality_storage: prefs.functional ? 'granted' : 'denied',
    security_storage: 'granted',
  })
}

/**
 * Whether this visitor has exercised a statutory opt-out of sale/sharing —
 * by sending a universal opt-out signal (GPC), by using this site's own
 * control, or because the site is child-directed and can never share.
 *
 * Safe on the server and in a private window where storage throws.
 */
export function hasSaleShareOptOut(): boolean {
  if (CHILD_DIRECTED) return true
  if (typeof window === 'undefined') return false
  try {
    const nav = window.navigator as Navigator & { globalPrivacyControl?: boolean }
    if (nav.globalPrivacyControl === true) return true
    return window.localStorage.getItem(SALE_SHARE_OPT_OUT_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Record (or clear) the visitor's "Do Not Sell or Share" choice and apply it
 * to the live tags immediately.
 *
 * Clearing removes only this site's stored flag. A browser sending GPC stays
 * opted out, because the site may not override a signal the law requires it
 * to honour — so `hasSaleShareOptOut()` can still report true after a call
 * with `false`. That is correct, not a bug, and the UI should reflect it
 * rather than showing the control as "off".
 */
export function setSaleShareOptOut(optOut: boolean, prefs?: ConsentPreferences): void {
  if (typeof window === 'undefined') return
  try {
    if (optOut) window.localStorage.setItem(SALE_SHARE_OPT_OUT_KEY, 'true')
    else window.localStorage.removeItem(SALE_SHARE_OPT_OUT_KEY)
  } catch {
    // A private window that refuses storage still gets the live update below;
    // the choice simply will not survive the session.
  }
  // Tell the non-Google tags, which cannot hear a Consent Mode update.
  if (optOut) {
    try {
      window.dispatchEvent(new Event(SALE_SHARE_OPT_OUT_EVENT))
    } catch {
      // An environment without Event/dispatchEvent still gets the Google-side
      // denial below; losing the notification must not lose the opt-out.
    }
  }

  if (prefs) {
    // Pass the opt-out through explicitly rather than letting
    // updateGoogleConsent re-read storage. A caller that opted out while
    // storage was unavailable would otherwise have its argument discarded and
    // advertising granted from prefs.marketing.
    updateGoogleConsent(prefs, { adsDenied: optOut || hasSaleShareOptOut() })
    return
  }

  // WITHOUT prefs this path may only ever TIGHTEN, never grant.
  //
  // With no preferences passed there is no record of what the visitor chose
  // in the banner, so granting here would loosen advertising consent on no
  // evidence at all — including for an EEA/UK/CH visitor who never accepted
  // anything. An earlier revision did exactly that: clearing the flag pushed
  // ad_storage and ad_user_data to 'granted' unconditionally, overriding the
  // banner's marketing toggle. Today's only caller passes optOut=true, but
  // this is an exported API and the next caller is the problem.
  //
  // Clearing the opt-out therefore removes the stored flag and stops. The
  // visitor's real state is re-derived from the banner on the next
  // updateGoogleConsent, and from the bootstrap on the next page load, both
  // of which have the preferences this path lacks.
  if (!optOut) return
  if (typeof window.gtag !== 'function') return

  // Keyed on the `optOut` ARGUMENT, never on a re-read of stored state.
  //
  // An earlier revision gated this on `hasSaleShareOptOut()`. That helper
  // reads localStorage, and in a private window the read THROWS and its catch
  // reports false — so the deny was skipped and clicking "Do Not Sell or
  // Share" did nothing at all, in exactly the browsers whose users are most
  // likely to click it. The storage write above is allowed to fail silently;
  // the live denial is not, because it is the part that actually stops the
  // tags for this session.
  window.gtag('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    personalization_storage: 'denied',
  })
}
