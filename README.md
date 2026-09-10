# UG Souq

Ugandan multi-seller marketplace. The Vite storefront and administrator interface share one Node/Hono API and MySQL data model while remaining separate interfaces.

## Production variables

Keep all secrets in Railway Variables; never commit them or expose them through Vite client variables.

- `DATABASE_URL` — MySQL connection string.
- `ADMIN_KEY` — administrator access secret.
- `APP_URL` — canonical public HTTPS origin, for example `https://www.ugsouq.com`.
- `SELLER_DOCUMENT_ENCRYPTION_KEY` — base64-encoded 32-byte key dedicated to seller identity encryption. Generate once with `openssl rand -base64 32`; rotating it requires a controlled data migration.
- `PESAPAL_ENV` — `sandbox` until live merchant approval, then `live`.
- `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET` — server-only Pesapal API 3.0 merchant credentials.
- `PESAPAL_IPN_ID` — identifier returned after registering `https://www.ugsouq.com/api/pesapal/ipn` as a Pesapal IPN URL.

Seller identity uploads deliberately fail closed if the dedicated encryption key is absent. Pesapal remains hidden from checkout until every Pesapal variable is configured. A callback or IPN never marks an order paid by itself: the server calls Pesapal's transaction-status endpoint and matches provider reference, exact amount, and currency.

## Verification

```bash
npm test
npm run build
```

## Starter framework notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```


<!-- Build trigger: 2026-08-08T22:16:25.805506 -->

<!-- Deploy trigger: Aug 11 2026 -->
