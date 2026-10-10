import { renderToString } from 'react-dom/server'

import * as gtm from '../../src/components/google-tag-manager'
import { GTM_ID } from '../../src/lib/analytics.config'

/**
 * INVERTED DELIBERATELY. This suite used to render `GoogleTagManagerNoScript`
 * and assert the iframe was present, hidden and titled.
 *
 * The <noscript> GTM iframe is the one tracking path consent cannot reach:
 * with JavaScript disabled the Consent Mode bootstrap never runs, the cookie
 * banner never renders, and the footer's "Do Not Sell or Share" control does
 * not exist — but the iframe would still request the GTM container, carrying
 * no consent signal, with no way for a GPC-sending visitor to stop it. That
 * made the privacy policy's claim, that the consent check runs before any
 * Google tag loads, false for every JS-disabled visitor.
 *
 * It is asserted by ABSENCE because re-adding it is a one-line edit that a
 * presence-only suite would wave through, and the policy claim would silently
 * become false again.
 *
 * MERGED WITH `main`, which still had the presence suite. Its NoScript cases
 * are gone with the component; its `GoogleTagManager` cases are kept below,
 * and one of them is why the absence check here no longer goes through
 * `renderToString`.
 */

// A test container id. It is deliberately NOT a real GTM container, and
// especially not the template's own: hardcoding that is how a fork's analytics
// end up reported into Free For Charity's property, which is the leak
// `npm run check:rebrand` exists to catch.
const TEST_GTM_ID = 'GTM-TEST000'

/**
 * Pull the inline script body out of whatever the loader returned.
 *
 * The emitted string is what matters for escaping, and reading it through
 * `JSON.stringify` of the whole element would re-escape every backslash —
 * so an assertion written against that form is really an assertion about
 * JSON's own escaping, one indirection away from the thing under test.
 * Walking to `dangerouslySetInnerHTML.__html` yields the bytes the browser
 * would actually parse.
 */
function inlineScriptBody(node: unknown): string {
  let found: string | null = null
  const visit = (n: unknown): void => {
    if (found !== null || n === null || typeof n !== 'object') return
    const el = n as { props?: Record<string, unknown> }
    const html = (el.props?.dangerouslySetInnerHTML as { __html?: string } | undefined)?.__html
    if (typeof html === 'string') {
      found = html
      return
    }
    const children = el.props?.children
    if (Array.isArray(children)) children.forEach(visit)
    else if (children) visit(children)
  }
  visit(node)
  if (found === null) throw new Error('no inline script body found on the rendered loader')
  return found
}

describe('Google Tag Manager noscript fallback', () => {
  it('no longer exports a noscript component', () => {
    expect('GoogleTagManagerNoScript' in gtm).toBe(false)
  })

  it('exports only the script loader', () => {
    // Guards the assertion above from passing for the wrong reason: a module
    // that failed to load would also lack the export.
    expect(typeof gtm.default).toBe('function')
  })

  it('emits no noscript element and no ns.html request', () => {
    // NOT through renderToString. `GoogleTagManager` wraps next/script, which
    // renders NOTHING outside a Next runtime — measured on `main`, where the
    // same discovery is recorded: it returns '' even for a fully configured
    // id. An absence assertion against that string is vacuously true and
    // cannot fail, which is exactly the failure mode this suite exists to
    // avoid. The element is inspected directly instead.
    const markup = JSON.stringify(gtm.default({ gtmId: TEST_GTM_ID }))

    expect(markup).not.toContain('noscript')
    expect(markup).not.toContain('ns.html')
    // Not vacuous: the snippet it DOES emit is in there.
    expect(markup).toContain('googletagmanager.com/gtm.js')
    expect(markup).toContain(TEST_GTM_ID)
  })
})

/**
 * Kept from `main`. Every new FFC site starts with no container, before
 * workflow 505/503 provisions one, so the configured branch would otherwise
 * ship unverified on every fork — which is what the `gtmId` prop exists for.
 */
