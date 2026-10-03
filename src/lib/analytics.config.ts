/**
 * Analytics configuration for this site.
 *
 * Google Tag Manager container ID.
 *
 * A fork MUST replace this with its own container before going live, or the
 * charity's visitor analytics are reported into FFC's property.
 * `npm run check:rebrand` reads THIS file and flags the template's id.
 *
 * An EMPTY string is a supported state and means "no container provisioned
 * yet" — every new FFC site starts there, waiting on workflows 505/503. The
 * GTM components then render nothing, rather than emitting a tag that requests
 * `gtm.js?id=` and fails in the browser. Whitespace counts as empty.
 *
 * This lives in a plain module rather than inside the GTM component because
 * the component is a `'use client'` module. A server component importing a
 * non-component export from a client module receives a client-reference proxy,
 * not the value — so `GTM_ID.trim()` threw `is not a function` during static
 * export while every unit test passed, because Jest does not model the
 * server/client boundary. Anything that needs this value at render time on the
 * server must import it from here.
 *
 * The explicit `: string` matters: without it TypeScript narrows the constant
 * to its literal value and rejects the empty-string comparisons the guards use.
 */
export const GTM_ID: string = 'GTM-TQ5H8HPR'

/**
 * TRUE when this site is directed to children — a youth sports club, a
 * preschool, a children's programme. Denies every advertising signal for every
 * visitor, everywhere, regardless of region or consent. COPPA and Google's own
 * policies do not permit ad personalisation on child-directed properties, and
 * a child's "accept" is not a valid legal basis. Analytics is unaffected. When
 * in doubt set it TRUE: the cost is remarketing a child-directed site cannot
 * lawfully use anyway.
 *
 * Moved here from `consent-mode.ts`, where it was a hardcoded `false` with a
 * comment explaining that this template had no analytics config file. It has
 * one — this file — so the comment was false and the documented knob was
 * not actually a knob: a charity following its own instructions would have
 * edited a constant inside the consent library. Reported by Copilot as a
 * coverage gap, which is how the bigger problem surfaced.
 *
 * The explicit `: boolean` matters, as with GTM_ID above: without it
 * TypeScript narrows to the literal `false` and the enabled branch becomes
 * unreachable dead code that no test can exercise.
 */
export const CHILD_DIRECTED: boolean = false

/**
 * TRUE only when this site deliberately runs PERSONALISED advertising —
 * remarketing, audience targeting, Display. Google Ad Grants accounts CANNOT
 * do any of that (Grants are search-only), so a Grant-funded site should leave
 * this FALSE: it buys nothing, and `ad_personalization` is the signal that most
 * squarely enables cross-context behavioural advertising under California,
 * Colorado and Connecticut law. Ad Grants conversion tracking does NOT need it
 * — that runs on `ad_storage` and `ad_user_data`, which stay granted outside
 * the EEA/UK/CH.
 *
 * A child-directed site overrides this to denied regardless of what is set
 * here; see `consent-mode.ts`.
 */
export const AD_PERSONALIZATION: boolean = false
