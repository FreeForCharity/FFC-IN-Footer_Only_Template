/**
 * Side-effect module: gives the Meta Pixel a real-looking id.
 *
 * The cookie-consent component reads `NEXT_PUBLIC_META_PIXEL_ID` at MODULE
 * scope and `isConfigured()` refuses the shipped placeholder, so a suite that
 * needs the Pixel to actually load has to set this BEFORE the component module
 * is evaluated. Importing this file first does that: CommonJS requires run in
 * source order, so the assignment lands before the component's module body.
 *
 * Why not `jest.resetModules()` in `beforeAll`: that resets React as well, so
 * the component ends up with a different React instance from
 * @testing-library/react and every hook throws "Cannot read properties of
 * null (reading 'useState')".
 */
process.env.NEXT_PUBLIC_META_PIXEL_ID = '123456789012345'
export {}