describe('GoogleTagManager with no container configured', () => {
  it('renders nothing for an empty id', () => {
    expect(gtm.default({ gtmId: '' })).toBeNull()
  })

  // A whitespace-only id is unconfigured too. It passes a bare truthiness
  // check, so without an explicit trim the component emits
  // `gtm.js?id=%20%20`, which fails in the browser exactly like an empty id
  // would — but silently, since a tag IS rendered.
  it('renders nothing for a whitespace-only id', () => {
    expect(gtm.default({ gtmId: '   ' })).toBeNull()
  })

  it('still renders for a real id (so the checks above are not vacuous)', () => {
    expect(gtm.default({ gtmId: TEST_GTM_ID })).not.toBeNull()
  })

  it('trims a padded id rather than emitting it verbatim', () => {
    const markup = JSON.stringify(gtm.default({ gtmId: `  ${TEST_GTM_ID}  ` }))
    expect(markup).toContain(TEST_GTM_ID)
    expect(markup).not.toContain('%20')
    expect(markup).not.toContain(`  ${TEST_GTM_ID}`)
  })
})

/**
 * The escaping is implemented in `src/lib/script-string.ts` and tested there
 * against `</script>`. These cases cover THIS CALLER, because the helper
 * being correct is not the same property as the loader using it: reverting
 * the interpolation to a bare `${id}` leaves every script-string test green
 * while a malformed configured container id can terminate the inline script.
 *
 * The id is operator-supplied (analytics.config.ts, or NEXT_PUBLIC_GTM_ID at
 * build time), so this is a mis-provisioning and supply-chain concern rather
 * than a visitor-reachable one — which is why it is worth a cheap test and
 * not worth a runtime validator.
 */
describe('GoogleTagManager inline snippet escaping', () => {
  const HOSTILE_ID = 'GTM-A</script><script>alert(1)</script>'

  it('never emits a raw </script> for a hostile container id', () => {
    const body = inlineScriptBody(gtm.default({ gtmId: HOSTILE_ID }))

    // The literal sequence that would close the inline script early. Case
    // folded, because `</SCRIPT>` closes a script element just as well.
    expect(body.toLowerCase()).not.toContain('</script')

    // Positive control: the id really did reach the snippet, escaped. Without
    // this the assertion above would also hold for an empty body.
    expect(body).toContain('\\u003c/script')
    expect(body).toContain('GTM-A')
  })

  it('keeps a quote-bearing id inside one JS string literal', () => {
    // A bare `'${id}'` would let this break out of the literal and append
    // arbitrary code to the call.
    const body = inlineScriptBody(gtm.default({ gtmId: 'GTM-B"+alert(1)+"' }))
    expect(body).toContain('\\"+alert(1)+\\"')
    expect(body).not.toContain('"+alert(1)+"')
  })

  it('still emits an ordinary id unescaped (so the checks above are not vacuous)', () => {
    const body = inlineScriptBody(gtm.default({ gtmId: TEST_GTM_ID }))
    expect(body).toContain(`"${TEST_GTM_ID}"`)
    expect(body).not.toContain('\\u003c')
  })
})

describe('the shipped GTM configuration', () => {
  it('never carries a container id this site does not own', () => {
    // Either unset (awaiting provisioning) or a well-formed GTM container.
    expect(GTM_ID.trim() === '' || /^GTM-[A-Z0-9]+$/.test(GTM_ID.trim())).toBe(true)
  })

  it('renders by default exactly when a container is configured', () => {
    // `main` asserted this through the noscript component's HTML. With that
    // component gone the same property is checked on the loader itself, by
    // direct call for the reason given above.
    const rendered = gtm.default()
    if (GTM_ID.trim() === '') {
      expect(rendered).toBeNull()
    } else {
      expect(JSON.stringify(rendered)).toContain(GTM_ID.trim())
    }
  })

  it('renders nothing through renderToString either way, which is why nothing asserts on it', () => {
    // Recorded rather than assumed: this is the measurement that makes the
    // direct-call style above necessary, and it is cheap to keep honest.
    expect(renderToString(<gtm.default gtmId={TEST_GTM_ID} />)).toBe('')
  })
})
