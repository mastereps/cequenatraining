# Webinar Frontend

React and TypeScript frontend for the Cequena Training and Consultancy website. The app combines public marketing pages, a book catalog, account access, webinar registration, email verification, GCash payment proof submission, and webinar payment review screens for administrators.

## Tech Stack

- React 19 and TypeScript
- Vite 7
- React Router 6
- Tailwind CSS 4 with custom styles in `src/index.css`
- Vitest, jsdom, and React Testing Library for frontend tests

## Setup

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Vite serves the frontend and proxies `/api` requests to `http://localhost:5001`. Run the API server separately before testing features that load data or submit forms.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot module replacement. |
| `npm run build` | Run TypeScript checks and create a production Vite build. |
| `npm run lint` | Run ESLint across the frontend workspace. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode during development. |
| `npm run preview` | Preview the production build locally. |
| `npm run server` | Run the repository-level Node server entry point at `../server/server.js`. |

## Environment Variables

The frontend currently reads one Vite environment variable:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_WEBINAR_ORDERING_ENABLED` | `false` | Enables webinar ordering behavior when set to a truthy value. The values `0`, `false`, `no`, and `off` disable it. |

Create a local `.env` file inside `webinar` when you need to override the default:

```dotenv
VITE_WEBINAR_ORDERING_ENABLED=false
```

The development API target is configured in `vite.config.ts`. Update that proxy only when the local API server uses a different port.

## Folder Structure

```text
src/
  assets/                 Images and bundled fonts
  components/             Shared UI such as navigation and cart controls
  config/                 Frontend feature flags
  entities/               Book and event data types
  features/
    auth/                 Auth API client and types
    webinars/             Webinar API client, types, formatting, session helpers, and UI
  landing-page/           Home page and section components
  pages/                  Route-level pages
    webinars/             Webinar registration, verification, payment, and admin pages
  store/                  Auth and cart React context providers
  test/                   Shared Vitest setup
  utils/                  Book availability, images, and price formatting
```

## Routing And Pages

Routes are defined in `src/App.tsx`.

| Route | Page or behavior |
| --- | --- |
| `/` | Marketing landing page |
| `/about` | About page |
| `/contact` | Contact form |
| `/privacy-policy` | Privacy policy |
| `/login` | Login and account registration |
| `/products` | Book catalog |
| `/products/:slug` | Book details |
| `/webinars` | Webinar listing and filters |
| `/webinars/:slug` | Webinar details |
| `/webinars/:slug/register` | Webinar registration form |
| `/webinars/:slug/submitted` | Registration submitted and email verification reminder |
| `/verify?token=...` | Email verification result |
| `/webinars/:slug/confirmed` | Verified registration status and GCash proof submission |
| `/admin/webinars/payments` | Admin webinar payment review index |
| `/admin/webinars/:slug/payments` | Admin payment proof review |
| `/cart`, `/checkout`, `/checkout/success`, `/checkout/cancel` | Commerce routes, currently redirected to `/products` because cart checkout is disabled |

## State And Browser Storage

- `src/store/AuthContext.tsx` loads the current session from `/api/auth/me` and exposes login, registration, and logout actions.
- `src/store/CartContext.tsx` manages cart items and stores them in `localStorage` under `cart_items`.
- `src/features/webinars/registrationSession.ts` stores per-webinar registration progress in `sessionStorage`.
- `src/main.tsx` and `src/components/NavBar.tsx` store the selected theme in `localStorage` under `theme`.

## API Integration Points

Vite proxies frontend requests beginning with `/api` to the local API server.

| Area | Frontend module | Main endpoints |
| --- | --- | --- |
| Authentication | `src/features/auth/api.ts` | `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` |
| Webinars | `src/features/webinars/api.ts` | `/api/webinars`, `/api/webinars/:slug`, registration, status, verification, payment proof, admin review, and Zoom link actions |
| Books | Product and landing page components | `/api/books`, `/api/books/:slug`, `/api/books/:slug/related` |
| Contact | `src/pages/ContactPage.tsx` | `/api/contact` |
| Checkout | `src/pages/CheckoutPage.tsx` | `/api/payments/gcash` |

## Styling

Tailwind CSS is loaded in `src/index.css` through `@import "tailwindcss"`. That file also defines custom theme colors, local fonts, dark-mode styles, and Swiper overrides. Components primarily use Tailwind utility classes.

Dark mode uses a `dark` class on the root HTML element. The saved theme defaults to dark mode when no prior selection exists.

## Testing

Vitest runs in jsdom using `vitest.config.ts`. Shared Testing Library matchers are loaded from `src/test/setup.ts`.

Tests are colocated with the frontend modules they cover:

```text
src/features/webinars/*.test.ts
src/features/webinars/components/*.test.tsx
src/pages/*.test.tsx
```

Use React Testing Library for behavior visible to users. Mock `fetch` at API boundaries so tests remain frontend-only and do not require the local API server.

## Common Development Workflow

1. Install dependencies with `npm install`.
2. Start the API server expected at `http://localhost:5001`.
3. Start the frontend with `npm run dev`.
4. Make scoped changes under the relevant page, component, or feature folder.
5. Run `npm test` for behavior checks.
6. Run `npm run lint` and `npm run build` before opening a pull request.
