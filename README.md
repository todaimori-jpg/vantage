# Vantage — Search Command

A local-first command center for a directed job search and a comprehensive apartment search. Built to install as a standalone PWA on an iPad, phone, or desktop, and to deploy for free on GitHub Pages.

## What's inside

- **Command deck** — pipeline stats, due follow-ups, budget readout, funnel, best-match shortlist, and one-tap search presets.
- **Jobs pipeline** — five-stage board (target → applied → interview → offer → closed), drag-and-drop on pointer devices, editors, priorities, tags, and per-role notes.
- **Homes board** — apartment cards with rent, beds/baths, square footage, $/sqft, commute, laundry, natural light, lease flexibility, and side-by-side comparison.
- **Search console** — pre-filled deep links into 25 housing sources (grouped by marketplaces, housemates/co-living, and city-specific/no-fee), 8 job boards, copy-ready search briefs, and a saved-search library.
- **Optional live feeds** — Rentcast rentals and Adzuna jobs, using keys you paste in Settings. Keys stay in your browser.
- **Local-first data** — everything persists in `localStorage`; export/import a JSON file to back up or move between devices.
- **PWA** — installable, offline shell, dark theme, touch-friendly layout.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build
```

## Publish with GitHub Pages

The repo includes `.github/workflows/deploy.yml`, which runs the typecheck/build and publishes `dist`.

1. Create a GitHub repository and push this project to `main`.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run **Actions → Deploy to GitHub Pages → Run workflow**).
4. Open `https://<your-user>.github.io/<your-repo>/`.

Vite uses `base: './'`, so the build works at the repository subpath without extra configuration.

## Install on a device

- **iPhone / iPad (Safari):** open the Pages URL → Share → **Add to Home Screen**.
- **Android (Chrome):** open the URL → menu → **Install app** (or the in-app install prompt).
- **Desktop (Chrome/Edge):** install icon in the address bar.

## Data, keys, and privacy

- State lives under the `vantage.state.v1` key in this browser. Nothing is sent to a server.
- API keys are stored locally and are only used for direct calls to Adzuna or Rentcast.
- **Back up before clearing site data.** Settings → export JSON writes a snapshot; import restores it after confirmation.
- On a public deployment, only use your own personal API keys. Never paste a shared or company-wide key into a site you do not control.

## Housing sources

Every source opens in a new tab with your market pre-filled where the site supports it.

**Listing marketplaces:** Zillow, Apartments.com, HotPads, Trulia, Realtor.com, Zumper, RentHop, Apartment List, Rent.com, RentCafe, Redfin Rentals, Compass.

**Rooms, housemates & co-living:** SpareRoom, Roommates.com, Diggz, Craigslist rooms, Facebook Marketplace, Listings Project, Outpost Club.

**City-specific & no-fee:** StreetEasy, Craigslist apartments, Nooklyn, LeaseBreak, CityRealty, NYC Housing Connect. These NYC-focused sources are hidden automatically when the market in Settings is outside New York.

## Job boards

LinkedIn Jobs, Indeed, Google Jobs, Glassdoor, Wellfound, Built In, Adzuna, and SimplyHired, seeded with your target role, location, and remote preference.

## Notes and limitations

- Deep links prefill what each site allows. Some sites accept only city-level filters, so confirm rent and bed filters on their results page.
- Drag-and-drop requires a mouse or trackpad. On touch-only devices, change a role's stage from the **Stage** field in the job editor.
- The offline service worker caches the app shell. Live API results still require a network connection.
- Rentcast and Adzuna enforce their own free-tier limits.

## Stack

Vite 5 · React 18 · TypeScript · @dnd-kit · lucide-react · hand-written service worker and design system in `src/styles.css`. No backend, no accounts, no tracking.
