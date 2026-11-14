# PlayUnpause (Unpause) — Second-Screen Gaming Companion & Utility Suite

**Live Platform:** [https://playunpause.com](https://playunpause.com)

PlayUnpause is a full-stack second-screen gaming companion web app built with React 19, Vite, Express 5, Cloudflare Workers, and Cloudflare D1. It gives console and PC gamers fast offline-capable utilities—storage cleanout planners, safe keypad decoders, squad heist split calculators, night-run planners, and QR cross-device sync—without clutter or spoilers.

---

## Key Engineering Highlights

- **Cross-Game Math & Simulation Engine (`src/utils/gameMath.js`)**
  - Canonical multi-title calculators including Minecraft Overworld/Nether coordinate & 2-throw Stronghold triangulation, CS2 MR12 economy loss bonus step-downs, Valorant economy matrices, EA FC SBC break-even solver, Roblox DevEx eligibility/cut math, and GTA Online heist crew split normalization (`computeHeistSplit`, mandatory 15% crew floor, `NaN`/`Infinity` rejection).
- **Zero-Dependency ISO QR Matrix & Canvas Share Card Engine (`src/utils/qrCode.js`, `src/utils/shareCardEngine.js`, `src/utils/canvasCards.js`)**
  - Deterministic QR matrix generator with finder patterns and downloadable receipt/storage cards rendered directly on Canvas.
- **Dual-Runtime Hardened Backend (`worker/index.js` + `server/index.js`)**
  - Runs identically on **Cloudflare Workers + D1 SQL** (`migrations/0001_init.sql`, `wrangler.jsonc`) and **Node.js / Express 5** (`render.yaml`).
  - Verified Whop webhook signature & replay protection (`server/webhookAuth.js`), SSRF guards, security headers (CSP/CORP), LRU rate limiting, DSAR delete endpoint, and state payload sanitization (`server/securityHelpers.js`).

---

## Tech Stack

- **Frontend:** React 19, Vite 6, Lucide Icons, Custom CSS
- **Backend / Edge:** Cloudflare Workers, Cloudflare D1 (SQLite), Express 5 (Node >= 22.5)
- **Payments / Entitlements:** Whop Checkout & Webhook Verification
- **Testing:** Built-in Node.js test runner (`36` passing unit & integration tests)

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run all unit, security, Express mirror, and Worker tests
npm test

# Start Vite frontend & Express API locally
npm run dev:client
npm run dev:server

# Build production bundle
npm run build
```

*(Production secrets and `.env` configuration files are excluded from version control; see `.env.example`.)*
