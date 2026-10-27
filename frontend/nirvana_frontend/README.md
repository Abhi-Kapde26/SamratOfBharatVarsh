# 👑 Samrat of Bharatavarsha (सम्राट ऑफ़ भारतवर्ष)

> An immersive, interactive historical auction and empire-building strategy game platform set in the legendary lands of classical and ancient India.

---

## 📜 Overview

**Samrat of Bharatavarsha** is a full-featured web-based simulation and auction platform where rival factions bid on historic kingdoms (*Mahajanapadas* and ancient domains). Competing teams strategically manage their treasury to acquire territories with varying strategic assets—spanning military might, economic prosperity, geographical territory, cultural prestige, political acumen, and population.

Designed for live events, university fests, and competitive strategy games, the platform features a grand projector display for spectators, a dedicated host auctioneer control panel, an automated scoring engine, and a crowned champion leaderboard.

---

## 🌟 Key Features

- **🏛️ Grand Auction Arena (`/`)**:
  - Live projection screen presenting each kingdom with ancient parchment aesthetics.
  - Showcases historical rulers, modern geographic locations, total square area, strategic hints, and round counters.
  - Integrated 30-second discussion timer with dynamic visual color alerts (green to urgent red) and reset controls.

- **🎙️ Host Control Panel (`/host`)**:
  - Real-time auctioneer dashboard to log bids and assign won territories to participating teams.
  - Live treasury tracking and dynamic scoreboard showing ranked bids.
  - Automatic progression through auction rounds with seamless navigation to the results upon completion.

- **⚔️ Six Strategic Evaluation Pillars & Scoring Engine (`/results`)**:
  - Every kingdom carries distinct attributes:
    $$\text{Kingdom Value} = 0.30(\text{Army}) + 0.25(\text{Wealth}) + 0.15(\text{Territory}) + 0.10(\text{Culture}) + 0.10(\text{Politics}) + 0.10(\text{Population})$$
  - Aggregates team scores based on their acquired territory portfolios.
  - Automated crowning of the **Samrat (Supreme Emperor)** with a podium leaderboard.

- **🛡️ Team & House Roster (`/team`)**:
  - Showcases competing houses (e.g., *Mauryas, Marathas, Kalinga, Yadavas, Gandhara, Gupta*) with team member listings.
  - Elegant animations and classical typography.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/) with SWC
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [DaisyUI 5](https://daisyui.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/), [Heroicons](https://heroicons.com/), and [FontAwesome](https://fontawesome.com/)
- **Form & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)

---

## 📂 Project Structure

```text
Samrat-of-Bharatavarsha/
├── frontend/
│   └── nirvana_frontend/
│       ├── public/               # Static assets & favicon
│       ├── src/
│       │   ├── api/              # Axios instance & API configuration
│       │   ├── assets/           # Parchment textures, backgrounds, & artwork
│       │   ├── components/       # Reusable UI components
│       │   │   ├── BidControls.tsx    # Auction bidding controls
│       │   │   ├── BidTimer.tsx       # Countdown timer with state indicators
│       │   │   ├── KingdomCard.tsx    # Ancient parchment kingdom display card
│       │   │   ├── RoundTracker.tsx   # Current vs total rounds
│       │   │   └── Scoreboard.tsx     # Real-time leaderboard component
│       │   ├── context/          # React contexts (e.g. AuthContext)
│       │   ├── data/
│       │   │   └── kingdoms.json      # Dataset of Mahajanapadas, stats, & rulers
│       │   ├── pages/            # Core application route views
│       │   │   ├── GameDisplay.tsx    # Main stage / projector screen (/)
│       │   │   ├── HostPanel.tsx      # Host bidding management (/host)
│       │   │   ├── Results.tsx        # Leaderboard & champion announcement (/results)
│       │   │   └── Team.tsx           # Competing teams & members (/team)
│       │   ├── utils/
│       │   │   └── scoring.ts         # Kingdom valuation formula & score helpers
│       │   ├── App.tsx           # App root & route configurations
│       │   ├── main.tsx          # Application entrypoint
│       │   └── index.css         # Global styles & theme definitions
│       ├── package.json          # Dependencies & npm scripts
│       ├── tsconfig.json         # TypeScript configuration
│       └── vite.config.ts        # Vite configuration
└── README.md
```

---

## 🚦 Navigation & Routes

| Route | View | Description |
|---|---|---|
| `/` | **Game Arena** | Projector view displaying current kingdom up for auction with discussion countdown. |
| `/host` | **Host Panel** | Auctioneer console to log bids, assign kingdoms, and update live scores. |
| `/results` | **Final Results** | Displays calculated total points and crowns the victorious team. |
| `/team` | **Team Rosters** | Displays competing teams, houses, and member profiles. |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version `18.0.0` or higher recommended)
- `npm`, `pnpm`, or `yarn`

### Installation

1. Clone or navigate into the repository:
   ```bash
   cd frontend/nirvana_frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔧 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts the local Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Runs type checks via `tsc` and compiles optimized production assets to `dist/`. |
| `npm run preview` | Locally serves the production build from `dist/` for verification. |
| `npm run lint` | Runs ESLint to check for code quality and style compliance. |

---

## ⚙️ Customization

### Modifying Kingdoms
To add, edit, or adjust kingdom stats (Army, Wealth, Territory, Culture, Politics, Population), edit:
[src/data/kingdoms.json](src/data/kingdoms.json)

### Changing Valuation Weights
To tweak the strategic score calculation coefficients, update the formula in:
[src/utils/scoring.ts](src/utils/scoring.ts)

### Updating Team Names & Rosters
- Manage the bidding teams in [src/pages/HostPanel.tsx](src/pages/HostPanel.tsx)
- Update team houses and participants in [src/pages/Team.tsx](src/pages/Team.tsx)

---

## 🛡️ License

This project is created for events and game simulations. All rights reserved.
