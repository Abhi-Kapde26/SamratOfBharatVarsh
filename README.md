# 👑 Samrat of Bharatavarsha (सम्राट ऑफ़ भारतवर्ष)

> An immersive, interactive historical auction and empire-building strategy game platform set in the legendary lands of classical and ancient India. Designed for live college and university club events (Nirvana Strategy Club).

---

## 📜 Overview

**Samrat of Bharatavarsha** is a full-featured web-based simulation and auction platform where rival factions bid on historic kingdoms (*Mahajanapadas* and ancient domains). Competing teams strategically manage their treasury to acquire territories with varying strategic assets—spanning military might, economic prosperity, geographical territory, cultural prestige, political acumen, and population.

Designed for live events, college/university fests, and competitive strategy games, the platform features:
1. **Sovereign Opening Page (`/`)**: Ancient Bharatavarsha map gateway with Nirvana Club emblem.
2. **Shared Team Treasury Dashboard (`/dashboard`)**: Live public ledger tracking all dynasties, expenditures, and remaining balances.
3. **Projector-Friendly Auction Arena (`/auction`)**: Dedicated 16:9 projector screen preserving classical royal parchment aesthetic, discussion countdown, and round progression.
4. **Private Admin Control Centre (`/admin`)**: Authenticated host dashboard to control auctions, manage teams/rosters, catalog kingdoms, log bids, and audit/correct transactions.
5. **Crowned Results & Coronation (`/results`)**: Automated scoring engine crowning the *Samrat of Bharatavarsha*.
6. **Competing Houses & Rosters (`/team`)**: Royal parchment rosters of participating dynasties and members.

---

## 🌟 Architecture & Features

### 1. Application Navigation & Routes
| Route | View | Description | Access |
|---|---|---|---|
| `/` | **Opening Page** | Full-screen ancient Bharatavarsha parchment map, Nirvana logo, and gateway to dashboard. | Public |
| `/dashboard` | **Treasury Dashboard** | Real-time shared treasury ledger showing all dynasties, member details, spent amounts, and remaining balances. | Public (Read-Only) |
| `/auction` | **Auction Arena** | Projector-ready 16:9 auction screen displaying the active kingdom card, timer, and host progression controls. | Public / Host |
| `/admin` | **Admin Control Desk** | Password-protected host control centre for live bidding, kingdom library management, team rosters, and transaction auditing. | Authenticated Admin |
| `/results` | **Final Results** | Automated coronation leaderboard crowning the *Samrat* using the 6-pillar evaluation model. | Public |
| `/team` | **House Rosters** | Dynamic view of competing houses, members, and academic details on ancient parchment cards. | Public |

### 2. Treasury & Financial Rules (Server-Enforced)
- **Strict Ledger Calculation**: Remaining balance is computed on the server directly as `Initial Treasury - Confirmed Purchases`.
- **Insufficient Funds Protection**: Teams cannot bid or purchase a domain for more than their remaining available balance.
- **Single-Owner Domain Rule**: A kingdom cannot be sold to multiple teams.
- **Auditable Transactions & Corrections**: Every sale is logged with timestamp, buyer, price, and auctioneer. Erroneous bids can be safely reverted or reassigned via the Admin correction desk with automated balance reconciliation.

### 3. Real-Time Multi-Device Synchronization
- Built-in **Server-Sent Events (SSE)** stream at `/api/events`.
- Instant updates across host laptops, audience phones, and auditorium projectors without page refreshes.

### 4. Six Strategic Evaluation Pillars & Scoring Formula
$$\text{Strategic Points} = 0.30(\text{Army}) + 0.25(\text{Wealth}) + 0.15(\text{Territory}) + 0.10(\text{Culture}) + 0.10(\text{Politics}) + 0.10(\text{Population})$$

- 41 historical kingdoms seeded directly from the official project dataset.
- Supports dynamically adding new kingdoms or archiving existing domains via the Admin Kingdom Library.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), DaisyUI 5, Framer Motion
- **Typography**: Google Fonts *Cinzel*, *Marcellus*, and *Inter*
- **Backend**: Node.js, [Express](https://expressjs.com/), SSE (Server-Sent Events)
- **Database**: Embedded SQLite (`auction.db`) via Node.js native `node:sqlite` DatabaseSync with atomic transactions
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) version **18.0.0** or higher (Node 22+ recommended for built-in `node:sqlite`)
- `npm`

### Quick Start (Both Backend & Frontend)

1. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Start the backend server**:
   ```bash
   npm start
   # Server runs on http://localhost:5000 (API & SSE live)
   ```

3. **Install frontend dependencies & start dev server**:
   ```bash
   cd ../frontend/nirvana_frontend
   npm install
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

4. Or run from the root directory using the root scripts:
   ```bash
   # In terminal 1:
   npm run start:backend

   # In terminal 2:
   npm run start:frontend
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Administrative Access

- **Admin URL**: Navigate to `/admin` or click **Admin Control** in the top navigation.
- **Default Master Passcode**: `samrat2026`
- Configurable in `backend/.env`:
  ```env
  PORT=5000
  ADMIN_PASSWORD=samrat2026
  ADMIN_TOKEN=samrat_bharat_admin_secret_token_2026
  ```

---

## 📂 Project Structure

```text
Samrat-of-Bharatavarsha/
├── backend/
│   ├── auction.db            # Persistent SQLite database (teams, kingdoms, transactions, auction state)
│   ├── db.js                 # Database schema initialization & seeding (41 kingdoms, 6 houses)
│   ├── server.js             # Express REST API & SSE live broadcast stream
│   ├── test_flows.js         # Automated end-to-end verification script
│   ├── .env                  # Environment configuration
│   └── package.json          # Backend dependencies
├── frontend/
│   └── nirvana_frontend/
│       ├── public/           # Static assets
│       ├── src/
│       │   ├── api/
│       │   │   └── auctionApi.ts        # Typed API client with Bearer auth interceptor
│       │   ├── assets/                  # Ancient parchment textures & Nirvana Club logo
│       │   ├── components/
│       │   │   ├── Navbar.tsx           # Sovereign top navigation
│       │   │   ├── KingdomCard.tsx      # Ancient parchment domain display card
│       │   │   ├── BidTimer.tsx         # Real-time discussion countdown timer
│       │   │   └── ...
│       │   ├── hooks/
│       │   │   └── useLiveAuctionEvents.ts # Server-Sent Events client hook
│       │   ├── pages/
│       │   │   ├── LandingPage.tsx      # Sovereign Opening Page (/)
│       │   │   ├── Dashboard.tsx        # Shared Treasury Dashboard (/dashboard)
│       │   │   ├── AuctionArena.tsx     # Projector-Ready Auction Arena (/auction)
│       │   │   ├── AdminControl.tsx     # Private Admin Control Centre (/admin)
│       │   │   ├── Results.tsx          # Coronation Leaderboard (/results)
│       │   │   └── Team.tsx             # Royal House Rosters (/team)
│       │   ├── types/
│       │   │   └── auction.ts           # TypeScript interfaces (Kingdom, Team, Transaction)
│       │   ├── utils/
│       │   │   ├── formatters.ts        # Indian Rupee & score formatters
│       │   │   └── scoring.ts           # 6-criteria valuation formula
│       │   ├── App.tsx                  # React Router v7 routes
│       │   ├── index.css                # Royal styling & font definitions
│       │   └── main.tsx                 # Application entrypoint
│       ├── package.json
│       └── vite.config.ts
├── package.json              # Root coordination scripts
└── README.md
```

---

## 🛡️ License

Created for live collegiate fests and strategy simulations. All rights reserved by Nirvana Club.
