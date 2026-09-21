/**
 * Analytics configuration for this site.
 *
 * Google Tag Manager container ID.
 *
 * A fork MUST replace this with its own container before going live, or the
 * charity's visitor analytics are reported into Free For Charity's property.
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
