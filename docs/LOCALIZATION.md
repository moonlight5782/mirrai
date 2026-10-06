# Interface languages

MIRRAI supports Russian (`ru`, default), Romanian (`ro`) and English (`en`).
The selector is in normal document flow, not overlaid on the 3D canvas.

## Request flow

1. `middleware.ts` resolves `?lang=` before the saved `mirrai_locale` cookie.
   It overwrites the internal locale header and persists explicit selections.
2. `lib/i18n-server.ts` creates a request-scoped translator. No server-global
   language state is used, so concurrent stores/visitors cannot share a locale.
3. `app/language-provider.tsx` starts with the SSR locale. Changing the selector
   reloads the current URL, preserving product, variant, shop and return URL.
4. React components use `useI18n().t(sourceText, values)`; server components use
   `await getI18n()`. Translation values are rendered as text, never HTML.
5. SDK **2.4.0** resolves `lang`, then the host document's `lang`, then Russian.
   It passes the locale in iframe/launcher URLs. It does not require third-party
   cookies. For an explicit choice, use `data-lang="ro"` on the script or
   `MirraiWidget.mount({ lang: "ro", ... })`.

## Adding or changing copy

Add `Russian source|Romanian|English` to the relevant dictionary:
`lib/translations.mjs`, `translations-account.mjs`, or `translations-merchant.mjs`.
Use complete sentences with `{name}` placeholders for dynamic values. Keep API
status codes, filter values, SKUs and URLs untranslated; translate their labels
at render time. Never modify a published immutable SDK; release a new version.

Merchant-entered names, materials, colours, notes and server-generated diagnostic
details retain their original language. Catalog content needs its own editorial
translations, not automatic substitutions that could change a specification.
Experimental room composition is outside the released multilingual demo flow.

## Verification

`npm run verify` covers lint, types, all model dimensions, the production build,
translation placeholders, SSR query/cookie precedence, and SDK language transfer.
Browser QA must also check selection persistence, product/photo navigation,
translated widget controls, narrow layouts and loaded model status.
Native AR camera placement still requires a physical-device check.
